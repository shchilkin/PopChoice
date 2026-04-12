/**
 * Movie Backfill Service — Entry Point
 *
 * Queries the database for movies with duration = 0 and backfills them
 * by fetching runtime, age rating, and details from TMDB, then re-generates
 * embeddings and updates the database rows.
 *
 * Environment variables:
 *   TMDB_API_KEY    — TMDB API read access token (required)
 *   OPENAI_API_KEY  — OpenAI API key (required)
 *   DATABASE_URL    — PostgreSQL connection string (required)
 *   DRY_RUN         — Set to "true" to skip DB writes (default: false)
 *   BATCH_SIZE      — Number of parallel TMDB detail requests (default: 5)
 *   MAX_MOVIES      — Max movies to process; 0 = all (default: 0)
 */

import { loadConfig } from './config.js';
import { closeDatabase, getIncompleteMovies, initDatabase, updateMovie } from './database.js';
import { createEmbeddings, createOpenAIClient } from './embeddings.js';
import { logger } from './logger.js';
import {
  extractUSCertification,
  fetchMovieDetails,
  movieToEmbeddingText,
  searchMovie,
} from './tmdb.js';

async function main(): Promise<void> {
  const config = loadConfig();

  logger.info('Movie backfill service starting', {
    dryRun: config.dryRun,
    batchSize: config.batchSize,
    maxMovies: config.maxMovies === 0 ? 'unlimited' : config.maxMovies,
  });

  initDatabase(config.databaseUrl);

  // Create a single OpenAI client to reuse across all embedding calls
  const openaiClient = createOpenAIClient(config.openaiApiKey);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalWouldUpdate = 0;
  let totalSkipped = 0;

  try {
    const movies = await getIncompleteMovies(config.maxMovies);
    logger.info('Fetched incomplete movies from database', { count: movies.length });

    if (movies.length === 0) {
      logger.info('No movies with missing duration found — nothing to do');
      return;
    }

    // Process in batches to limit concurrent TMDB requests
    for (let i = 0; i < movies.length; i += config.batchSize) {
      const batch = movies.slice(i, i + config.batchSize);
      const batchNum = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(movies.length / config.batchSize);

      logger.info('Processing batch', { batch: batchNum, totalBatches, size: batch.length });

      await Promise.all(
        batch.map(async (movie) => {
          totalProcessed++;
          try {
            // 1. Search TMDB by title + year to get TMDB ID
            const tmdbId = await searchMovie(config.tmdbApiKey, movie.name, movie.year);
            if (tmdbId === null) {
              logger.warn('Movie not found on TMDB — skipping', {
                name: movie.name,
                year: movie.year,
              });
              totalSkipped++;
              return;
            }

            // 2. Fetch full movie details
            const details = await fetchMovieDetails(config.tmdbApiKey, tmdbId);
            if (!details) {
              logger.warn('Failed to fetch movie details from TMDB — skipping', {
                name: movie.name,
                year: movie.year,
                tmdbId,
              });
              totalSkipped++;
              return;
            }

            // 3. Extract runtime — skip if not available
            const runtime = details.runtime;
            if (!runtime || runtime === 0) {
              logger.warn('TMDB returned no runtime for movie — skipping', {
                name: movie.name,
                year: movie.year,
                tmdbId,
                runtime,
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

            // 6. Dry run: log and skip
            if (config.dryRun) {
              logger.info('DRY RUN: would update movie', {
                id: movie.id,
                name: movie.name,
                year: movie.year,
                tmdbId,
                runtime,
                ageRating,
              });
              totalWouldUpdate++;
              return;
            }

            // 7. Generate embedding
            const embeddings = await createEmbeddings(openaiClient, [embeddingText]);
            const embedding = embeddings[0];
            if (!embedding) {
              logger.warn('Failed to generate embedding — skipping', {
                name: movie.name,
                year: movie.year,
              });
              totalSkipped++;
              return;
            }

            // 8. Update database
            await updateMovie(movie.id, runtime, ageRating, embedding);

            logger.info('Movie backfilled successfully', {
              id: movie.id,
              name: movie.name,
              year: movie.year,
              tmdbId,
              runtime,
              ageRating,
            });
            totalUpdated++;
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
