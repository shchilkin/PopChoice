/**
 * Main sync orchestration: fetch → deduplicate → embed → insert.
 */

import { filterNewMovies, getMovieCount, initDatabase, insertMovies } from './database.js';
import { createEmbeddings } from './embeddings.js';
import { logger } from './logger.js';
import { estimateAgeRating, fetchTMDBMovies, movieToEmbeddingText } from './tmdb.js';

import type { Config } from './config.js';
import type { MovieRecord } from './database.js';
import type { TMDBMovie } from './tmdb.js';

/**
 * Convert a TMDB movie to a partial MovieRecord (without embedding).
 */
function tmdbToMovieRecord(movie: TMDBMovie): Omit<MovieRecord, 'embedding'> {
  const year = movie.release_date ? parseInt(movie.release_date.substring(0, 4), 10) : 0; // 0 = unknown year sentinel

  return {
    name: movie.title,
    year,
    age_rating: estimateAgeRating(movie),
    description: movie.overview || 'No description available.',
    duration: 0, // TMDB discover doesn't return runtime; set to 0
    score_rating: movie.vote_average,
  };
}

/**
 * Run a single sync cycle:
 * 1. Fetch movies from TMDB
 * 2. De-duplicate against database
 * 3. Create embeddings for new movies
 * 4. Insert into database
 */
export async function runSync(config: Config): Promise<void> {
  const startTime = Date.now();

  logger.info('Sync started', { dryRun: config.dryRun });

  // 1. Initialize database connection
  initDatabase(config.databaseUrl);

  const countBefore = await getMovieCount();
  logger.info('Current database state', { movieCount: countBefore });

  // 2. Fetch movies from TMDB
  const tmdbMovies = await fetchTMDBMovies(config.tmdbApiKey);
  logger.info('Fetched movies from TMDB', { count: tmdbMovies.length });

  if (tmdbMovies.length === 0) {
    logger.info('No movies fetched, nothing to do');
    return;
  }

  // 3. Build partial records (without embeddings) for duplicate check
  const partialRecords = tmdbMovies.map(tmdbToMovieRecord);

  // Use placeholder embeddings for the duplicate check
  const recordsForCheck: MovieRecord[] = partialRecords.map((r) => ({
    ...r,
    embedding: [],
  }));

  const newIndices = await filterNewMovies(recordsForCheck);
  logger.info('Duplicate check complete', {
    total: tmdbMovies.length,
    new: newIndices.length,
    duplicates: tmdbMovies.length - newIndices.length,
  });

  if (newIndices.length === 0) {
    logger.info('All movies already exist in database, nothing to insert');
    return;
  }

  // 4. Dry run — stop before embeddings/inserts
  if (config.dryRun) {
    logger.info('DRY RUN: would create embeddings and insert', {
      moviesToInsert: newIndices.length,
      sampleMovies: newIndices.slice(0, 5).map((i) => ({
        name: partialRecords[i].name,
        year: partialRecords[i].year,
      })),
    });
    return;
  }

  // 5. Create embeddings only for new movies
  const newMovies = newIndices.map((i) => tmdbMovies[i]);
  const texts = newMovies.map(movieToEmbeddingText);
  const embeddings = await createEmbeddings(config.openaiApiKey, texts);

  // 6. Build final records with embeddings
  const finalRecords: MovieRecord[] = newIndices.map((originalIdx, arrIdx) => ({
    ...partialRecords[originalIdx],
    embedding: embeddings[arrIdx],
  }));

  // 7. Insert into database
  const result = await insertMovies(finalRecords);

  const countAfter = await getMovieCount();
  const durationMs = Date.now() - startTime;

  logger.info('Sync complete', {
    inserted: result.success,
    errors: result.errors,
    movieCountBefore: countBefore,
    movieCountAfter: countAfter,
    durationMs,
  });
}
