import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { MOVIE_SEED_JOB_OPTIONS, seedQueue } from '@/lib/jobQueue';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { withAuth } from '@/lib/withAuth';
import {
  ALWAYS_BLOCK_CATEGORIES,
  checkForPromptInjection,
  judgeForMoviePlatform,
  moderateInput,
} from '@/utils/ai/moderation';

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
  serializeTMDBEmbeddings,
  scoreAndConvertTMDBMovies,
  seedMoviesInBackground,
} from './tmdb';
import { apiResponseSchema, requestBodySchema } from './types';

import type { ApiResponse, PersonFormData } from './types';

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

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  try {
    const rateLimitResponse = await applyRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();

    // Validate request body
    const validatedBody = requestBodySchema.parse(body);

    // Read locale from Accept-Language header, default to English
    const locale = parseLocaleFromRequest(req);

    // Normalize to array format for consistent processing
    const allPeopleData: PersonFormData[] = Array.isArray(validatedBody)
      ? validatedBody
      : [validatedBody];

    logger.info({ personCount: allPeopleData.length, locale }, 'Processing recommendation request');

    // Step 0: Protect against prompt injection, then moderate + judge all user inputs.
    //
    // Phase A — structural injection check on favoriteMovie and favoriteMovieWhy
    // (fast regex, no API call). This must run before any LLM sees the text.
    const injectionDetected = allPeopleData.some(
      (p) =>
        checkForPromptInjection(p.favoriteMovie) ||
        checkForPromptInjection(p.favoriteMovieWhy ?? ''),
    );
    if (injectionDetected) {
      logger.warn('Prompt injection attempt detected in user input');
      return NextResponse.json(
        {
          error:
            'Your input contains content that cannot be processed. Please revise your preferences and try again.',
        },
        { status: 422 },
      );
    }

    // Phase B — Moderation API on all fields including the movie title.
    const textsToModerate = allPeopleData.flatMap((p) =>
      [
        p.favoriteMovie,
        p.newVsClassic,
        p.tonePreference,
        p.favoriteMovieWhy,
        ...p.moodPreference,
      ].filter((text): text is string => typeof text === 'string' && text.length > 0),
    );
    const moderationResult = await moderateInput(textsToModerate);

    if (moderationResult.flagged) {
      // Phase C — Always-block categories bypass the judge (no movie context justifies these).
      const hasAlwaysBlockCategory = moderationResult.categories.some((c) =>
        ALWAYS_BLOCK_CATEGORIES.has(c),
      );
      if (hasAlwaysBlockCategory) {
        logger.warn(
          { categories: moderationResult.categories },
          'User input blocked by always-block moderation category',
        );
        return NextResponse.json(
          {
            error:
              'Your input contains content that cannot be processed. Please revise your preferences and try again.',
            flaggedCategories: moderationResult.categories,
          },
          { status: 422 },
        );
      }

      // Phase D — Judge pattern: a cheap LLM decides if the flagged content is legitimate
      // movie-platform input. "Kill Bill" flagged for violence is a real film title; the
      // judge recognises this and returns suitable: true.
      const labeledInputs = allPeopleData.flatMap((p) => [
        { field: 'favoriteMovie', value: p.favoriteMovie },
        { field: 'newVsClassic', value: p.newVsClassic },
        { field: 'tonePreference', value: p.tonePreference },
        ...p.moodPreference.map((m) => ({ field: 'moodPreference', value: m })),
        ...(p.favoriteMovieWhy ? [{ field: 'favoriteMovieWhy', value: p.favoriteMovieWhy }] : []),
      ]);
      const judgeResult = await judgeForMoviePlatform(labeledInputs, moderationResult.categories);

      if (!judgeResult.suitable) {
        logger.warn(
          { categories: moderationResult.categories },
          'User input blocked by judge after moderation flag',
        );
        return NextResponse.json(
          {
            error:
              'Your input contains content that cannot be processed. Please revise your preferences and try again.',
            flaggedCategories: moderationResult.categories,
          },
          { status: 422 },
        );
      }

      logger.info(
        { categories: moderationResult.categories },
        'Judge approved content flagged by moderation — proceeding',
      );
    }

    // Step 0.5: Query enrichment — convert "Why?" text to semantic tags using a lightweight LLM,
    // while the DB movie count is fetched in parallel (both are independent of each other).
    // Falls back gracefully to raw text if the LLM call fails or the field is empty.
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

    // Step 1: Create embedding (sequential after enrichment — depends on refinedQueryTags).
    // DB count was already fetched in parallel above, so this only adds embedding latency.
    const embedding = await createEmbedding(allPeopleData, refinedQueryTags ?? undefined);
    logger.info({ dbMovieCount: dbMovieCountResult }, 'Embedding created, DB count fetched');

    // Step 2: Find similar movies (local vector search)
    let similarMovies = await getSimilarMovies(embedding);

    // Step 3: Hybrid search — fall back to TMDB if local results are insufficient
    let usedBroaderSearch = false;
    const highQualityLocal = similarMovies.filter((m) => m.similarity >= SIMILARITY_THRESHOLD);
    const needsTMDBFallback = shouldFallBackToTMDB(similarMovies);

    if (needsTMDBFallback) {
      logger.info(
        { highQualityLocal: highQualityLocal.length, threshold: SIMILARITY_THRESHOLD },
        'Local results below quality threshold — trying TMDB fallback',
      );

      const tmdbApiKey = process.env.TMDB_API_KEY;
      if (tmdbApiKey) {
        const tmdbMovies = await fetchTMDBDiscoverMovies(allPeopleData, tmdbApiKey);

        if (tmdbMovies.length > 0) {
          // Keep only the high-quality local results, then fill remaining slots with TMDB.
          const localResultsForMerge = highQualityLocal.slice(0, MAX_TOTAL_MOVIES);

          // Build dedup sets from ALL local DB results (any similarity), not just high-quality
          // ones. This prevents movies that are already in the DB (e.g. from a previous JIT
          // seeding) from being returned again via TMDB with fromTMDB=true, even if their
          // cosine similarity on this query falls just below SIMILARITY_THRESHOLD.
          // - localKeys: composite (name|year) for both TMDB dedup and seeding dedup
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

          // Only show the UI banner when TMDB movies are actually included
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

          // Queue JIT seeding with retries/backoff for reliability and observability.
          // Fail open if queueing is unavailable so recommendation flow is never blocked.
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
                  'Timed out while enqueueing TMDB seeding job; skipping fallback to avoid duplicate seeding',
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

    // If we still have no movies after all fallbacks, surface a clear error
    if (similarMovies.length === 0) {
      throw new Error('No similar movies found.');
    }

    // Step 4: Get recommendation from OpenAI
    const responseMessage = await getRecommendation(similarMovies, locale);
    logger.info({ recommendedTitle: responseMessage.title }, 'OpenAI recommendation received');

    // Step 5: Get localized poster + name for main recommendation
    const { posterURL } = await getMovieInfo(responseMessage.title, locale);

    // Step 6: Enhance similar movies with poster URLs and localized names (in batches)
    logger.info('Enhancing similar movies with posters');
    const enhancedSimilarMovies = await enhanceSimilarMoviesWithPosters(similarMovies, locale);

    // Step 7: Generate AI descriptions for each movie
    logger.info('Generating personalized AI descriptions for each movie');
    const moviesWithDescriptions = await generateMovieDescriptions(
      enhancedSimilarMovies,
      allPeopleData,
      locale,
    );

    // Find the recommended movie in our similar movies to get its details
    const recommendedMovie = moviesWithDescriptions.find(
      (movie) =>
        movie.name.toLowerCase().includes(responseMessage.title.toLowerCase()) ||
        responseMessage.title.toLowerCase().includes(movie.name.toLowerCase()),
    );

    // Don't filter out any movies - include all movies in the response
    // The main recommendation info is still provided for context, but UI will show all movies together
    logger.info(
      { movieCount: moviesWithDescriptions.length },
      'Returning all movies in unified list',
    );

    // Validate and return response with enhanced data
    const response: ApiResponse = {
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
        // Mark the main recommendation for potential UI highlighting (optional)
        isMainRecommendation: recommendedMovie ? movie.id === recommendedMovie.id : false,
        // Negative IDs indicate TMDB-sourced movies not yet persisted locally
        fromTMDB: Number(movie.id) < 0,
      })),
      usedBroaderSearch,
      dbMovieCount: dbMovieCountResult ?? undefined,
    };

    const duration = Date.now() - startTime;
    logger.info(
      { durationMs: duration, movieCount: moviesWithDescriptions.length },
      'Recommendation request completed',
    );

    return NextResponse.json(apiResponseSchema.parse(response));
  } catch (error) {
    // Handle validation errors first — these are client errors (400), not server errors
    if (error instanceof z.ZodError) {
      logger.warn({ err: error, issues: error.issues }, 'Invalid request body');
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 },
      );
    }

    logger.error({ err: error }, 'Error in movie recommendation API');

    // Handle other known errors
    if (error instanceof Error) {
      // Return more specific error messages based on error content
      if (error.message.includes('embedding')) {
        return NextResponse.json({ error: 'Failed to process preferences' }, { status: 500 });
      }
      if (error.message.includes('similar movies')) {
        return NextResponse.json({ error: 'Failed to find matching movies' }, { status: 500 });
      }
      if (error.message.includes('OpenAI')) {
        return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
      }
    }

    // Generic error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);

// ---------------------------------------------------------------------------
// GET handler — API documentation
// ---------------------------------------------------------------------------
export async function GET() {
  return NextResponse.json({
    name: 'PopChoice Movie Recommendation API',
    description: 'Get personalized movie recommendations based on preferences',
    version: '1.0.0',
    methods: {
      POST: {
        description: 'Get movie recommendation',
        requestBody: {
          type: 'object | array',
          description: 'Single person data or array of people data',
          schema: {
            favoriteMovie: 'string (required)',
            favoriteMovieWhy:
              'string (optional, max 300 chars) — why you love that movie; empty/whitespace is treated as absent',
            newVsClassic: 'string (required)',
            moodPreference: 'string[] (required, min 1)',
            tonePreference: 'string (required)',
          },
        },
        response: {
          description: 'string - AI-generated recommendation explanation',
          title: 'string - Recommended movie title',
          posterURL: 'string (optional) - Movie poster URL from TMDB',
          movieDetails: {
            year: 'number - Release year',
            age_rating: 'string - Age rating (G, PG, R, etc.)',
            duration: 'number - Duration in minutes',
            score_rating: 'number - Rating score (0-10)',
            similarity: 'number - Similarity score to user preferences (0-1)',
          },
          similarMovies: 'array - All similar movies found with their details',
        },
      },
    },
    examples: {
      singlePerson: {
        favoriteMovie: 'The Matrix',
        favoriteMovieWhy: 'I love the mind-bending reality twists and tense action',
        newVsClassic: 'new',
        moodPreference: ['action', 'sci-fi'],
        tonePreference: 'serious',
      },
      multiplePeople: [
        {
          favoriteMovie: 'The Matrix',
          favoriteMovieWhy: 'Mind-bending and visually stunning',
          newVsClassic: 'new',
          moodPreference: ['action'],
          tonePreference: 'serious',
        },
        {
          favoriteMovie: 'The Godfather',
          newVsClassic: 'classic',
          moodPreference: ['drama'],
          tonePreference: 'dark',
        },
      ],
    },
  });
}
