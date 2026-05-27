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
  poster_url?: string | null;
  localized_name?: string | null;
  tmdb_id?: number | null;
  tmdb_match_confidence?: number | null;
  tmdb_match_source?: 'tmdb_discovery' | 'backfill_auto' | 'manual' | null;
  tmdb_metadata?: Record<string, unknown>;
  tmdb_metadata_refreshed_at?: string | Date | null;
  embedding: number[];
}

export type CatalogMetadataSource = 'tmdb' | 'manual';
export type MoviePersonRole = 'cast' | 'director';

export interface CatalogPersonRecord {
  id: string;
  tmdb_id: number | null;
  name: string;
  profile_path: string | null;
  popularity: number | null;
  raw_metadata: Record<string, unknown>;
}

export interface CatalogGenreRecord {
  id: string;
  tmdb_id: number | null;
  name: string;
  raw_metadata: Record<string, unknown>;
}

export interface CatalogKeywordRecord {
  id: string;
  tmdb_id: number | null;
  name: string;
  raw_metadata: Record<string, unknown>;
}

export interface MoviePersonCreditRecord {
  id: string;
  movie_id: string;
  person_id: string;
  tmdb_credit_id: string | null;
  role: MoviePersonRole;
  character_name: string | null;
  job: string | null;
  department: string | null;
  billing_order: number | null;
  raw_metadata: Record<string, unknown>;
}

export interface CatalogPersonInput {
  tmdbId: number;
  name: string;
  profilePath?: string | null;
  popularity?: number | null;
  rawMetadata?: Record<string, unknown>;
}

export interface CatalogGenreInput {
  tmdbId: number;
  name: string;
  rawMetadata?: Record<string, unknown>;
}

export interface CatalogKeywordInput {
  tmdbId: number;
  name: string;
  rawMetadata?: Record<string, unknown>;
}

export interface MoviePersonCreditInput extends CatalogPersonInput {
  creditId: string;
  role: MoviePersonRole;
  characterName?: string | null;
  job?: string | null;
  department?: string | null;
  billingOrder?: number | null;
}

export interface MovieCatalogMetadataInput {
  movieId: string | number;
  tmdbMetadata?: Record<string, unknown>;
  people?: MoviePersonCreditInput[];
  genres?: CatalogGenreInput[];
  keywords?: CatalogKeywordInput[];
  source?: CatalogMetadataSource;
}

export interface InsertedMovieRecord {
  id: string;
  tmdb_id: number | null;
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
      poster_url text,
      localized_name text,
      tmdb_id bigint,
      tmdb_match_confidence float,
      tmdb_match_source text,
      tmdb_matched_at timestamptz,
      embedding vector(3072),
      UNIQUE(name, year)
    );
  `);

  await getPool().query(`
    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS poster_url text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS localized_name text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_id bigint;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_match_confidence float;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_match_source text;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_matched_at timestamptz;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

    ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS tmdb_metadata_refreshed_at timestamptz;

    ALTER TABLE movies
      DROP CONSTRAINT IF EXISTS movies_tmdb_match_source_check;

    ALTER TABLE movies
      ADD CONSTRAINT movies_tmdb_match_source_check
      CHECK (tmdb_match_source IS NULL OR tmdb_match_source IN ('tmdb_discovery', 'backfill_auto', 'manual'));

    CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_id_unique
      ON movies (tmdb_id)
      WHERE tmdb_id IS NOT NULL;
  `);

  await ensureCatalogMetadataSchema();

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS tmdb_match_reviews (
      id bigserial PRIMARY KEY,
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      movie_name text NOT NULL,
      movie_year int NOT NULL,
      reason text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmdb_match_reviews_reason_check CHECK (
        reason IN ('ambiguous_match', 'runtime_mismatch')
      ),
      CONSTRAINT tmdb_match_reviews_status_check CHECK (
        status IN ('open', 'resolved', 'ignored', 'deferred')
      )
    );

    ALTER TABLE tmdb_match_reviews
      DROP CONSTRAINT IF EXISTS tmdb_match_reviews_status_check;

    ALTER TABLE tmdb_match_reviews
      ADD CONSTRAINT tmdb_match_reviews_status_check CHECK (
        status IN ('open', 'resolved', 'ignored', 'deferred')
      );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tmdb_match_reviews_movie_reason
      ON tmdb_match_reviews (movie_id, reason);

    CREATE INDEX IF NOT EXISTS idx_tmdb_match_reviews_status_updated_at
      ON tmdb_match_reviews (status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS tmdb_match_review_audit (
      id bigserial PRIMARY KEY,
      review_id bigint NOT NULL REFERENCES tmdb_match_reviews(id) ON DELETE CASCADE,
      action text NOT NULL,
      actor text NOT NULL,
      note text,
      previous_status text,
      new_status text NOT NULL,
      candidate jsonb,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmdb_match_review_audit_action_check CHECK (
        action IN ('apply_candidate', 'reject', 'defer', 'reopen')
      ),
      CONSTRAINT tmdb_match_review_audit_status_check CHECK (
        new_status IN ('open', 'resolved', 'ignored', 'deferred')
        AND (previous_status IS NULL OR previous_status IN ('open', 'resolved', 'ignored', 'deferred'))
      )
    );

    CREATE INDEX IF NOT EXISTS idx_tmdb_match_review_audit_review_created_at
      ON tmdb_match_review_audit (review_id, created_at DESC);
  `);

  await getPool().query(`
    DROP FUNCTION IF EXISTS match_movies(vector, float, int);

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
      tmdb_id bigint,
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
        movies.tmdb_id,
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

export async function ensureCatalogMetadataSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS catalog_people (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      name text NOT NULL,
      profile_path text,
      popularity float,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE catalog_people
      ALTER COLUMN tmdb_id TYPE int USING tmdb_id::int;

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_people_tmdb_id_unique
      ON catalog_people (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_people_name_lower
      ON catalog_people (lower(name));

    CREATE TABLE IF NOT EXISTS catalog_genres (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      name text NOT NULL,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_genres_tmdb_id_unique
      ON catalog_genres (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_genres_name_lower
      ON catalog_genres (lower(name));

    CREATE TABLE IF NOT EXISTS catalog_keywords (
      id bigserial PRIMARY KEY,
      tmdb_id int,
      name text NOT NULL,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE catalog_keywords
      ALTER COLUMN tmdb_id TYPE int USING tmdb_id::int;

    CREATE UNIQUE INDEX IF NOT EXISTS catalog_keywords_tmdb_id_unique
      ON catalog_keywords (tmdb_id)
      WHERE tmdb_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_catalog_keywords_name_lower
      ON catalog_keywords (lower(name));

    CREATE TABLE IF NOT EXISTS movie_people (
      id bigserial PRIMARY KEY,
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      person_id bigint NOT NULL REFERENCES catalog_people(id) ON DELETE CASCADE,
      tmdb_credit_id text,
      role text NOT NULL,
      character_name text,
      job text,
      department text,
      billing_order int,
      raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_people_role_check CHECK (role IN ('cast', 'director'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS movie_people_tmdb_credit_unique
      ON movie_people (movie_id, tmdb_credit_id)
      WHERE tmdb_credit_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_movie_people_movie_role_order
      ON movie_people (movie_id, role, billing_order NULLS LAST);

    CREATE INDEX IF NOT EXISTS idx_movie_people_person_role
      ON movie_people (person_id, role);

    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      genre_id bigint NOT NULL REFERENCES catalog_genres(id) ON DELETE CASCADE,
      source text NOT NULL DEFAULT 'tmdb',
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_genres_source_check CHECK (source IN ('tmdb', 'manual')),
      PRIMARY KEY (movie_id, genre_id)
    );

    ALTER TABLE movie_genres
      DROP CONSTRAINT IF EXISTS movie_genres_source_check;

    ALTER TABLE movie_genres
      ADD CONSTRAINT movie_genres_source_check CHECK (source IN ('tmdb', 'manual'));

    CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id
      ON movie_genres (genre_id);

    CREATE TABLE IF NOT EXISTS movie_keywords (
      movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      keyword_id bigint NOT NULL REFERENCES catalog_keywords(id) ON DELETE CASCADE,
      source text NOT NULL DEFAULT 'tmdb',
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT movie_keywords_source_check CHECK (source IN ('tmdb', 'manual')),
      PRIMARY KEY (movie_id, keyword_id)
    );

    ALTER TABLE movie_keywords
      DROP CONSTRAINT IF EXISTS movie_keywords_source_check;

    ALTER TABLE movie_keywords
      ADD CONSTRAINT movie_keywords_source_check CHECK (source IN ('tmdb', 'manual'));

    CREATE INDEX IF NOT EXISTS idx_movie_keywords_keyword_id
      ON movie_keywords (keyword_id);
  `);
}

export async function getMovieCount(): Promise<number> {
  const result = await getPool().query<{ count: string }>('SELECT COUNT(*) AS count FROM movies');
  return parseInt(result.rows[0].count, 10);
}

export async function upsertMovieCatalogMetadata(input: MovieCatalogMetadataInput): Promise<void> {
  const client = await getPool().connect();
  const movieId = String(input.movieId);
  const source = input.source ?? 'tmdb';
  const shouldRefreshPeople = input.people !== undefined;
  const shouldRefreshGenres = input.genres !== undefined;
  const shouldRefreshKeywords = input.keywords !== undefined;
  const people = input.people ?? [];
  const genres = input.genres ?? [];
  const keywords = input.keywords ?? [];

  try {
    await client.query('BEGIN');

    if (input.tmdbMetadata) {
      await client.query(
        `UPDATE movies
            SET tmdb_metadata = $2::jsonb,
                tmdb_metadata_refreshed_at = now()
          WHERE id = $1`,
        [movieId, JSON.stringify(input.tmdbMetadata)],
      );
    }

    if (shouldRefreshPeople) {
      await client.query(
        `DELETE FROM movie_people
          WHERE movie_id = $1
            AND tmdb_credit_id IS NOT NULL`,
        [movieId],
      );
    }
    if (shouldRefreshGenres) {
      await client.query(`DELETE FROM movie_genres WHERE movie_id = $1 AND source = $2`, [
        movieId,
        source,
      ]);
    }
    if (shouldRefreshKeywords) {
      await client.query(`DELETE FROM movie_keywords WHERE movie_id = $1 AND source = $2`, [
        movieId,
        source,
      ]);
    }

    for (const person of shouldRefreshPeople ? people : []) {
      const personResult = await client.query<{ id: string }>(
        `INSERT INTO catalog_people (
           tmdb_id, name, profile_path, popularity, raw_metadata, updated_at
         )
         VALUES ($1, $2, $3, $4, $5::jsonb, now())
         ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
           SET name = EXCLUDED.name,
               profile_path = COALESCE(EXCLUDED.profile_path, catalog_people.profile_path),
               popularity = COALESCE(EXCLUDED.popularity, catalog_people.popularity),
               raw_metadata = EXCLUDED.raw_metadata,
               updated_at = now()
         RETURNING id::text`,
        [
          person.tmdbId,
          person.name,
          person.profilePath ?? null,
          person.popularity ?? null,
          JSON.stringify(person.rawMetadata ?? {}),
        ],
      );
      const personId = personResult.rows[0]?.id;
      if (!personId) continue;

      await client.query(
        `INSERT INTO movie_people (
           movie_id, person_id, tmdb_credit_id, role, character_name, job,
           department, billing_order, raw_metadata, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
         ON CONFLICT (movie_id, tmdb_credit_id) WHERE tmdb_credit_id IS NOT NULL DO UPDATE
           SET person_id = EXCLUDED.person_id,
               role = EXCLUDED.role,
               character_name = EXCLUDED.character_name,
               job = EXCLUDED.job,
               department = EXCLUDED.department,
               billing_order = EXCLUDED.billing_order,
               raw_metadata = EXCLUDED.raw_metadata,
               updated_at = now()`,
        [
          movieId,
          personId,
          person.creditId,
          person.role,
          person.characterName ?? null,
          person.job ?? null,
          person.department ?? null,
          person.billingOrder ?? null,
          JSON.stringify(person.rawMetadata ?? {}),
        ],
      );
    }

    for (const genre of shouldRefreshGenres ? genres : []) {
      const genreResult = await client.query<{ id: string }>(
        `INSERT INTO catalog_genres (tmdb_id, name, raw_metadata, updated_at)
         VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
           SET name = EXCLUDED.name,
               raw_metadata = EXCLUDED.raw_metadata,
               updated_at = now()
         RETURNING id::text`,
        [genre.tmdbId, genre.name, JSON.stringify(genre.rawMetadata ?? {})],
      );
      const genreId = genreResult.rows[0]?.id;
      if (!genreId) continue;

      await client.query(
        `INSERT INTO movie_genres (movie_id, genre_id, source)
         VALUES ($1, $2, $3)
         ON CONFLICT (movie_id, genre_id) DO UPDATE
           SET source = EXCLUDED.source`,
        [movieId, genreId, source],
      );
    }

    for (const keyword of shouldRefreshKeywords ? keywords : []) {
      const keywordResult = await client.query<{ id: string }>(
        `INSERT INTO catalog_keywords (tmdb_id, name, raw_metadata, updated_at)
         VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (tmdb_id) WHERE tmdb_id IS NOT NULL DO UPDATE
           SET name = EXCLUDED.name,
               raw_metadata = EXCLUDED.raw_metadata,
               updated_at = now()
         RETURNING id::text`,
        [keyword.tmdbId, keyword.name, JSON.stringify(keyword.rawMetadata ?? {})],
      );
      const keywordId = keywordResult.rows[0]?.id;
      if (!keywordId) continue;

      await client.query(
        `INSERT INTO movie_keywords (movie_id, keyword_id, source)
         VALUES ($1, $2, $3)
         ON CONFLICT (movie_id, keyword_id) DO UPDATE
           SET source = EXCLUDED.source`,
        [movieId, keywordId, source],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function insertMovies(
  movies: MovieRecord[],
  batchSize: number = 50,
): Promise<{ success: number; errors: number; insertedMovies: InsertedMovieRecord[] }> {
  let success = 0;
  let errors = 0;
  const insertedMovies: InsertedMovieRecord[] = [];

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      const result = await getPool().query<InsertedMovieRecord>(
        `INSERT INTO movies (
           name, year, age_rating, description, duration, score_rating,
           poster_url, localized_name, tmdb_id, tmdb_match_confidence,
           tmdb_match_source, tmdb_matched_at, embedding
         )
         SELECT n, y, ar, d, du, sr, poster, localized, tid, conf, src,
                CASE WHEN tid IS NULL THEN NULL ELSE now() END, e::vector
         FROM unnest(
           $1::text[], $2::int[], $3::text[], $4::text[], $5::int[], $6::float8[],
           $7::text[], $8::text[], $9::bigint[], $10::float8[], $11::text[], $12::text[]
         ) AS t(n, y, ar, d, du, sr, poster, localized, tid, conf, src, e)
         ON CONFLICT (name, year) DO NOTHING
         RETURNING id::text, tmdb_id`,
        [
          batch.map((m) => m.name),
          batch.map((m) => m.year),
          batch.map((m) => m.age_rating),
          batch.map((m) => m.description),
          batch.map((m) => m.duration),
          batch.map((m) => m.score_rating),
          batch.map((m) => m.poster_url ?? null),
          batch.map((m) => m.localized_name ?? null),
          batch.map((m) => m.tmdb_id ?? null),
          batch.map((m) => m.tmdb_match_confidence ?? null),
          batch.map((m) => m.tmdb_match_source ?? null),
          batch.map((m) => JSON.stringify(m.embedding)),
        ],
      );
      success += result.rowCount ?? 0;
      insertedMovies.push(
        ...result.rows.map((row) => ({
          id: String(row.id),
          tmdb_id: row.tmdb_id === null ? null : Number(row.tmdb_id),
        })),
      );
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
          const result = await getPool().query<InsertedMovieRecord>(
            `INSERT INTO movies (
               name, year, age_rating, description, duration, score_rating,
               poster_url, localized_name, tmdb_id, tmdb_match_confidence,
               tmdb_match_source, tmdb_matched_at, embedding
             )
             VALUES (
               $1, $2, $3, $4, $5, $6, $7::text, $8::text, $9::bigint,
               $10::float8, $11::text, CASE WHEN $9 IS NULL THEN NULL ELSE now() END,
               $12::vector
             )
             ON CONFLICT (name, year) DO NOTHING
             RETURNING id::text, tmdb_id`,
            [
              movie.name,
              movie.year,
              movie.age_rating,
              movie.description,
              movie.duration,
              movie.score_rating,
              movie.poster_url ?? null,
              movie.localized_name ?? null,
              movie.tmdb_id ?? null,
              movie.tmdb_match_confidence ?? null,
              movie.tmdb_match_source ?? null,
              JSON.stringify(movie.embedding),
            ],
          );
          success += result.rowCount ?? 0;
          insertedMovies.push(
            ...result.rows.map((row) => ({
              id: String(row.id),
              tmdb_id: row.tmdb_id === null ? null : Number(row.tmdb_id),
            })),
          );
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

  return { success, errors, insertedMovies };
}
