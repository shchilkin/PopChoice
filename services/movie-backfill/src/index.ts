/**
 * Movie Backfill Service — Entry Point
 *
 * Queries the database for movies missing TMDB identity or runtime and backfills them
 * by fetching runtime, age rating, and details from TMDB, then re-generates
 * embeddings and updates the database rows.
 *
 * Environment variables:
 *   TMDB_API_KEY    — TMDB v4 read access token (required)
 *   OPENAI_API_KEY  — OpenAI API key (required)
 *   DATABASE_URL    — PostgreSQL connection string (required)
 *   DRY_RUN         — Set to "true" to skip DB writes (default: false)
 *   BATCH_SIZE      — Number of parallel TMDB detail requests (default: 5)
 *   MAX_MOVIES      — Max movies to process; 0 = all (default: 0)
 */

import { loadConfig } from './config.js';
import {
  checkTableExists,
  closeDatabase,
  ensureTMDBMatchReviewSchema,
  getIncompleteMovies,
  initDatabase,
  recordTMDBMatchReview,
  updateMovie,
  type IncompleteMovie,
  type RecordTMDBMatchReviewInput,
} from './database.js';
import { createEmbeddings } from './embeddings.js';
import { logger } from './logger.js';
import {
  extractUSCertification,
  fetchMovieDetails,
  getPosterUrl,
  movieToEmbeddingText,
  searchMovieMatch,
} from './tmdb.js';

/** A movie that passed all TMDB validations and is ready for embedding + DB update. */
interface PendingUpdate {
  movie: IncompleteMovie;
  tmdbId: number;
  matchConfidence: number;
  runtime: number;
  ageRating: string;
  posterUrl: string | null;
  localizedName: string | null;
  embeddingText: string;
}

function isRuntimeCompatible(existingRuntime: number, tmdbRuntime: number): boolean {
  if (existingRuntime <= 0) return true;
  return Math.abs(existingRuntime - tmdbRuntime) <= 20;
}

async function maybeRecordTMDBMatchReview(
  config: ReturnType<typeof loadConfig>,
  input: RecordTMDBMatchReviewInput,
): Promise<void> {
  if (config.dryRun) {
    logger.info('DRY RUN: would record TMDB match review', {
      id: input.movie.id,
      name: input.movie.name,
      year: input.movie.year,
      reason: input.reason,
      candidateCount: input.candidates.length,
    });
    return;
  }

  await recordTMDBMatchReview(input);
}

async function main(): Promise<void> {
  const config = loadConfig();

  logger.info('Movie backfill service starting', {
    dryRun: config.dryRun,
    batchSize: config.batchSize,
    maxMovies: config.maxMovies === 0 ? 'unlimited' : config.maxMovies,
  });

  initDatabase(config.databaseUrl);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalWouldUpdate = 0;
  let totalSkipped = 0;

  try {
    const tableExists = await checkTableExists('movies');
    if (!tableExists) {
      logger.info("Table 'movies' does not exist — skipping backfill");
      return;
    }

    await ensureTMDBMatchReviewSchema();

    const movies = await getIncompleteMovies(config.maxMovies);
    logger.info('Fetched movies needing TMDB identity or metadata backfill', {
      count: movies.length,
    });

    if (movies.length === 0) {
      logger.info('No movies need TMDB identity or metadata backfill — nothing to do');
      return;
    }

    // Process in batches to limit concurrent TMDB requests
    for (let i = 0; i < movies.length; i += config.batchSize) {
      const batch = movies.slice(i, i + config.batchSize);
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(movies.length / config.batchSize);

      logger.info('Processing batch', { batch: batchNum, totalBatches, size: batch.length });

      // Phase 1: parallel TMDB lookups for the entire batch
      const pendingUpdates: PendingUpdate[] = [];

      await Promise.all(
        batch.map(async (movie) => {
          totalProcessed++;
          try {
            // 1. Use an existing TMDB id when present; otherwise search by title + year.
            const match: Awaited<ReturnType<typeof searchMovieMatch>> = movie.tmdb_id
              ? {
                  status: 'matched',
                  tmdbId: movie.tmdb_id,
                  confidence: 1,
                  title: movie.name,
                  releaseYear: movie.year,
                  candidates: [],
                }
              : await searchMovieMatch(config.tmdbApiKey, movie.name, movie.year);
            if (match.status === 'ambiguous') {
              logger.warn('Ambiguous TMDB match — manual review needed', {
                id: movie.id,
                name: movie.name,
                year: movie.year,
                candidates: match.candidates,
              });
              await maybeRecordTMDBMatchReview(config, {
                movie,
                reason: 'ambiguous_match',
                candidates: match.candidates,
                notes: 'TMDB returned multiple high-confidence title/year candidates.',
              });
              totalSkipped++;
              return;
            }

            if (match.status === 'not_found') {
              logger.warn('Movie not confidently found on TMDB — skipping', {
                id: movie.id,
                name: movie.name,
                year: movie.year,
                candidates: match.candidates,
              });
              totalSkipped++;
              return;
            }

            // 2. Fetch full movie details
            const details = await fetchMovieDetails(config.tmdbApiKey, match.tmdbId);
            if (!details) {
              logger.warn('Failed to fetch movie details from TMDB — skipping', {
                name: movie.name,
                year: movie.year,
                tmdbId: match.tmdbId,
              });
              totalSkipped++;
              return;
            }

            // 3. Extract runtime — skip if neither TMDB nor the database has it.
            const runtime = details.runtime ?? movie.duration;
            if (!runtime || runtime === 0) {
              logger.warn('TMDB returned no runtime for movie — skipping', {
                name: movie.name,
                year: movie.year,
                tmdbId: match.tmdbId,
                runtime,
              });
              totalSkipped++;
              return;
            }

            if (!isRuntimeCompatible(movie.duration, runtime)) {
              logger.warn('TMDB candidate runtime mismatch — manual review needed', {
                id: movie.id,
                name: movie.name,
                year: movie.year,
                existingRuntime: movie.duration,
                tmdbId: match.tmdbId,
                tmdbRuntime: runtime,
                matchConfidence: match.confidence,
                candidates: match.candidates,
              });
              await maybeRecordTMDBMatchReview(config, {
                movie,
                reason: 'runtime_mismatch',
                candidates: match.candidates,
                notes: `Existing runtime ${movie.duration} min did not match TMDB runtime ${runtime} min for candidate ${match.tmdbId}.`,
              });
              totalSkipped++;
              return;
            }

            // 4. Extract age rating
            const ageRating = extractUSCertification(details);

            // 5. Build embedding text using the existing DB score_rating and description
            //    to keep the embedding consistent with the stored row fields.
            const embeddingText = movieToEmbeddingText(
              movie.name,
              movie.year,
              ageRating,
              runtime,
              movie.description,
              movie.score_rating,
            );

            // 6. Dry run: log and skip DB write
            if (config.dryRun) {
              logger.info('DRY RUN: would update movie', {
                id: movie.id,
                name: movie.name,
                year: movie.year,
                tmdbId: match.tmdbId,
                matchConfidence: match.confidence,
                runtime,
                ageRating,
              });
              totalWouldUpdate++;
              return;
            }

            // Collect for batch embedding in Phase 2
            pendingUpdates.push({
              movie,
              tmdbId: match.tmdbId,
              matchConfidence: match.confidence,
              runtime,
              ageRating,
              posterUrl: getPosterUrl(details.poster_path),
              localizedName: details.title && details.title !== movie.name ? details.title : null,
              embeddingText,
            });
          } catch (err) {
            logger.warn('Failed to backfill movie — skipping', {
              id: movie.id,
              name: movie.name,
              year: movie.year,
              error: err instanceof Error ? err.message : String(err),
            });
            totalSkipped++;
          }
        }),
      );

      if (pendingUpdates.length === 0) continue;

      // Phase 2: generate all embeddings in a single API call for this batch
      let embeddings: number[][];
      try {
        embeddings = await createEmbeddings(
          config.openaiApiKey,
          pendingUpdates.map((u) => u.embeddingText),
        );
      } catch (err) {
        logger.warn('Failed to generate embeddings for batch — skipping all', {
          batch: batchNum,
          count: pendingUpdates.length,
          error: err instanceof Error ? err.message : String(err),
        });
        totalSkipped += pendingUpdates.length;
        continue;
      }

      // Phase 3: write results to DB in parallel
      await Promise.all(
        pendingUpdates.map(async (update, idx) => {
          const embedding = embeddings[idx];
          if (!embedding) {
            logger.warn('Missing embedding for movie — skipping', {
              name: update.movie.name,
              year: update.movie.year,
            });
            totalSkipped++;
            return;
          }

          try {
            await updateMovie(
              update.movie.id,
              update.runtime,
              update.ageRating,
              update.tmdbId,
              update.matchConfidence,
              update.posterUrl,
              update.localizedName,
              embedding,
            );

            logger.info('Movie backfilled successfully', {
              id: update.movie.id,
              name: update.movie.name,
              year: update.movie.year,
              tmdbId: update.tmdbId,
              matchConfidence: update.matchConfidence,
              runtime: update.runtime,
              ageRating: update.ageRating,
              hasPoster: Boolean(update.posterUrl),
              hasLocalizedName: Boolean(update.localizedName),
            });
            totalUpdated++;
          } catch (err) {
            logger.warn('Failed to update movie in database — skipping', {
              id: update.movie.id,
              name: update.movie.name,
              year: update.movie.year,
              error: err instanceof Error ? err.message : String(err),
            });
            totalSkipped++;
          }
        }),
      );
    }
  } finally {
    await closeDatabase();
  }

  if (config.dryRun) {
    logger.info('Dry-run complete', {
      totalProcessed,
      totalWouldUpdate,
      totalSkipped,
    });
  } else {
    logger.info('Backfill complete', {
      totalProcessed,
      totalUpdated,
      totalSkipped,
    });
  }
}

main().catch((err) => {
  logger.error('Fatal error', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
