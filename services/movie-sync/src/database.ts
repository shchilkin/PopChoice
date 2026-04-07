/**
 * Database operations for movie-sync service.
 * Uses pg (node-postgres) with direct SQL queries.
 */

import pg from 'pg';

import { logger } from './logger.js';

const { Pool } = pg;

export interface MovieRecord {
  name: string;
  year: number;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  embedding: number[];
}

let pool: InstanceType<typeof Pool> | null = null;

export function initDatabase(databaseUrl: string): void {
  pool = new Pool({ connectionString: databaseUrl });
}

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    throw new Error('Database pool not initialized — call initDatabase() first');
  }
  return pool;
}

function getMovieKey(name: string, year: number): string {
  return `${name}\u0000${year}`;
}

async function getExistingMovieKeys(movies: MovieRecord[]): Promise<Set<string>> {
  const existingKeys = new Set<string>();

  if (movies.length === 0) {
    return existingKeys;
  }

  const batchSize = 100;

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const names = [...new Set(batch.map((movie) => movie.name))];
    const years = [...new Set(batch.map((movie) => movie.year))];

    const result = await getPool().query<{ name: string; year: number }>(
      'SELECT name, year FROM movies WHERE name = ANY($1) AND year = ANY($2)',
      [names, years],
    );

    for (const movie of result.rows) {
      existingKeys.add(getMovieKey(movie.name, movie.year));
    }
  }

  return existingKeys;
}

/**
 * Filter out movies that already exist in the database.
 * Returns indices of new (non-duplicate) movies.
 */
export async function filterNewMovies(movies: MovieRecord[]): Promise<number[]> {
  try {
    const existingKeys = await getExistingMovieKeys(movies);
    const newIndices: number[] = [];

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const exists = existingKeys.has(getMovieKey(movie.name, movie.year));

      if (!exists) {
        newIndices.push(i);
      } else {
        logger.debug('Skipping duplicate', { name: movie.name, year: movie.year });
      }
    }

    return newIndices;
  } catch (err) {
    // If batch check fails, assume all are new (will be caught by unique constraint)
    logger.warn('Duplicate check failed, assuming all movies are new', {
      error: err instanceof Error ? err.message : String(err),
      movieCount: movies.length,
    });

    return movies.map((_, index) => index);
  }
}

/**
 * Get count of movies currently in database.
 */
export async function getMovieCount(): Promise<number> {
  const result = await getPool().query<{ count: string }>('SELECT COUNT(*) AS count FROM movies');
  return parseInt(result.rows[0].count, 10);
}

/**
 * Upsert movie records into the database in batches.
 * Uses ON CONFLICT to handle duplicate (name, year) entries idempotently.
 */
export async function insertMovies(
  movies: MovieRecord[],
  batchSize: number = 50,
): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);

    try {
      let inserted = 0;
      for (const movie of batch) {
        const result = await getPool().query<{ id: number }>(
          `INSERT INTO movies (name, year, age_rating, description, duration, score_rating, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (name, year) DO NOTHING
           RETURNING id`,
          [
            movie.name,
            movie.year,
            movie.age_rating,
            movie.description,
            movie.duration,
            movie.score_rating,
            JSON.stringify(movie.embedding),
          ],
        );
        inserted += result.rowCount ?? 0;
      }

      success += inserted;

      logger.info('Batch upserted', {
        batch: Math.floor(i / batchSize) + 1,
        inserted,
        total: movies.length,
      });
    } catch (batchErr) {
      logger.warn('Batch upsert failed, falling back to individual upserts', {
        batch: Math.floor(i / batchSize) + 1,
        error: batchErr instanceof Error ? batchErr.message : String(batchErr),
      });
      // Fallback: upsert one by one to isolate failures
      for (const movie of batch) {
        try {
          const result = await getPool().query<{ id: number }>(
            `INSERT INTO movies (name, year, age_rating, description, duration, score_rating, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (name, year) DO NOTHING
             RETURNING id`,
            [
              movie.name,
              movie.year,
              movie.age_rating,
              movie.description,
              movie.duration,
              movie.score_rating,
              JSON.stringify(movie.embedding),
            ],
          );
          success += result.rowCount ?? 0;
        } catch (singleErr) {
          errors++;
          logger.warn('Failed to upsert movie', {
            name: movie.name,
            year: movie.year,
            error: singleErr instanceof Error ? singleErr.message : String(singleErr),
          });
        }
      }
    }
  }

  return { success, errors };
}
