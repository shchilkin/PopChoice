/**
 * Database operations for movie-backfill service.
 * Uses pg (node-postgres) with direct SQL queries.
 */

import pg from 'pg';

import { logger } from './logger.js';

const { Pool } = pg;

export interface IncompleteMovie {
  id: string; // bigserial — kept as string to avoid JS Number.MAX_SAFE_INTEGER precision loss
  name: string;
  year: number;
  score_rating: number;
  description: string;
}

let pool: InstanceType<typeof Pool> | null = null;

export function initDatabase(databaseUrl: string): void {
  if (pool) {
    return;
  }
  pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
}

export async function closeDatabase(): Promise<void> {
  if (!pool) {
    return;
  }
  const currentPool = pool;
  pool = null;
  await currentPool.end();
}

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    throw new Error('Database pool not initialized — call initDatabase() first');
  }
  return pool;
}

/**
 * Fetch movies where duration = 0 (missing runtime).
 * Pass limit = 0 to fetch all.
 */
export async function getIncompleteMovies(limit: number): Promise<IncompleteMovie[]> {
  const query =
    limit > 0
      ? 'SELECT id, name, year, score_rating, description FROM movies WHERE duration = 0 ORDER BY id LIMIT $1'
      : 'SELECT id, name, year, score_rating, description FROM movies WHERE duration = 0 ORDER BY id';

  const params = limit > 0 ? [limit] : [];
  const result = await getPool().query<{
    id: string;
    name: string;
    year: number;
    score_rating: number;
    description: string;
  }>(query, params);

  // id is bigserial — returned as string by pg to avoid JS precision loss
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    year: row.year,
    score_rating: Number(row.score_rating),
    description: row.description,
  }));
}

/**
 * Update a movie's duration, age_rating, and embedding.
 */
export async function updateMovie(
  id: string,
  duration: number,
  ageRating: string,
  embedding: number[],
): Promise<void> {
  await getPool().query(
    `UPDATE movies SET duration = $1, age_rating = $2, embedding = $3::vector WHERE id = $4`,
    [duration, ageRating, JSON.stringify(embedding), id],
  );
  logger.debug('Movie updated in database', { id, duration, ageRating });
}

export interface MovieUpdate {
  id: string;
  duration: number;
  ageRating: string;
  embedding: number[];
}

/**
 * Update multiple movies in a single query using UNNEST.
 */
export async function updateMoviesBatch(updates: MovieUpdate[]): Promise<void> {
  if (updates.length === 0) return;

  const ids = updates.map((u) => u.id);
  const durations = updates.map((u) => u.duration);
  const ageRatings = updates.map((u) => u.ageRating);
  const embeddings = updates.map((u) => JSON.stringify(u.embedding));

  await getPool().query(
    `
    UPDATE movies AS m
    SET
      duration = u.duration,
      age_rating = u.age_rating,
      embedding = u.embedding::vector
    FROM (
      SELECT * FROM UNNEST($1::bigint[], $2::int[], $3::text[], $4::text[])
      AS t(id, duration, age_rating, embedding)
    ) AS u
    WHERE m.id = u.id
    `,
    [ids, durations, ageRatings, embeddings],
  );

  logger.debug('Movies batch updated in database', { count: updates.length });
}
