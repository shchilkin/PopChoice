/**
 * Database helper functions for the recommendations feature.
 *
 * Uses the pg Pool directly to support complex queries (JOINs, upserts)
 * that go beyond the chainable query-builder abstraction in pgClient.ts.
 */

import pg from 'pg';

import logger from '@/lib/logger';

import type { PersonFormData } from '@/app/api/movie-recommendation/types';

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
  error: string | null;
  movies: RecommendationMovie[];
  usedBroaderSearch?: boolean;
  dbMovieCount?: number;
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
): Promise<string> {
  const pool = getPool();
  const result = await pool.query<{ id: string }>(
    `INSERT INTO recommendations (status, quiz_data) VALUES ('pending', $1) RETURNING id`,
    [JSON.stringify(quizData)],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error('Failed to create recommendation row');
  return id;
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
  await pool.query(
    `UPDATE recommendations SET status = $1, error = $2, completed_at = $3 WHERE id = $4`,
    [status, error ?? null, completedAt, id],
  );
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
          from_tmdb, tmdb_name, tmdb_year, tmdb_score_rating, tmdb_duration, tmdb_age_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
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
  id: string,
): Promise<RecommendationWithMovies | null> {
  const pool = getPool();

  // Fetch the recommendation row
  const recResult = await pool.query<{
    status: RecommendationStatus;
    error: string | null;
    used_broader_search: boolean | null;
    db_movie_count: number | null;
  }>(
    `SELECT status, error, used_broader_search, db_movie_count FROM recommendations WHERE id = $1`,
    [id],
  );

  const rec = recResult.rows[0];
  if (!rec) return null;

  if (rec.status !== 'completed') {
    return {
      status: rec.status,
      error: rec.error,
      movies: [],
      usedBroaderSearch: rec.used_broader_search ?? false,
      dbMovieCount: rec.db_movie_count ?? undefined,
    };
  }

  // Fetch movies joined with local movies table (for non-TMDB movies)
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
    [id],
  );

  const movies: RecommendationMovie[] = moviesResult.rows.map((row) => {
    if (row.from_tmdb) {
      return {
        id: row.rm_id,
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
    error: rec.error,
    movies,
    usedBroaderSearch: rec.used_broader_search ?? false,
    dbMovieCount: rec.db_movie_count ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Logging helper for DB errors
// ---------------------------------------------------------------------------

export function logDbError(context: string, err: unknown): void {
  logger.error({ err }, context);
}
