import { logger } from '../logger.js';

import { getPool } from './pool.js';
import { getMovieKey } from './utils.js';

import type { MovieRecord } from './types.js';

async function getExistingMovieKeys(movies: MovieRecord[]): Promise<Set<string>> {
  const existingKeys = new Set<string>();
  if (movies.length === 0) return existingKeys;

  const batchSize = 100;
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const seenBatchKeys = new Set<string>();
    const uniqueBatch: MovieRecord[] = [];

    for (const movie of batch) {
      const key = getMovieKey(movie.name, movie.year);
      if (!seenBatchKeys.has(key)) {
        seenBatchKeys.add(key);
        uniqueBatch.push(movie);
      }
    }

    const result = await getPool().query<{ name: string; year: number }>(
      `SELECT m.name, m.year
       FROM movies m
       INNER JOIN unnest($1::text[], $2::int[]) AS t(n, y)
         ON m.name = t.n AND m.year = t.y`,
      [uniqueBatch.map((m) => m.name), uniqueBatch.map((m) => m.year)],
    );

    for (const row of result.rows) existingKeys.add(getMovieKey(row.name, row.year));
  }

  return existingKeys;
}

export async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await getPool().query(
    'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
    [tableName],
  );
  return result.rows[0].exists;
}

export async function filterNewMovies(movies: MovieRecord[]): Promise<number[]> {
  try {
    const existingKeys = await getExistingMovieKeys(movies);
    const newIndices: number[] = [];
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      if (existingKeys.has(getMovieKey(movie.name, movie.year))) {
        logger.debug('Skipping duplicate', { name: movie.name, year: movie.year });
      } else {
        newIndices.push(i);
      }
    }
    return newIndices;
  } catch (err) {
    logger.warn('Duplicate check failed, assuming all movies are new', {
      error: err instanceof Error ? err.message : String(err),
      movieCount: movies.length,
    });
    return movies.map((_, i) => i);
  }
}
