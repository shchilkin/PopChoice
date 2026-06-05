/**
 * Core AI recommendation pipeline.
 *
 * Extracted from route.ts so the same logic can be called both from the
 * legacy POST /api/movie-recommendation route and the new BullMQ worker.
 */

import { getDbClient } from '@/clients/dbClient';
import { enqueueCatalogSeedTMDBMovies } from '@/features/catalogMaintenance/jobs';
import { getUserRecommendationFeedbackMoviePreferences } from '@/lib/db/recommendations';
import logger from '@/lib/logger';
import { setActiveTraceAttributes } from '@/lib/tracing';

import {
  applyFeedbackToLocalMovies,
  excludeMentionedLocalMovies,
  excludeMentionedTMDBMovies,
  excludeFeedbackTMDBMovies,
  type FeedbackCandidateSignals,
  getFeedbackCandidateSignals,
  getMentionedMovieTitleKeys,
} from './candidateFilters';
import { getCandidateSource, summarizeCandidateSources } from './candidateSources';
import { createEmbedding, refineQueryWithLLM } from './embedding';
import {
  findCandidateByRecommendedTitle,
  resolveGuardedRecommendation,
} from './finalRecommendation';
import { SIMILARITY_THRESHOLD, getTMDBFallbackDecision } from './helpers';
import {
  enhanceSimilarMoviesWithPosters,
  generateMovieDescriptions,
  getMovieInfo,
  getRecommendation,
  getSimilarMovies,
} from './recommendation';
import { resolveRecommendationSourceStrategy } from './sourceStrategyPolicy';
import {
  MAX_TOTAL_MOVIES,
  enrichTMDBMatchesWithDetails,
  fetchTMDBDiscoverMovies,
  parseTMDBReleaseYear,
  scoreAndConvertTMDBMovies,
  seedMoviesInBackground,
} from './tmdb';

import type {
  ApiResponse,
  EnhancedMovieMatch,
  PersonFormData,
  RecommendationExperienceMode,
  RecommendationSourceStrategy,
} from './types';
import type { RecommendationStage } from '@/lib/db/recommendations';
import type { Locale } from '@/lib/locale';

const MOVIE_SEED_ENQUEUE_TIMEOUT_MS = 1500;

type RecommendationPipelineOptions = {
  experienceMode?: RecommendationExperienceMode;
  onStageChange?: (stage: RecommendationStage) => Promise<void> | void;
  sourceStrategy?: RecommendationSourceStrategy;
  userId?: string;
};

type PipelineContext = {
  experienceMode: RecommendationExperienceMode;
  mentionedTitleKeys: Set<string>;
  sourceStrategy: RecommendationSourceStrategy;
  emitStage: (stage: RecommendationStage) => Promise<void>;
};

type PreparedRecommendationInputs = {
  dbMovieCount: number | null;
  feedbackSignals: FeedbackCandidateSignals;
  refinedQueryTags: string | null;
};

type CandidatePool = {
  localSimilarMovies: EnhancedMovieMatch[];
  similarMovies: EnhancedMovieMatch[];
  usedBroaderSearch: boolean;
};

type TMDBExpansionInput = {
  allPeopleData: PersonFormData[];
  emitStage: (stage: RecommendationStage) => Promise<void>;
  embedding: number[];
  feedbackSignals: FeedbackCandidateSignals;
  locale: Locale;
  mentionedTitleKeys: Set<string>;
  similarMovies: EnhancedMovieMatch[];
  sourceStrategy: RecommendationSourceStrategy;
};

type CandidatePoolBuildInput = Omit<TMDBExpansionInput, 'similarMovies'>;

type TMDBExpansionResult = {
  similarMovies: EnhancedMovieMatch[];
  usedBroaderSearch: boolean;
};

type EnrichedRecommendation = {
  guardedRecommendation: ReturnType<typeof resolveGuardedRecommendation>;
  moviesWithDescriptions: Awaited<ReturnType<typeof generateMovieDescriptions>>;
  posterURL?: string;
};

class EnqueueTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnqueueTimeoutError';
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const wrappedPromise: Promise<{ ok: true; value: T } | { ok: false; error: unknown }> =
    promise.then(
      (value) => ({ ok: true, value }),
      (error: unknown) => ({ ok: false, error }),
    );
  const timeoutPromise = new Promise<{ ok: false; error: EnqueueTimeoutError }>((resolve) => {
    timeoutId = setTimeout(
      () => resolve({ ok: false, error: new EnqueueTimeoutError(timeoutMessage) }),
      timeoutMs,
    );
  });

  try {
    const result = await Promise.race([wrappedPromise, timeoutPromise]);
    if (!result.ok) throw result.error;
    return result.value;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Runs the full AI recommendation pipeline:
 *   Step 0  – prompt-injection check (must be done before calling this)
 *   Step 0  – moderation (must be done before calling this)
 *   Step 0.5 – query enrichment via LLM + parallel DB count
 *   Step 1  – create embedding
 *   Step 2  – local vector search
 *   Step 3  – TMDB hybrid fallback (if needed)
 *   Step 4  – OpenAI movie recommendation
 *   Step 5  – localized poster for main pick
 *   Step 6  – enhance all movies with posters
 *   Step 7  – generate per-movie AI descriptions
 *
 * Returns the full ApiResponse payload.
 */
export async function runRecommendationPipeline(
  allPeopleData: PersonFormData[],
  locale: Locale,
  options: RecommendationPipelineOptions = {},
): Promise<ApiResponse> {
  const context = createPipelineContext(allPeopleData, options);
  const preparedInputs = await prepareRecommendationInputs(
    allPeopleData,
    options.userId,
    context.emitStage,
  );
  const embedding = await createPipelineEmbedding(
    allPeopleData,
    preparedInputs.refinedQueryTags,
    preparedInputs.dbMovieCount,
    context.emitStage,
  );
  const candidatePool = await buildCandidatePool({
    allPeopleData,
    embedding,
    feedbackSignals: preparedInputs.feedbackSignals,
    locale,
    mentionedTitleKeys: context.mentionedTitleKeys,
    sourceStrategy: context.sourceStrategy,
    emitStage: context.emitStage,
  });
  const similarMovies = ensureCandidatePool(candidatePool, {
    feedbackSignals: preparedInputs.feedbackSignals,
    mentionedTitleKeys: context.mentionedTitleKeys,
  });
  const enrichedRecommendation = await rankAndEnrichRecommendation({
    allPeopleData,
    emitStage: context.emitStage,
    feedbackSignals: preparedInputs.feedbackSignals,
    locale,
    similarMovies,
  });

  return buildPipelineResponse({
    candidatePool,
    dbMovieCount: preparedInputs.dbMovieCount,
    enrichedRecommendation,
    experienceMode: context.experienceMode,
    sourceStrategy: context.sourceStrategy,
  });
}

function createPipelineContext(
  allPeopleData: PersonFormData[],
  options: RecommendationPipelineOptions,
): PipelineContext {
  const sourceStrategy =
    options.sourceStrategy ??
    resolveRecommendationSourceStrategy({
      experienceMode: options.experienceMode,
      people: allPeopleData,
    }).id;
  const experienceMode = options.experienceMode ?? 'normal-match';
  const mentionedTitleKeys = getMentionedMovieTitleKeys(allPeopleData);

  setActiveTraceAttributes({
    'recommendation.experience_mode': experienceMode,
    'recommendation.source_strategy': sourceStrategy,
  });
  logger.info({ experienceMode, sourceStrategy }, 'Recommendation source strategy selected');

  return {
    experienceMode,
    mentionedTitleKeys,
    sourceStrategy,
    emitStage: createStageEmitter(options.onStageChange),
  };
}

function createStageEmitter(onStageChange: RecommendationPipelineOptions['onStageChange']) {
  return async (stage: RecommendationStage): Promise<void> => {
    setActiveTraceAttributes({ 'recommendation.stage': stage });
    try {
      await onStageChange?.(stage);
    } catch (err) {
      logger.warn({ err, stage }, 'Failed to update recommendation stage');
    }
  };
}

async function prepareRecommendationInputs(
  allPeopleData: PersonFormData[],
  userId: string | undefined,
  emitStage: PipelineContext['emitStage'],
): Promise<PreparedRecommendationInputs> {
  await emitStage('preparing');
  const [refinedQueryTags, dbMovieCount, feedbackPreferences] = await Promise.all([
    refineQueryWithLLM(allPeopleData),
    getDbMovieCount(),
    getFeedbackPreferences(userId),
  ]);

  return {
    dbMovieCount,
    feedbackSignals: getFeedbackCandidateSignals(feedbackPreferences),
    refinedQueryTags,
  };
}

async function getDbMovieCount(): Promise<number | null> {
  try {
    const db = getDbClient();
    if (!db.isConfigured()) return null;
    const countRes = await db.from('movies').select('id', { count: 'exact', head: true });
    return countRes.count ?? null;
  } catch {
    return null;
  }
}

async function getFeedbackPreferences(userId: string | undefined) {
  if (!userId) return [];

  try {
    return await getUserRecommendationFeedbackMoviePreferences(userId);
  } catch (err) {
    logger.warn({ err }, 'Failed to load user recommendation feedback preferences');
    return [];
  }
}

async function createPipelineEmbedding(
  allPeopleData: PersonFormData[],
  refinedQueryTags: string | null,
  dbMovieCount: number | null,
  emitStage: PipelineContext['emitStage'],
): Promise<number[]> {
  await emitStage('embedding');
  const embedding = await createEmbedding(allPeopleData, refinedQueryTags ?? undefined);
  logger.info({ dbMovieCount }, 'Embedding created, DB count fetched');
  return embedding;
}

async function buildCandidatePool(input: CandidatePoolBuildInput): Promise<CandidatePool> {
  const localCandidatePool = await getLocalCandidatePool(
    input.embedding,
    input.mentionedTitleKeys,
    input.feedbackSignals,
    input.emitStage,
  );
  const expandedPool = await maybeExpandWithTMDB({
    ...input,
    similarMovies: localCandidatePool.similarMovies,
  });

  return {
    localSimilarMovies: localCandidatePool.localSimilarMovies,
    similarMovies: expandedPool.similarMovies,
    usedBroaderSearch: expandedPool.usedBroaderSearch,
  };
}

async function getLocalCandidatePool(
  embedding: number[],
  mentionedTitleKeys: Set<string>,
  feedbackSignals: FeedbackCandidateSignals,
  emitStage: PipelineContext['emitStage'],
): Promise<Omit<CandidatePool, 'usedBroaderSearch'>> {
  await emitStage('local-search');
  const localSimilarMovies = await getSimilarMovies(embedding);
  const mentionedFilteredLocalMovies = excludeMentionedLocalMovies(
    localSimilarMovies,
    mentionedTitleKeys,
  );

  return {
    localSimilarMovies,
    similarMovies: applyFeedbackToLocalMovies(mentionedFilteredLocalMovies, feedbackSignals),
  };
}

async function maybeExpandWithTMDB(input: TMDBExpansionInput): Promise<TMDBExpansionResult> {
  const highQualityLocal = input.similarMovies.filter(
    (movie) => movie.similarity >= SIMILARITY_THRESHOLD,
  );
  const tmdbFallbackDecision = getTMDBFallbackDecision(input.sourceStrategy, input.similarMovies);
  const prefersTMDBCandidates = input.sourceStrategy === 'tmdb-first';

  await logTMDBFallbackDecision({
    decision: tmdbFallbackDecision,
    emitStage: input.emitStage,
    highQualityLocalCount: highQualityLocal.length,
    prefersTMDBCandidates,
    sourceStrategy: input.sourceStrategy,
  });

  if (!tmdbFallbackDecision.shouldAttempt) {
    return { similarMovies: input.similarMovies, usedBroaderSearch: false };
  }

  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) {
    logger.warn('TMDB_API_KEY not configured — skipping TMDB fallback');
    return { similarMovies: input.similarMovies, usedBroaderSearch: false };
  }

  const tmdbMovies = await fetchFilteredTMDBMovies(input, tmdbApiKey);
  if (tmdbMovies.length === 0) {
    return { similarMovies: input.similarMovies, usedBroaderSearch: false };
  }

  return mergeTMDBCandidates({
    embedding: input.embedding,
    feedbackSignals: input.feedbackSignals,
    highQualityLocal,
    locale: input.locale,
    prefersTMDBCandidates,
    similarMovies: input.similarMovies,
    sourceStrategy: input.sourceStrategy,
    tmdbApiKey,
    tmdbMovies,
  });
}

async function logTMDBFallbackDecision(input: {
  decision: ReturnType<typeof getTMDBFallbackDecision>;
  emitStage: PipelineContext['emitStage'];
  highQualityLocalCount: number;
  prefersTMDBCandidates: boolean;
  sourceStrategy: RecommendationSourceStrategy;
}): Promise<void> {
  const logPayload = {
    highQualityLocal: input.highQualityLocalCount,
    sourceStrategy: input.sourceStrategy,
    threshold: SIMILARITY_THRESHOLD,
    tmdbFallbackReason: input.decision.reason,
  };

  if (!input.decision.shouldAttempt) {
    logger.info(logPayload, 'TMDB fallback skipped by source strategy policy');
    return;
  }

  await input.emitStage('tmdb-search');
  logger.info(
    logPayload,
    input.prefersTMDBCandidates
      ? 'Trying TMDB-first candidate retrieval'
      : 'Local results below quality threshold — trying TMDB fallback',
  );
}

async function fetchFilteredTMDBMovies(input: TMDBExpansionInput, tmdbApiKey: string) {
  const discoveredMovies = await fetchTMDBDiscoverMovies(input.allPeopleData, tmdbApiKey);
  const mentionedFilteredMovies = excludeMentionedTMDBMovies(
    discoveredMovies,
    input.mentionedTitleKeys,
  );
  return excludeFeedbackTMDBMovies(mentionedFilteredMovies, input.feedbackSignals);
}

async function mergeTMDBCandidates(input: {
  embedding: number[];
  feedbackSignals: FeedbackCandidateSignals;
  highQualityLocal: EnhancedMovieMatch[];
  locale: Locale;
  prefersTMDBCandidates: boolean;
  similarMovies: EnhancedMovieMatch[];
  sourceStrategy: RecommendationSourceStrategy;
  tmdbApiKey: string;
  tmdbMovies: Awaited<ReturnType<typeof fetchTMDBDiscoverMovies>>;
}): Promise<TMDBExpansionResult> {
  const localResultsForMerge = input.highQualityLocal.slice(0, MAX_TOTAL_MOVIES);
  const localKeys = getLocalMovieKeys(input.similarMovies);
  const filteredTMDBMovies = getNewTMDBMovies(input.tmdbMovies, localKeys, localResultsForMerge);
  const newTMDBMatches = await scoreAndConvertTMDBMovies(filteredTMDBMovies, input.embedding);
  const enrichedTMDBMatches = input.prefersTMDBCandidates
    ? await enrichTMDBMatchesWithDetails(newTMDBMatches.matches, input.tmdbApiKey, input.locale)
    : newTMDBMatches.matches;
  const newTMDBMatchList = applyFeedbackToLocalMovies(enrichedTMDBMatches, input.feedbackSignals);
  const similarMovies = mergeCandidateLists(
    localResultsForMerge,
    newTMDBMatchList,
    input.prefersTMDBCandidates,
  );

  logTMDBMerge({
    localCount: localResultsForMerge.length,
    tmdbCount: newTMDBMatchList.length,
    finalCount: similarMovies.length,
    prefersTMDBCandidates: input.prefersTMDBCandidates,
    sourceStrategy: input.sourceStrategy,
  });

  await queueTMDBCatalogSeedJobs(input.tmdbMovies, localKeys, newTMDBMatches.embeddings);

  return {
    similarMovies,
    usedBroaderSearch: newTMDBMatchList.length > 0,
  };
}

function getLocalMovieKeys(movies: EnhancedMovieMatch[]): Set<string> {
  const localKeys = new Set<string>();
  for (const movie of movies) {
    localKeys.add(`${movie.name.toLowerCase()}|${movie.year}`);
  }
  return localKeys;
}

function getNewTMDBMovies(
  tmdbMovies: Awaited<ReturnType<typeof fetchTMDBDiscoverMovies>>,
  localKeys: Set<string>,
  localResultsForMerge: EnhancedMovieMatch[],
) {
  const slotsRemaining = Math.max(0, MAX_TOTAL_MOVIES - localResultsForMerge.length);
  return tmdbMovies.filter((movie) => isNewTMDBMovie(movie, localKeys)).slice(0, slotsRemaining);
}

function isNewTMDBMovie(
  movie: Awaited<ReturnType<typeof fetchTMDBDiscoverMovies>>[number],
  localKeys: Set<string>,
): boolean {
  const tmdbYear = parseTMDBReleaseYear(movie.release_date);
  return !localKeys.has(`${movie.title.toLowerCase()}|${tmdbYear}`);
}

function mergeCandidateLists(
  localResultsForMerge: EnhancedMovieMatch[],
  newTMDBMatchList: EnhancedMovieMatch[],
  prefersTMDBCandidates: boolean,
): EnhancedMovieMatch[] {
  if (!prefersTMDBCandidates) {
    return [...localResultsForMerge, ...newTMDBMatchList].slice(0, MAX_TOTAL_MOVIES);
  }

  return [...newTMDBMatchList, ...localResultsForMerge]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_TOTAL_MOVIES);
}

function logTMDBMerge(input: {
  finalCount: number;
  localCount: number;
  prefersTMDBCandidates: boolean;
  sourceStrategy: RecommendationSourceStrategy;
  tmdbCount: number;
}) {
  logger.info(
    {
      localCount: input.localCount,
      tmdbCount: input.tmdbCount,
      finalCount: input.finalCount,
      sourceStrategy: input.sourceStrategy,
    },
    input.prefersTMDBCandidates
      ? 'Merged score-ranked TMDB-first and local candidates'
      : 'Merged local and TMDB results',
  );
}

async function queueTMDBCatalogSeedJobs(
  tmdbMovies: Awaited<ReturnType<typeof fetchTMDBDiscoverMovies>>,
  localKeys: Set<string>,
  embeddings: Awaited<ReturnType<typeof scoreAndConvertTMDBMovies>>['embeddings'],
): Promise<void> {
  try {
    const queuedMovies = await withTimeout(
      enqueueCatalogSeedTMDBMovies({
        movies: tmdbMovies,
        source: 'recommendation_jit',
        localKeys: Array.from(localKeys),
        embeddings,
      }),
      MOVIE_SEED_ENQUEUE_TIMEOUT_MS,
      'Catalog seed enqueue timed out',
    );
    handleCatalogSeedQueueResult(queuedMovies, tmdbMovies, localKeys, embeddings);
  } catch (error) {
    handleCatalogSeedQueueError(error, tmdbMovies, localKeys, embeddings);
  }
}

function handleCatalogSeedQueueResult(
  queuedMovies: number,
  tmdbMovies: Awaited<ReturnType<typeof fetchTMDBDiscoverMovies>>,
  localKeys: Set<string>,
  embeddings: Awaited<ReturnType<typeof scoreAndConvertTMDBMovies>>['embeddings'],
): void {
  if (queuedMovies > 0) {
    logger.info({ queuedMovies }, 'Queued catalog maintenance seed jobs');
    return;
  }

  logger.warn(
    'Catalog maintenance queue unavailable — falling back to fire-and-forget TMDB seeding',
  );
  seedMoviesInBackground(tmdbMovies, localKeys, embeddings);
}

function handleCatalogSeedQueueError(
  error: unknown,
  tmdbMovies: Awaited<ReturnType<typeof fetchTMDBDiscoverMovies>>,
  localKeys: Set<string>,
  embeddings: Awaited<ReturnType<typeof scoreAndConvertTMDBMovies>>['embeddings'],
): void {
  if (error instanceof EnqueueTimeoutError) {
    logger.warn(
      { err: error, queuedMovies: tmdbMovies.length },
      'Timed out while enqueueing catalog seed jobs; skipping fallback since enqueue status is uncertain',
    );
    return;
  }

  logger.warn(
    { err: error },
    'Failed to enqueue catalog seed jobs — falling back to fire-and-forget seeding',
  );
  seedMoviesInBackground(tmdbMovies, localKeys, embeddings);
}

function ensureCandidatePool(
  candidatePool: CandidatePool,
  input: {
    feedbackSignals: FeedbackCandidateSignals;
    mentionedTitleKeys: Set<string>;
  },
): EnhancedMovieMatch[] {
  const recoveredMovies = recoverCandidatePool(candidatePool, input.feedbackSignals);

  if (recoveredMovies.length > 0) {
    return recoveredMovies;
  }

  logger.warn(
    {
      mentionedTitleCount: input.mentionedTitleKeys.size,
      feedbackExcludedMovieCount: input.feedbackSignals.excludedMovieKeys.size,
      feedbackExcludedTitleCount: input.feedbackSignals.excludedTitleKeys.size,
    },
    'No recommendation candidates remain after preserving user memory filters',
  );
  throw new Error('No similar movies found after applying recommendation history filters.');
}

function recoverCandidatePool(
  candidatePool: CandidatePool,
  feedbackSignals: FeedbackCandidateSignals,
): EnhancedMovieMatch[] {
  if (candidatePool.similarMovies.length > 0) {
    return candidatePool.similarMovies;
  }

  const feedbackPreservedFallbackMovies = applyFeedbackToLocalMovies(
    candidatePool.localSimilarMovies,
    feedbackSignals,
  ).slice(0, MAX_TOTAL_MOVIES);
  if (feedbackPreservedFallbackMovies.length > 0) {
    logger.warn(
      {
        feedbackExcludedTitleCount: feedbackSignals.excludedTitleKeys.size,
        feedbackDownrankTitleCount: feedbackSignals.downrankTitleKeys.size,
        fallbackCount: feedbackPreservedFallbackMovies.length,
      },
      'Mentioned-title filtering and TMDB fallback did not refill results; relaxing mentioned-title filters while preserving feedback filters',
    );
  }

  return feedbackPreservedFallbackMovies;
}

async function rankAndEnrichRecommendation(input: {
  allPeopleData: PersonFormData[];
  emitStage: PipelineContext['emitStage'];
  feedbackSignals: FeedbackCandidateSignals;
  locale: Locale;
  similarMovies: EnhancedMovieMatch[];
}): Promise<EnrichedRecommendation> {
  await input.emitStage('ai-ranking');
  const responseMessage = await getRecommendation(
    input.similarMovies,
    input.allPeopleData,
    input.locale,
  );
  const guardedRecommendation = resolveGuardedRecommendation(
    responseMessage,
    input.similarMovies,
    input.locale,
  );
  logGuardedRecommendation(guardedRecommendation, input.similarMovies, input.feedbackSignals);

  await input.emitStage('posters');
  const { posterURL } = await getMovieInfo(
    guardedRecommendation.title,
    input.locale,
    guardedRecommendation.movie.year,
    getGuardedMovieTMDBId(guardedRecommendation.movie),
  );

  logger.info('Enhancing similar movies with posters');
  const enhancedSimilarMovies = await enhanceSimilarMoviesWithPosters(
    input.similarMovies,
    input.locale,
  );

  await input.emitStage('descriptions');
  logger.info('Generating personalized AI descriptions for each movie');
  const moviesWithDescriptions = await generateMovieDescriptions(
    enhancedSimilarMovies,
    input.allPeopleData,
    input.locale,
  );

  return {
    guardedRecommendation,
    moviesWithDescriptions,
    posterURL,
  };
}

function logGuardedRecommendation(
  guardedRecommendation: ReturnType<typeof resolveGuardedRecommendation>,
  similarMovies: EnhancedMovieMatch[],
  feedbackSignals: FeedbackCandidateSignals,
): void {
  if (!guardedRecommendation.replacedOutOfSetTitle) {
    logger.info(
      { recommendedTitle: guardedRecommendation.title },
      'OpenAI recommendation received',
    );
    return;
  }

  logger.warn(
    {
      requestedTitle: guardedRecommendation.requestedTitle,
      fallbackTitle: guardedRecommendation.title,
      candidateCount: similarMovies.length,
      feedbackExcludedMovieCount: feedbackSignals.excludedMovieKeys.size,
      feedbackExcludedTitleCount: feedbackSignals.excludedTitleKeys.size,
    },
    'OpenAI returned a movie outside filtered candidates; using strongest remaining candidate',
  );
}

function getGuardedMovieTMDBId(movie: EnhancedMovieMatch): number | undefined {
  return movie.tmdbId ?? (Number(movie.id) < 0 ? Math.abs(Number(movie.id)) : undefined);
}

function buildPipelineResponse(input: {
  candidatePool: CandidatePool;
  dbMovieCount: number | null;
  enrichedRecommendation: EnrichedRecommendation;
  experienceMode: RecommendationExperienceMode;
  sourceStrategy: RecommendationSourceStrategy;
}): ApiResponse {
  const { guardedRecommendation, moviesWithDescriptions, posterURL } = input.enrichedRecommendation;
  const recommendedMovie =
    moviesWithDescriptions.find((movie) => movie.id === guardedRecommendation.movie.id) ??
    findCandidateByRecommendedTitle(moviesWithDescriptions, guardedRecommendation.title);

  logger.info(
    { movieCount: moviesWithDescriptions.length },
    'Returning all movies in unified list',
  );

  const similarMovies = mapResponseSimilarMovies(moviesWithDescriptions, recommendedMovie);
  const candidateSourceDistribution = summarizeCandidateSources(similarMovies);

  logger.info({ candidateSourceDistribution }, 'Recommendation candidate source distribution');

  return {
    description: guardedRecommendation.description,
    title: guardedRecommendation.title,
    posterURL,
    movieDetails: recommendedMovie ? mapRecommendedMovieDetails(recommendedMovie) : undefined,
    similarMovies,
    candidateSourceDistribution,
    experienceMode: input.experienceMode,
    sourceStrategy: input.sourceStrategy,
    usedBroaderSearch: input.candidatePool.usedBroaderSearch,
    dbMovieCount: input.dbMovieCount ?? undefined,
  };
}

function mapResponseSimilarMovies(
  moviesWithDescriptions: EnrichedRecommendation['moviesWithDescriptions'],
  recommendedMovie: EnhancedMovieMatch | undefined,
): NonNullable<ApiResponse['similarMovies']> {
  return moviesWithDescriptions.map((movie) => ({
    id: Number(movie.id),
    tmdbId: movie.tmdbId ?? (Number(movie.id) < 0 ? Math.abs(Number(movie.id)) : null),
    name: movie.name,
    year: movie.year,
    similarity: toFiniteNumber(movie.similarity),
    age_rating: movie.age_rating,
    duration: movie.duration,
    score_rating: movie.score_rating,
    posterURL: movie.posterURL,
    aiDescription: movie.aiDescription,
    localizedName: movie.localizedName,
    metadataQualityScore: movie.metadataQualityScore,
    metadataQualityFlags: movie.metadataQualityFlags,
    originalLanguage: movie.originalLanguage,
    voteCount: movie.voteCount,
    popularity: movie.popularity,
    watchProviders: movie.watchProviders,
    isMainRecommendation: recommendedMovie ? movie.id === recommendedMovie.id : false,
    fromTMDB: Number(movie.id) < 0,
    source: getCandidateSource(movie),
  }));
}

function mapRecommendedMovieDetails(
  recommendedMovie: EnhancedMovieMatch,
): NonNullable<ApiResponse['movieDetails']> {
  return {
    year: recommendedMovie.year,
    age_rating: recommendedMovie.age_rating,
    duration: recommendedMovie.duration,
    score_rating: recommendedMovie.score_rating,
    similarity: toFiniteNumber(recommendedMovie.similarity),
  };
}

function toFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
