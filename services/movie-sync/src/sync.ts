/**
 * Main sync orchestration: fetch → deduplicate → embed → insert.
 */

import { filterNewMovies, getMovieCount, insertMovies } from './database.js';
import { createEmbeddings } from './embeddings.js';
import { logger } from './logger.js';
import { readMoviesFile } from './movies-file.js';

import type { Config } from './config.js';
import type { MovieRecord } from './database.js';

/**
 * Convert a MovieRecord to a text description suitable for embedding.
 */
function movieToEmbeddingText(movie: Omit<MovieRecord, 'embedding'>): string {
  return [
    `${movie.name} (${movie.year})`,
    `Rating: ${movie.age_rating}`,
    `Duration: ${movie.duration} min`,
    `Score: ${movie.score_rating.toFixed(1)}/10`,
    `Description: ${movie.description}`,
  ].join('\n');
}

/**
 * Run a single sync cycle:
 * 1. Read movies from movies.txt
 * 2. De-duplicate against database
 * 3. Create embeddings for new movies
 * 4. Insert into database
 */
export async function runSync(config: Config): Promise<void> {
  const startTime = Date.now();

  logger.info('Sync started', { dryRun: config.dryRun });

  const countBefore = await getMovieCount();
  logger.info('Current database state', { movieCount: countBefore });

  // 1. Read movies from movies.txt
  const partialRecords = readMoviesFile(config.moviesFilePath);
  logger.info('Read movies from file', {
    count: partialRecords.length,
    path: config.moviesFilePath,
  });

  if (partialRecords.length === 0) {
    logger.info('No movies found in file, nothing to do');
    return;
  }

  // 2. Build placeholder records (without embeddings) for duplicate check
  const recordsForCheck: MovieRecord[] = partialRecords.map((r) => ({
    ...r,
    embedding: [],
  }));

  const newIndices = await filterNewMovies(recordsForCheck);
  logger.info('Duplicate check complete', {
    total: partialRecords.length,
    new: newIndices.length,
    duplicates: partialRecords.length - newIndices.length,
  });

  if (newIndices.length === 0) {
    logger.info('All movies already exist in database, nothing to insert');
    return;
  }

  // 3. Dry run — stop before embeddings/inserts
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

  // 4. Create embeddings only for new movies
  const newMovies = newIndices.map((i) => partialRecords[i]);
  const texts = newMovies.map(movieToEmbeddingText);
  const embeddings = await createEmbeddings(config.openaiApiKey, texts);

  // 5. Build final records with embeddings
  const finalRecords: MovieRecord[] = newIndices.map((originalIdx, arrIdx) => ({
    ...partialRecords[originalIdx],
    embedding: embeddings[arrIdx],
  }));

  // 6. Insert into database
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
