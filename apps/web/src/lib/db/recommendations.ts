/**
 * Database helper functions for the recommendations feature.
 *
 * Uses the pg Pool directly to support complex queries (JOINs, upserts)
 * that go beyond the chainable query-builder abstraction in pgClient.ts.
 */

import { nanoid } from 'nanoid';
import pg from 'pg';

import {
  buildGroupResultInsights,
  getQuizPeopleCount,
} from '@/features/recommendation/groupResultInsights';
import logger from '@/lib/logger';

import type { RecommendationStage } from '@/features/recommendation/stages';
import type { PersonFormData } from '@/features/recommendation/types';

export type { RecommendationStage };

const { Pool } = pg;

let _pool: InstanceType<typeof Pool> | null = null;

function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Expected env var DATABASE_URL');
    }
    _pool = new Pool({ connectionString, allowExitOnIdle: true });
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecommendationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RecommendationMovie {
  id: number;
  name: string;
  year: number;
  similarity?: number;
  age_rating?: string;
  duration?: number;
  score_rating?: number;
  posterURL?: string;
  aiDescription?: string;
  localizedName?: string;
  isMainRecommendation: boolean;
  fromTMDB: boolean;
}

export interface RecommendationWithMovies {
  status: RecommendationStatus;
  stage: RecommendationStage;
  error: string | null;
  movies: RecommendationMovie[];
  usedBroaderSearch?: boolean;
  dbMovieCount?: number;
  peopleCount?: number;
  groupInsights?: ReturnType<typeof buildGroupResultInsights>;
  morePicksStatus?: string | null;
}

export interface MovieRowToInsert {
  id: number;
  name: string;
  year: number;
  similarity?: number;
  age_rating?: string;
  duration?: number;
  score_rating?: number;
  posterURL?: string;
  aiDescription?: string;
  localizedName?: string;
  isMainRecommendation: boolean;
  fromTMDB: boolean;
}

// ---------------------------------------------------------------------------
// createRecommendation
// ---------------------------------------------------------------------------

export async function createRecommendation(
  quizData: PersonFormData | PersonFormData[],
): Promise<{ id: string; slug: string }> {
  const pool = getPool();
  const slug = nanoid(12);
  const result = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO recommendations (status, stage, quiz_data, slug) VALUES ('pending', 'queued', $1, $2) RETURNING id, slug`,
    [JSON.stringify(quizData), slug],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Failed to create recommendation row');
  return row;
}

// ---------------------------------------------------------------------------
// updateRecommendationStatus
// ---------------------------------------------------------------------------

export async function updateRecommendationStatus(
  id: string,
  status: RecommendationStatus,
  error?: string,
): Promise<void> {
  const pool = getPool();
  const completedAt = status === 'completed' ? new Date() : null;
  const stage: RecommendationStage | null =
    status === 'completed' ? 'complete' : status === 'failed' ? 'failed' : null;
  await pool.query(
    `UPDATE recommendations
        SET status = $1,
            error = $2,
            completed_at = $3,
            stage = COALESCE($4, stage)
      WHERE id = $5`,
    [status, error ?? null, completedAt, stage, id],
  );
}

export async function updateRecommendationStage(
  id: string,
  stage: RecommendationStage,
): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE recommendations SET stage = $1 WHERE id = $2`, [stage, id]);
}

// ---------------------------------------------------------------------------
// insertRecommendationMovies
// ---------------------------------------------------------------------------

export async function insertRecommendationMovies(
  recommendationId: string,
  movies: MovieRowToInsert[],
  usedBroaderSearch: boolean,
  dbMovieCount?: number,
): Promise<void> {
  if (movies.length === 0) return;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Store usedBroaderSearch and dbMovieCount in the recommendations row as metadata
    await client.query(
      `UPDATE recommendations
         SET used_broader_search = $1, db_movie_count = $2
       WHERE id = $3`,
      [usedBroaderSearch, dbMovieCount ?? null, recommendationId],
    );

    for (let i = 0; i < movies.length; i++) {
      const m = movies[i];
      const movieId = !m.fromTMDB && m.id > 0 ? m.id : null;

      await client.query(
        `INSERT INTO recommendation_movies (
          recommendation_id, movie_id, position, is_main_recommendation,
          ai_description, poster_url, localized_name, similarity,
          from_tmdb, tmdb_id, tmdb_name, tmdb_year, tmdb_score_rating, tmdb_duration, tmdb_age_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          recommendationId,
          movieId,
          i,
          m.isMainRecommendation,
          m.aiDescription ?? null,
          m.posterURL ?? null,
          m.localizedName ?? null,
          m.similarity ?? null,
          m.fromTMDB,
          m.fromTMDB ? Math.abs(m.id) : null,
          m.fromTMDB ? m.name : null,
          m.fromTMDB ? m.year : null,
          m.fromTMDB ? (m.score_rating ?? null) : null,
          m.fromTMDB ? (m.duration ?? null) : null,
          m.fromTMDB ? (m.age_rating ?? null) : null,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// getRecommendationWithMovies
// ---------------------------------------------------------------------------

export async function getRecommendationWithMovies(
  slug: string,
): Promise<RecommendationWithMovies | null> {
  const pool = getPool();

  // Fetch the recommendation row by slug (public identifier)
  const recResult = await pool.query<{
    id: string;
    status: RecommendationStatus;
    error: string | null;
    stage: RecommendationStage | null;
    used_broader_search: boolean | null;
    db_movie_count: number | null;
    quiz_data: unknown;
    more_picks_status: string | null;
  }>(
    `SELECT
       id, status, error, stage, used_broader_search, db_movie_count, quiz_data, more_picks_status
       FROM recommendations
      WHERE slug = $1`,
    [slug],
  );

  const rec = recResult.rows[0];
  if (!rec) return null;
  const peopleCount = getQuizPeopleCount(rec.quiz_data);
  const groupInsights = buildGroupResultInsights(rec.quiz_data);

  if (rec.status !== 'completed') {
    return {
      status: rec.status,
      stage: rec.stage ?? 'queued',
      error: rec.error,
      movies: [],
      usedBroaderSearch: rec.used_broader_search ?? false,
      dbMovieCount: rec.db_movie_count ?? undefined,
      peopleCount,
      groupInsights,
      morePicksStatus: rec.more_picks_status ?? null,
    };
  }

  // Fetch movies using the internal UUID
  const moviesResult = await pool.query<{
    rm_id: number;
    movie_id: number | null;
    position: number;
    is_main_recommendation: boolean;
    ai_description: string | null;
    poster_url: string | null;
    localized_name: string | null;
    similarity: number | null;
    from_tmdb: boolean;
    tmdb_id: number | null;
    tmdb_name: string | null;
    tmdb_year: number | null;
    tmdb_score_rating: number | null;
    tmdb_duration: number | null;
    tmdb_age_rating: string | null;
    m_name: string | null;
    m_year: number | null;
    m_age_rating: string | null;
    m_duration: number | null;
    m_score_rating: number | null;
  }>(
    `SELECT
       rm.id            AS rm_id,
       rm.movie_id,
       rm.position,
       rm.is_main_recommendation,
       rm.ai_description,
       rm.poster_url,
       rm.localized_name,
       rm.similarity,
       rm.from_tmdb,
      rm.tmdb_id,
       rm.tmdb_name,
       rm.tmdb_year,
       rm.tmdb_score_rating,
       rm.tmdb_duration,
       rm.tmdb_age_rating,
       m.name           AS m_name,
       m.year           AS m_year,
       m.age_rating     AS m_age_rating,
       m.duration       AS m_duration,
       m.score_rating   AS m_score_rating
     FROM recommendation_movies rm
     LEFT JOIN movies m ON m.id = rm.movie_id
     WHERE rm.recommendation_id = $1
     ORDER BY rm.position ASC`,
    [rec.id],
  );

  const movies: RecommendationMovie[] = moviesResult.rows.map((row) => {
    if (row.from_tmdb) {
      return {
        id: row.tmdb_id ? -row.tmdb_id : row.rm_id,
        name: row.tmdb_name ?? '',
        year: row.tmdb_year ?? 0,
        similarity: row.similarity ?? undefined,
        age_rating: row.tmdb_age_rating ?? undefined,
        duration: row.tmdb_duration ?? undefined,
        score_rating: row.tmdb_score_rating ?? undefined,
        posterURL: row.poster_url ?? undefined,
        aiDescription: row.ai_description ?? undefined,
        localizedName: row.localized_name ?? undefined,
        isMainRecommendation: row.is_main_recommendation,
        fromTMDB: true,
      };
    }
    return {
      id: row.movie_id ?? row.rm_id,
      name: row.m_name ?? '',
      year: row.m_year ?? 0,
      similarity: row.similarity ?? undefined,
      age_rating: row.m_age_rating ?? undefined,
      duration: row.m_duration ?? undefined,
      score_rating: row.m_score_rating ?? undefined,
      posterURL: row.poster_url ?? undefined,
      aiDescription: row.ai_description ?? undefined,
      localizedName: row.localized_name ?? undefined,
      isMainRecommendation: row.is_main_recommendation,
      fromTMDB: false,
    };
  });

  return {
    status: rec.status,
    stage: rec.stage ?? 'complete',
    error: rec.error,
    movies,
    usedBroaderSearch: rec.used_broader_search ?? false,
    dbMovieCount: rec.db_movie_count ?? undefined,
    peopleCount,
    groupInsights,
    morePicksStatus: rec.more_picks_status ?? null,
  };
}

// ---------------------------------------------------------------------------
// Logging helper for DB errors
// ---------------------------------------------------------------------------

export function logDbError(context: string, err: unknown): void {
  logger.error({ err }, context);
}

// ---------------------------------------------------------------------------
// More-picks helpers (async TMDB batch via worker)
// ---------------------------------------------------------------------------

/**
 * Atomically claims the "more picks" slot for a recommendation identified by slug.
 * Succeeds when:
 *   - `more_picks_status IS NULL` (first request), OR
 *   - `more_picks_status = 'failed'` (retry after a failed/timed-out job)
 * and the main job is already `completed`.
 *
 * Returns `{ recommendationId, quizData }` on success, or `null` if already claimed.
 */
export async function claimMorePicksSlot(
  slug: string,
): Promise<{ recommendationId: string; quizData: unknown } | null> {
  const pool = getPool();
  const result = await pool.query<{ id: string; quiz_data: unknown }>(
    `UPDATE recommendations
        SET more_picks_status = 'pending'
      WHERE slug = $1
        AND status = 'completed'
        AND (more_picks_status IS NULL OR more_picks_status = 'failed')
      RETURNING id, quiz_data`,
    [slug],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { recommendationId: row.id, quizData: row.quiz_data };
}

/**
 * Returns TMDB-backed movie IDs in the same negative-ID form used by the client
 * and the more-picks pipeline's `excludeIds` contract.
 */
export async function getRecommendationTMDBExcludeIds(recommendationId: string): Promise<number[]> {
  const pool = getPool();
  const result = await pool.query<{ tmdb_id: number | null }>(
    `SELECT tmdb_id
       FROM recommendation_movies
      WHERE recommendation_id = $1
        AND from_tmdb = true
        AND tmdb_id IS NOT NULL
      ORDER BY position ASC`,
    [recommendationId],
  );

  return result.rows.flatMap((row) => (row.tmdb_id ? [-row.tmdb_id] : []));
}

export async function getRecommendationQuizData(
  recommendationId: string,
): Promise<unknown | undefined> {
  const pool = getPool();
  const result = await pool.query<{ quiz_data: unknown }>(
    `SELECT quiz_data
       FROM recommendations
      WHERE id = $1`,
    [recommendationId],
  );

  return result.rows[0]?.quiz_data;
}

/** Updates the `more_picks_status` column on a recommendation (looked up by internal UUID). */
export async function updateMorePicksStatus(
  recommendationId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE recommendations SET more_picks_status = $1, error = COALESCE($2, error) WHERE id = $3`,
    [status, error ?? null, recommendationId],
  );
}

/**
 * Inserts extra TMDB movies for a recommendation, appending after the existing positions.
 * Does NOT touch `used_broader_search` or `db_movie_count` on the parent row.
 */
export async function insertMorePicksMovies(
  recommendationId: string,
  movies: MovieRowToInsert[],
): Promise<void> {
  if (movies.length === 0) return;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the recommendation row so concurrent more-picks jobs cannot race on
    // MAX(position) — only one transaction can hold this lock at a time.
    await client.query('SELECT id FROM recommendations WHERE id = $1 FOR UPDATE', [
      recommendationId,
    ]);

    const posResult = await client.query<{ max_pos: number | null }>(
      `SELECT MAX(position) AS max_pos FROM recommendation_movies WHERE recommendation_id = $1`,
      [recommendationId],
    );
    const startPosition = (posResult.rows[0]?.max_pos ?? -1) + 1;

    for (let i = 0; i < movies.length; i++) {
      const m = movies[i];
      await client.query(
        `INSERT INTO recommendation_movies (
            recommendation_id, movie_id, position, is_main_recommendation,
            ai_description, poster_url, localized_name, similarity,
            from_tmdb, tmdb_id, tmdb_name, tmdb_year, tmdb_score_rating, tmdb_duration, tmdb_age_rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          recommendationId,
          null, // all more-picks movies are TMDB-only; no local movie_id
          startPosition + i,
          false,
          m.aiDescription ?? null,
          m.posterURL ?? null,
          m.localizedName ?? null,
          m.similarity ?? null,
          true,
          Math.abs(m.id),
          m.name,
          m.year,
          m.score_rating ?? null,
          m.duration ?? null,
          m.age_rating ?? null,
        ],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
