/**
 * Core AI recommendation pipeline.
 *
 * Extracted from route.ts so the same logic can be called both from the
 * legacy POST /api/movie-recommendation route and the new BullMQ worker.
 */

import { getDbClient } from '@/clients/dbClient';
import { MOVIE_SEED_JOB_OPTIONS, seedQueue } from '@/lib/jobQueue';
import logger from '@/lib/logger';

import {
  excludeMentionedLocalMovies,
  excludeMentionedTMDBMovies,
  getMentionedMovieTitleKeys,
} from './candidateFilters';
import { createEmbedding, refineQueryWithLLM } from './embedding';
import { SIMILARITY_THRESHOLD, shouldFallBackToTMDB } from './helpers';
import {
  enhanceSimilarMoviesWithPosters,
  generateMovieDescriptions,
  getMovieInfo,
  getRecommendation,
  getSimilarMovies,
} from './recommendation';
import {
  MAX_TOTAL_MOVIES,
  fetchTMDBDiscoverMovies,
  parseTMDBReleaseYear,
  scoreAndConvertTMDBMovies,
  seedMoviesInBackground,
  serializeTMDBEmbeddings,
} from './tmdb';

import type { ApiResponse, PersonFormData } from './types';
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
  options: { onStageChange?: (stage: RecommendationStage) => Promise<void> | void } = {},
): Promise<ApiResponse> {
  const mentionedTitleKeys = getMentionedMovieTitleKeys(allPeopleData);

  async function emitStage(stage: RecommendationStage): Promise<void> {
    try {
      await options.onStageChange?.(stage);
    } catch (err) {
      logger.warn({ err, stage }, 'Failed to update recommendation stage');
    }
  }

  // Step 0.5: Query enrichment — convert "Why?" text to semantic tags using a lightweight LLM,
  // while the DB movie count is fetched in parallel (both are independent of each other).
  await emitStage('preparing');
  const [refinedQueryTags, dbMovieCountResult] = await Promise.all([
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
  ]);

  // Step 1: Create embedding
  await emitStage('embedding');
  const embedding = await createEmbedding(allPeopleData, refinedQueryTags ?? undefined);
  logger.info({ dbMovieCount: dbMovieCountResult }, 'Embedding created, DB count fetched');

  // Step 2: Find similar movies (local vector search)
  await emitStage('local-search');
  let similarMovies = excludeMentionedLocalMovies(
    await getSimilarMovies(embedding),
    mentionedTitleKeys,
  );

  // Step 3: Hybrid search — fall back to TMDB if local results are insufficient
  let usedBroaderSearch = false;
  const highQualityLocal = similarMovies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD);
  const needsTMDBFallback = shouldFallBackToTMDB(similarMovies);

  if (needsTMDBFallback) {
    await emitStage('tmdb-search');
    logger.info(
      { highQualityLocal: highQualityLocal.length, threshold: SIMILARITY_THRESHOLD },
      'Local results below quality threshold — trying TMDB fallback',
    );

    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (tmdbApiKey) {
      const tmdbMovies = excludeMentionedTMDBMovies(
        await fetchTMDBDiscoverMovies(allPeopleData, tmdbApiKey),
        mentionedTitleKeys,
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
        const newTMDBMatchList = newTMDBMatches.matches;

        similarMovies = [...localResultsForMerge, ...newTMDBMatchList].slice(0, MAX_TOTAL_MOVIES);

        if (newTMDBMatchList.length > 0) {
          usedBroaderSearch = true;
        }

        logger.info(
          {
            localCount: localResultsForMerge.length,
            tmdbCount: newTMDBMatchList.length,
            finalCount: similarMovies.length,
          },
          'Merged local and TMDB results',
        );

        // Queue JIT seeding
        if (seedQueue) {
          try {
            await withTimeout(
              seedQueue.add(
                'seed-movies',
                {
                  tmdbMovies,
                  localKeys: Array.from(localKeys),
                  tmdbEmbeddings: serializeTMDBEmbeddings(tmdbEmbeddings),
                },
                MOVIE_SEED_JOB_OPTIONS,
              ),
              MOVIE_SEED_ENQUEUE_TIMEOUT_MS,
              'Movie seed enqueue timed out',
            );
            logger.info({ queuedMovies: tmdbMovies.length }, 'Queued TMDB seeding job');
          } catch (error) {
            if (error instanceof EnqueueTimeoutError) {
              logger.warn(
                { err: error, queuedMovies: tmdbMovies.length },
                'Timed out while enqueueing TMDB seeding job; skipping fallback since enqueue status is uncertain',
              );
            } else {
              logger.warn(
                { err: error },
                'Failed to enqueue TMDB seeding job — falling back to fire-and-forget seeding',
              );
              seedMoviesInBackground(tmdbMovies, localKeys, tmdbEmbeddings);
            }
          }
        } else {
          logger.warn(
            'Movie seed queue unavailable — falling back to fire-and-forget TMDB seeding',
          );
          seedMoviesInBackground(tmdbMovies, localKeys, tmdbEmbeddings);
        }
      }
    } else {
      logger.warn('TMDB_API_KEY not configured — skipping TMDB fallback');
    }
  }

  if (similarMovies.length === 0) {
    throw new Error('No similar movies found.');
  }

  // Step 4: Get recommendation from OpenAI
  await emitStage('ai-ranking');
  const responseMessage = await getRecommendation(similarMovies, allPeopleData, locale);
  logger.info({ recommendedTitle: responseMessage.title }, 'OpenAI recommendation received');

  // Step 5: Get localized poster + name for main recommendation
  await emitStage('posters');
  const { posterURL } = await getMovieInfo(responseMessage.title, locale);

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
  const recommendedMovie = moviesWithDescriptions.find(
    (movie) =>
      movie.name.toLowerCase().includes(responseMessage.title.toLowerCase()) ||
      responseMessage.title.toLowerCase().includes(movie.name.toLowerCase()),
  );

  logger.info(
    { movieCount: moviesWithDescriptions.length },
    'Returning all movies in unified list',
  );

  return {
    description: responseMessage.description,
    title: responseMessage.title,
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
    similarMovies: moviesWithDescriptions.map((movie) => ({
      id: Number(movie.id),
      name: movie.name,
      year: movie.year,
      similarity: Number.isFinite(movie.similarity) ? movie.similarity : 0,
      age_rating: movie.age_rating,
      duration: movie.duration,
      score_rating: movie.score_rating,
      posterURL: movie.posterURL,
      aiDescription: movie.aiDescription,
      localizedName: movie.localizedName,
      isMainRecommendation: recommendedMovie ? movie.id === recommendedMovie.id : false,
      fromTMDB: Number(movie.id) < 0,
    })),
    usedBroaderSearch,
    dbMovieCount: dbMovieCountResult ?? undefined,
  };
}
