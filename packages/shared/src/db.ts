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
  if (pool) return;
  pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true });
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

export function getPool(): InstanceType<typeof Pool> {
  if (!pool) throw new Error('Database pool not initialized — call initDatabase() first');
  return pool;
}

function getMovieKey(name: string, year: number): string {
  return `${name}\u0000${year}`;
}

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

export async function ensureSchema(): Promise<void> {
  await getPool().query('CREATE EXTENSION IF NOT EXISTS vector;');

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS movies (
      id bigserial PRIMARY KEY,
      name text NOT NULL,
      age_rating text NOT NULL,
      description text NOT NULL,
      duration integer NOT NULL,
      score_rating float NOT NULL,
      year int NOT NULL,
      embedding vector(3072),
      UNIQUE(name, year)
    );
  `);

  await getPool().query(`
    CREATE OR REPLACE FUNCTION match_movies (
      query_embedding vector(3072),
      match_threshold float DEFAULT 0.1,
      match_count int DEFAULT 5
    )
    RETURNS TABLE (
      id bigint,
      name text,
      age_rating text,
      description text,
      duration integer,
      score_rating float,
      year int,
      similarity float,
      content text
    )
    LANGUAGE sql STABLE AS $$
      SELECT
        movies.id,
        movies.name,
        movies.age_rating,
        movies.description,
        movies.duration,
        movies.score_rating,
        movies.year,
        1 - (movies.embedding <=> query_embedding) AS similarity,
        format(
          '%s (%s) | %s | Duration: %s min | Rating: %s/10%s%s',
          movies.name,
          movies.year,
          movies.age_rating,
          movies.duration,
          movies.score_rating,
          chr(10),
          movies.description
        ) AS content
      FROM movies
      WHERE movies.embedding IS NOT NULL
        AND 1 - (movies.embedding <=> query_embedding) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    $$;
  `);

  logger.info('Schema ensured');
}

export async function getMovieCount(): Promise<number> {
  const result = await getPool().query<{ count: string }>('SELECT COUNT(*) AS count FROM movies');
  return parseInt(result.rows[0].count, 10);
}

export async function insertMovies(
  movies: MovieRecord[],
  batchSize: number = 50,
): Promise<{ success: number; errors: number }> {
  let success = 0;
  let errors = 0;

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      const result = await getPool().query<{ id: number }>(
        `INSERT INTO movies (name, year, age_rating, description, duration, score_rating, embedding)
         SELECT n, y, ar, d, du, sr, e::vector
         FROM unnest($1::text[], $2::int[], $3::text[], $4::text[], $5::int[], $6::float8[], $7::text[])
           AS t(n, y, ar, d, du, sr, e)
         ON CONFLICT (name, year) DO NOTHING
         RETURNING id`,
        [
          batch.map((m) => m.name),
          batch.map((m) => m.year),
          batch.map((m) => m.age_rating),
          batch.map((m) => m.description),
          batch.map((m) => m.duration),
          batch.map((m) => m.score_rating),
          batch.map((m) => JSON.stringify(m.embedding)),
        ],
      );
      success += result.rowCount ?? 0;
      logger.info('Batch inserted', {
        batch: batchNum,
        inserted: result.rowCount ?? 0,
        total: movies.length,
      });
    } catch (batchErr) {
      logger.warn('Batch insert failed, falling back to individual inserts', {
        batch: batchNum,
        error: batchErr instanceof Error ? batchErr.message : String(batchErr),
      });
      for (const movie of batch) {
        try {
          const result = await getPool().query<{ id: number }>(
            `INSERT INTO movies (name, year, age_rating, description, duration, score_rating, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
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
          logger.warn('Failed to insert movie', {
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
