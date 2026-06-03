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
  PersonFormData,
  RecommendationExperienceMode,
  RecommendationSourceStrategy,
} from './types';
import type { RecommendationStage } from '@/lib/db/recommendations';
import type { Locale } from '@/lib/locale';

const MOVIE_SEED_ENQUEUE_TIMEOUT_MS = 1500;

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
  options: {
    experienceMode?: RecommendationExperienceMode;
    onStageChange?: (stage: RecommendationStage) => Promise<void> | void;
    sourceStrategy?: RecommendationSourceStrategy;
    userId?: string;
  } = {},
): Promise<ApiResponse> {
  const mentionedTitleKeys = getMentionedMovieTitleKeys(allPeopleData);
  const sourceStrategy =
    options.sourceStrategy ??
    resolveRecommendationSourceStrategy({
      experienceMode: options.experienceMode,
      people: allPeopleData,
    }).id;
  const experienceMode = options.experienceMode ?? 'normal-match';
  setActiveTraceAttributes({
    'recommendation.experience_mode': experienceMode,
    'recommendation.source_strategy': sourceStrategy,
  });
  logger.info({ experienceMode, sourceStrategy }, 'Recommendation source strategy selected');

  async function emitStage(stage: RecommendationStage): Promise<void> {
    setActiveTraceAttributes({ 'recommendation.stage': stage });
    try {
      await options.onStageChange?.(stage);
    } catch (err) {
      logger.warn({ err, stage }, 'Failed to update recommendation stage');
    }
  }

  // Step 0.5: Query enrichment — convert "Why?" text to semantic tags using a lightweight LLM,
  // while the DB movie count and user feedback are fetched in parallel (all are independent).
  await emitStage('preparing');
  const [refinedQueryTags, dbMovieCountResult, feedbackPreferences] = await Promise.all([
    refineQueryWithLLM(allPeopleData),
    (async () => {
      try {
        const db = getDbClient();
        if (!db.isConfigured()) return null;
        const countRes = await db.from('movies').select('id', { count: 'exact', head: true });
        return countRes.count ?? null;
      } catch {
        return null;
      }
    })(),
    (async () => {
      if (!options.userId) return [];
      try {
        return await getUserRecommendationFeedbackMoviePreferences(options.userId);
      } catch (err) {
        logger.warn({ err }, 'Failed to load user recommendation feedback preferences');
        return [];
      }
    })(),
  ]);
  const feedbackSignals = getFeedbackCandidateSignals(feedbackPreferences);

  // Step 1: Create embedding
  await emitStage('embedding');
  const embedding = await createEmbedding(allPeopleData, refinedQueryTags ?? undefined);
  logger.info({ dbMovieCount: dbMovieCountResult }, 'Embedding created, DB count fetched');

  // Step 2: Find similar movies (local vector search)
  await emitStage('local-search');
  const localSimilarMovies = await getSimilarMovies(embedding);
  const mentionedFilteredLocalMovies = excludeMentionedLocalMovies(
    localSimilarMovies,
    mentionedTitleKeys,
  );
  let similarMovies = applyFeedbackToLocalMovies(mentionedFilteredLocalMovies, feedbackSignals);

  // Step 3: External catalog search — use TMDB as primary for tmdb-first, or as fallback
  // for hybrid strategies when local results are insufficient.
  let usedBroaderSearch = false;
  const highQualityLocal = similarMovies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD);
  const tmdbFallbackDecision = getTMDBFallbackDecision(sourceStrategy, similarMovies);
  const shouldAttemptTMDB = tmdbFallbackDecision.shouldAttempt;
  const prefersTMDBCandidates = sourceStrategy === 'tmdb-first';

  if (shouldAttemptTMDB) {
    await emitStage('tmdb-search');
    logger.info(
      {
        highQualityLocal: highQualityLocal.length,
        sourceStrategy,
        threshold: SIMILARITY_THRESHOLD,
        tmdbFallbackReason: tmdbFallbackDecision.reason,
      },
      prefersTMDBCandidates
        ? 'Trying TMDB-first candidate retrieval'
        : 'Local results below quality threshold — trying TMDB fallback',
    );
  } else {
    logger.info(
      {
        highQualityLocal: highQualityLocal.length,
        sourceStrategy,
        threshold: SIMILARITY_THRESHOLD,
        tmdbFallbackReason: tmdbFallbackDecision.reason,
      },
      'TMDB fallback skipped by source strategy policy',
    );
  }

  if (shouldAttemptTMDB) {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (tmdbApiKey) {
      const tmdbMovies = excludeFeedbackTMDBMovies(
        excludeMentionedTMDBMovies(
          await fetchTMDBDiscoverMovies(allPeopleData, tmdbApiKey),
          mentionedTitleKeys,
        ),
        feedbackSignals,
      );

      if (tmdbMovies.length > 0) {
        const localResultsForMerge = highQualityLocal.slice(0, MAX_TOTAL_MOVIES);

        const localKeys = new Set<string>();
        for (const m of similarMovies) {
          const nameLower = m.name.toLowerCase();
          localKeys.add(`${nameLower}|${m.year}`);
        }
        const slotsRemaining = Math.max(0, MAX_TOTAL_MOVIES - localResultsForMerge.length);
        const filteredTMDBMovies = tmdbMovies
          .filter((m) => {
            const tmdbYear = parseTMDBReleaseYear(m.release_date);
            return !localKeys.has(`${m.title.toLowerCase()}|${tmdbYear}`);
          })
          .slice(0, slotsRemaining);
        const newTMDBMatches = await scoreAndConvertTMDBMovies(filteredTMDBMovies, embedding);
        const tmdbEmbeddings = newTMDBMatches.embeddings;
        const enrichedTMDBMatches = prefersTMDBCandidates
          ? await enrichTMDBMatchesWithDetails(newTMDBMatches.matches, tmdbApiKey, locale)
          : newTMDBMatches.matches;
        const newTMDBMatchList = applyFeedbackToLocalMovies(enrichedTMDBMatches, feedbackSignals);

        if (prefersTMDBCandidates) {
          similarMovies = [...newTMDBMatchList, ...localResultsForMerge]
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, MAX_TOTAL_MOVIES);
        } else {
          similarMovies = [...localResultsForMerge, ...newTMDBMatchList].slice(0, MAX_TOTAL_MOVIES);
        }

        if (newTMDBMatchList.length > 0) {
          usedBroaderSearch = true;
        }

        logger.info(
          {
            localCount: localResultsForMerge.length,
            tmdbCount: newTMDBMatchList.length,
            finalCount: similarMovies.length,
            sourceStrategy,
          },
          prefersTMDBCandidates
            ? 'Merged score-ranked TMDB-first and local candidates'
            : 'Merged local and TMDB results',
        );

        // Queue per-movie catalog maintenance jobs with deterministic ids so repeated
        // recommendation requests do not fan out duplicate TMDB/cache work.
        try {
          const queuedMovies = await withTimeout(
            enqueueCatalogSeedTMDBMovies({
              movies: tmdbMovies,
              source: 'recommendation_jit',
              localKeys: Array.from(localKeys),
              embeddings: tmdbEmbeddings,
            }),
            MOVIE_SEED_ENQUEUE_TIMEOUT_MS,
            'Catalog seed enqueue timed out',
          );
          if (queuedMovies > 0) {
            logger.info({ queuedMovies }, 'Queued catalog maintenance seed jobs');
          } else {
            logger.warn(
              'Catalog maintenance queue unavailable — falling back to fire-and-forget TMDB seeding',
            );
            seedMoviesInBackground(tmdbMovies, localKeys, tmdbEmbeddings);
          }
        } catch (error) {
          if (error instanceof EnqueueTimeoutError) {
            logger.warn(
              { err: error, queuedMovies: tmdbMovies.length },
              'Timed out while enqueueing catalog seed jobs; skipping fallback since enqueue status is uncertain',
            );
          } else {
            logger.warn(
              { err: error },
              'Failed to enqueue catalog seed jobs — falling back to fire-and-forget seeding',
            );
            seedMoviesInBackground(tmdbMovies, localKeys, tmdbEmbeddings);
          }
        }
      }
    } else {
      logger.warn('TMDB_API_KEY not configured — skipping TMDB fallback');
    }
  }

  if (similarMovies.length === 0) {
    const feedbackPreservedFallbackMovies = applyFeedbackToLocalMovies(
      localSimilarMovies,
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
      similarMovies = feedbackPreservedFallbackMovies;
    }
  }

  if (similarMovies.length === 0) {
    logger.warn(
      {
        mentionedTitleCount: mentionedTitleKeys.size,
        feedbackExcludedMovieCount: feedbackSignals.excludedMovieKeys.size,
        feedbackExcludedTitleCount: feedbackSignals.excludedTitleKeys.size,
      },
      'No recommendation candidates remain after preserving user memory filters',
    );
    throw new Error('No similar movies found after applying recommendation history filters.');
  }

  // Step 4: Get recommendation from OpenAI
  await emitStage('ai-ranking');
  const responseMessage = await getRecommendation(similarMovies, allPeopleData, locale);
  const guardedRecommendation = resolveGuardedRecommendation(
    responseMessage,
    similarMovies,
    locale,
  );

  if (guardedRecommendation.replacedOutOfSetTitle) {
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
  } else {
    logger.info(
      { recommendedTitle: guardedRecommendation.title },
      'OpenAI recommendation received',
    );
  }

  // Step 5: Get localized poster + name for main recommendation
  await emitStage('posters');
  const guardedMovieTMDBId =
    guardedRecommendation.movie.tmdbId ??
    (Number(guardedRecommendation.movie.id) < 0
      ? Math.abs(Number(guardedRecommendation.movie.id))
      : undefined);
  const { posterURL } = await getMovieInfo(
    guardedRecommendation.title,
    locale,
    guardedRecommendation.movie.year,
    guardedMovieTMDBId ?? undefined,
  );

  // Step 6: Enhance similar movies with poster URLs and localized names (in batches)
  logger.info('Enhancing similar movies with posters');
  const enhancedSimilarMovies = await enhanceSimilarMoviesWithPosters(similarMovies, locale);

  // Step 7: Generate AI descriptions for each movie
  await emitStage('descriptions');
  logger.info('Generating personalized AI descriptions for each movie');
  const moviesWithDescriptions = await generateMovieDescriptions(
    enhancedSimilarMovies,
    allPeopleData,
    locale,
  );

  // Find the recommended movie
  const recommendedMovie =
    moviesWithDescriptions.find((movie) => movie.id === guardedRecommendation.movie.id) ??
    findCandidateByRecommendedTitle(moviesWithDescriptions, guardedRecommendation.title);

  logger.info(
    { movieCount: moviesWithDescriptions.length },
    'Returning all movies in unified list',
  );

  const responseSimilarMovies: NonNullable<ApiResponse['similarMovies']> =
    moviesWithDescriptions.map((movie) => {
      const source = getCandidateSource(movie);

      return {
        id: Number(movie.id),
        tmdbId: movie.tmdbId ?? (Number(movie.id) < 0 ? Math.abs(Number(movie.id)) : null),
        name: movie.name,
        year: movie.year,
        similarity: Number.isFinite(movie.similarity) ? movie.similarity : 0,
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
        source,
      };
    });
  const candidateSourceDistribution = summarizeCandidateSources(responseSimilarMovies);

  logger.info({ candidateSourceDistribution }, 'Recommendation candidate source distribution');

  return {
    description: guardedRecommendation.description,
    title: guardedRecommendation.title,
    posterURL: posterURL,
    movieDetails: recommendedMovie
      ? {
          year: recommendedMovie.year,
          age_rating: recommendedMovie.age_rating,
          duration: recommendedMovie.duration,
          score_rating: recommendedMovie.score_rating,
          similarity: Number.isFinite(recommendedMovie.similarity)
            ? recommendedMovie.similarity
            : 0,
        }
      : undefined,
    similarMovies: responseSimilarMovies,
    candidateSourceDistribution,
    experienceMode,
    sourceStrategy,
    usedBroaderSearch,
    dbMovieCount: dbMovieCountResult ?? undefined,
  };
}
