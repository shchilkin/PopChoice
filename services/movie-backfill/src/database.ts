/**
 * Database operations for movie-backfill service.
 * Uses pg (node-postgres) with direct SQL queries.
 */

import pg from 'pg';

import { logger } from './logger.js';

const { Pool } = pg;

export interface IncompleteMovie {
  id: number;
  name: string;
  year: number;
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
      ? 'SELECT id, name, year FROM movies WHERE duration = 0 ORDER BY id LIMIT $1'
      : 'SELECT id, name, year FROM movies WHERE duration = 0 ORDER BY id';

  const params = limit > 0 ? [limit] : [];
  const result = await getPool().query<{ id: string; name: string; year: number }>(query, params);

  // id is bigserial — parse to JS number
  return result.rows.map((row) => ({
    id: parseInt(row.id, 10),
    name: row.name,
    year: row.year,
  }));
}

/**
 * Update a movie's duration, age_rating, and embedding.
 */
export async function updateMovie(
  id: number,
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
