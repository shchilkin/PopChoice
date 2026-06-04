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
  hasFavoriteActorSignal,
} from '@/features/recommendation/groupResultInsights';
import logger from '@/lib/logger';
import { getMovieIdentityKey } from '@/lib/movieIdentity';

import type { RecommendationStage } from '@/features/recommendation/stages';
import type {
  PersonFormData,
  RecommendationExperienceMode,
  RecommendationSourceStrategy,
} from '@/features/recommendation/types';

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
export type RecommendationFeedbackKind =
  | 'useful'
  | 'already_watched'
  | 'wrong_mood'
  | 'too_obvious'
  | 'too_obscure'
  | 'close';
export type UserMovieInteractionKind =
  | 'watched'
  | 'liked'
  | 'not_interested'
  | 'wrong_mood'
  | 'not_seen';
export type UserRecommendationMemoryKind = UserMovieInteractionKind | 'recently_recommended';
export type RecommendationCandidateSource =
  | 'curated'
  | 'local-cache'
  | 'tmdb-discover'
  | 'tmdb-search'
  | 'memory'
  | 'jit-enriched';

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
  source?: RecommendationCandidateSource;
}

export interface RecommendationWithMovies {
  status: RecommendationStatus;
  stage: RecommendationStage;
  error: string | null;
  movies: RecommendationMovie[];
  usedBroaderSearch?: boolean;
  dbMovieCount?: number;
  experienceMode?: RecommendationExperienceMode | null;
  sourceStrategy?: RecommendationSourceStrategy | null;
  peopleCount?: number;
  hasActorSignal?: boolean;
  groupInsights?: ReturnType<typeof buildGroupResultInsights>;
  morePicksStatus?: string | null;
  viewerCanRate?: boolean;
  isSharedResult?: boolean;
}

export interface AccountRecommendationSummary {
  slug: string;
  status: RecommendationStatus;
  stage: RecommendationStage;
  createdAt: string;
  completedAt: string | null;
  peopleCount: number;
  movieName: string | null;
  movieYear: number | null;
  posterURL: string | null;
  feedbackKind: RecommendationFeedbackKind | null;
}

export interface UserRecommendationFeedbackMoviePreference {
  kind: UserRecommendationMemoryKind;
  movieKey: string;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
}

export interface UserMovieMemorySummary {
  kind: UserMovieInteractionKind;
  movieKey: string;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
  updatedAt: string;
}

export interface MovieMemoryCatalogSearchResult {
  id: number;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
  duration: number | null;
  description: string | null;
  localizedOverview: string | null;
}

export interface MovieMemoryCandidateStats {
  catalogCount: number;
  memoryCount: number;
  availableCatalogCount: number;
}

export interface UserMovieMemoryPage {
  items: UserMovieMemorySummary[];
  total: number;
  nextOffset: number | null;
}

export interface ExternalMovieMemoryInput {
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
}

export interface MovieRowToInsert {
  id: number;
  tmdbId?: number | null;
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
  source?: RecommendationCandidateSource;
}

function getInteractionKindForFeedback(
  kind: RecommendationFeedbackKind,
): UserMovieInteractionKind | null {
  switch (kind) {
    case 'already_watched':
      return 'watched';
    case 'useful':
      return 'liked';
    case 'wrong_mood':
      return 'wrong_mood';
    case 'too_obvious':
    case 'too_obscure':
      return 'not_interested';
    case 'close':
      return null;
  }
}

// ---------------------------------------------------------------------------
// createRecommendation
// ---------------------------------------------------------------------------

export async function createRecommendation(
  quizData: PersonFormData | PersonFormData[],
  userId?: string,
  sourceStrategy?: RecommendationSourceStrategy,
  experienceMode?: RecommendationExperienceMode,
): Promise<{ id: string; slug: string }> {
  const pool = getPool();
  const slug = nanoid(12);
  const result = await pool.query<{ id: string; slug: string }>(
    `INSERT INTO recommendations (
       status, stage, quiz_data, slug, user_id, source_strategy, experience_mode
     )
     VALUES ('pending', 'queued', $1, $2, $3, $4, $5)
     RETURNING id, slug`,
    [
      JSON.stringify(quizData),
      slug,
      userId ?? null,
      sourceStrategy ?? 'hybrid-fast',
      experienceMode ?? 'normal-match',
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Failed to create recommendation row');
  return row;
}

export async function getUserRecommendationSummaries(
  userId: string,
  limit = 20,
): Promise<AccountRecommendationSummary[]> {
  const pool = getPool();
  const queryLimit = Math.min(Math.max(limit * 3, limit), 100);
  const result = await pool.query<{
    slug: string;
    status: RecommendationStatus;
    stage: RecommendationStage | null;
    created_at: Date | string;
    completed_at: Date | string | null;
    quiz_data: unknown;
    poster_url: string | null;
    localized_name: string | null;
    tmdb_id: number | null;
    tmdb_name: string | null;
    tmdb_year: number | null;
    m_name: string | null;
    m_year: number | null;
    feedback_kind: RecommendationFeedbackKind | null;
  }>(
    `SELECT
       r.slug,
       r.status,
       r.stage,
       r.created_at,
       r.completed_at,
       r.quiz_data,
       rm.poster_url,
       rm.localized_name,
       rm.tmdb_id,
       rm.tmdb_name,
       rm.tmdb_year,
       m.name AS m_name,
       m.year AS m_year,
       feedback.kind AS feedback_kind
     FROM recommendations r
     LEFT JOIN LATERAL (
       SELECT *
         FROM recommendation_movies
        WHERE recommendation_id = r.id
        ORDER BY is_main_recommendation DESC, position ASC
        LIMIT 1
     ) rm ON true
     LEFT JOIN movies m ON m.id = rm.movie_id
     LEFT JOIN LATERAL (
       SELECT kind
         FROM recommendation_feedback
        WHERE recommendation_id = r.id
          AND user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
     ) feedback ON true
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [userId, queryLimit],
  );

  const summaries = result.rows.map((row) => {
    const createdAt =
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
    const completedAt =
      row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at;
    const movieName = row.localized_name ?? row.tmdb_name ?? row.m_name ?? null;
    const movieYear = row.tmdb_year ?? row.m_year ?? null;

    return {
      movieKey: getMovieIdentityKey({
        tmdbId: row.tmdb_id,
        title: movieName,
        year: movieYear,
      }),
      summary: {
        slug: row.slug,
        status: row.status,
        stage: row.stage ?? (row.status === 'completed' ? 'complete' : 'queued'),
        createdAt,
        completedAt,
        peopleCount: getQuizPeopleCount(row.quiz_data),
        movieName,
        movieYear,
        posterURL: row.poster_url,
        feedbackKind: row.feedback_kind,
      },
    };
  });

  const seenMovieKeys = new Set<string>();
  const deduped: AccountRecommendationSummary[] = [];

  for (const { movieKey, summary } of summaries) {
    const key = movieKey ?? `slug:${summary.slug}`;
    if (seenMovieKeys.has(key)) continue;
    seenMovieKeys.add(key);
    deduped.push(summary);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export async function getUserRecommendationFeedbackMoviePreferences(
  userId: string,
  limit = 100,
): Promise<UserRecommendationFeedbackMoviePreference[]> {
  const pool = getPool();
  const interactionResult = await pool.query<{
    kind: UserMovieInteractionKind;
    movie_key: string;
    tmdb_id: number | null;
    movie_name: string;
    movie_year: number | null;
  }>(
    `SELECT
       kind,
       movie_key,
       tmdb_id,
       movie_name,
       movie_year
     FROM user_movie_interactions
     WHERE user_id = $1
       AND kind IN ('watched', 'liked', 'not_interested', 'wrong_mood')
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  const recentResult = await pool.query<{
    tmdb_id: number | null;
    movie_name: string | null;
    movie_year: number | null;
  }>(
    `WITH recent_recommendations AS (
       SELECT
         id,
         COALESCE(completed_at, created_at) AS recommended_at
       FROM recommendations
       WHERE user_id = $1
         AND status = 'completed'
       ORDER BY COALESCE(completed_at, created_at) DESC
       LIMIT $2
     )
     SELECT
       rm.tmdb_id,
       COALESCE(rm.tmdb_name, m.name) AS movie_name,
       COALESCE(rm.tmdb_year, m.year) AS movie_year
     FROM recent_recommendations r
     JOIN recommendation_movies rm ON rm.recommendation_id = r.id
     LEFT JOIN movies m ON m.id = rm.movie_id
     WHERE COALESCE(rm.tmdb_name, m.name) IS NOT NULL
     ORDER BY r.recommended_at DESC,
              rm.is_main_recommendation DESC,
              rm.position ASC`,
    [userId, limit],
  );

  const preferences: UserRecommendationFeedbackMoviePreference[] = interactionResult.rows.map(
    (row) => ({
      kind: row.kind,
      movieKey: row.movie_key,
      tmdbId: row.tmdb_id,
      movieName: row.movie_name,
      movieYear: row.movie_year,
    }),
  );

  const seenKeys = new Set(preferences.map((preference) => preference.movieKey));
  for (const row of recentResult.rows) {
    if (!row.movie_name) continue;
    const movieKey = getMovieIdentityKey({
      tmdbId: row.tmdb_id,
      title: row.movie_name,
      year: row.movie_year,
    });
    if (!movieKey || seenKeys.has(movieKey)) continue;

    seenKeys.add(movieKey);
    preferences.push({
      kind: 'recently_recommended',
      movieKey,
      tmdbId: row.tmdb_id,
      movieName: row.movie_name,
      movieYear: row.movie_year,
    });
  }

  return preferences.slice(0, limit);
}

export async function getUserMovieMemorySummaries(
  userId: string,
  limit = 50,
): Promise<UserMovieMemorySummary[]> {
  const pool = getPool();
  const result = await pool.query<{
    kind: UserMovieInteractionKind;
    movie_key: string;
    tmdb_id: number | null;
    movie_name: string;
    movie_year: number | null;
    poster_url: string | null;
    localized_name: string | null;
    updated_at: Date | string;
  }>(
    `SELECT
       ui.kind,
       ui.movie_key,
       COALESCE(ui.tmdb_id, catalog_movie.tmdb_id, source_movie.tmdb_id) AS tmdb_id,
       ui.movie_name,
       ui.movie_year,
       COALESCE(ui.poster_url, catalog_movie.poster_url, source_movie.poster_url) AS poster_url,
       COALESCE(ui.localized_name, catalog_movie.localized_name, source_movie.localized_name) AS localized_name,
       ui.updated_at
     FROM user_movie_interactions ui
     LEFT JOIN LATERAL (
       SELECT m.tmdb_id, m.poster_url, m.localized_name
       FROM movies m
       WHERE (ui.tmdb_id IS NOT NULL AND m.tmdb_id = ui.tmdb_id)
          OR (lower(m.name) = lower(ui.movie_name) AND m.year IS NOT DISTINCT FROM ui.movie_year)
       ORDER BY (m.poster_url IS NULL), m.id
       LIMIT 1
     ) catalog_movie ON true
     LEFT JOIN LATERAL (
       SELECT
         rm.tmdb_id,
         COALESCE(rm.poster_url, m.poster_url) AS poster_url,
         COALESCE(rm.localized_name, m.localized_name) AS localized_name
       FROM recommendation_movies rm
       LEFT JOIN movies m ON m.id = rm.movie_id
       WHERE rm.recommendation_id = ui.source_recommendation_id
         AND (
           (ui.tmdb_id IS NOT NULL AND rm.tmdb_id = ui.tmdb_id)
           OR (
             lower(COALESCE(rm.tmdb_name, m.name)) = lower(ui.movie_name)
             AND COALESCE(rm.tmdb_year, m.year) IS NOT DISTINCT FROM ui.movie_year
           )
           OR rm.is_main_recommendation
         )
       ORDER BY
         CASE
           WHEN ui.tmdb_id IS NOT NULL AND rm.tmdb_id = ui.tmdb_id THEN 0
           WHEN lower(COALESCE(rm.tmdb_name, m.name)) = lower(ui.movie_name)
             AND COALESCE(rm.tmdb_year, m.year) IS NOT DISTINCT FROM ui.movie_year THEN 1
           ELSE 2
         END,
         rm.is_main_recommendation DESC,
         rm.position ASC
       LIMIT 1
     ) source_movie ON true
     WHERE ui.user_id = $1
     ORDER BY ui.updated_at DESC
     LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );

  return result.rows.map((row) => ({
    kind: row.kind,
    movieKey: row.movie_key,
    tmdbId: row.tmdb_id,
    movieName: row.movie_name,
    movieYear: row.movie_year,
    posterURL: row.poster_url,
    localizedName: row.localized_name,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }));
}

export async function getUserMovieMemoryPage(
  userId: string,
  { limit = 50, offset = 0 } = {},
): Promise<UserMovieMemoryPage> {
  const pool = getPool();
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const boundedOffset = Math.max(offset, 0);
  const result = await pool.query<{
    kind: UserMovieInteractionKind;
    movie_key: string;
    tmdb_id: number | null;
    movie_name: string;
    movie_year: number | null;
    poster_url: string | null;
    localized_name: string | null;
    updated_at: Date | string;
    total_count: string | number;
  }>(
    `SELECT
       ui.kind,
       ui.movie_key,
       COALESCE(ui.tmdb_id, catalog_movie.tmdb_id, source_movie.tmdb_id) AS tmdb_id,
       ui.movie_name,
       ui.movie_year,
       COALESCE(ui.poster_url, catalog_movie.poster_url, source_movie.poster_url) AS poster_url,
       COALESCE(ui.localized_name, catalog_movie.localized_name, source_movie.localized_name) AS localized_name,
       ui.updated_at,
       COUNT(*) OVER() AS total_count
     FROM user_movie_interactions ui
     LEFT JOIN LATERAL (
       SELECT m.tmdb_id, m.poster_url, m.localized_name
       FROM movies m
       WHERE (ui.tmdb_id IS NOT NULL AND m.tmdb_id = ui.tmdb_id)
          OR (lower(m.name) = lower(ui.movie_name) AND m.year IS NOT DISTINCT FROM ui.movie_year)
       ORDER BY (m.poster_url IS NULL), m.id
       LIMIT 1
     ) catalog_movie ON true
     LEFT JOIN LATERAL (
       SELECT
         rm.tmdb_id,
         COALESCE(rm.poster_url, m.poster_url) AS poster_url,
         COALESCE(rm.localized_name, m.localized_name) AS localized_name
       FROM recommendation_movies rm
       LEFT JOIN movies m ON m.id = rm.movie_id
       WHERE rm.recommendation_id = ui.source_recommendation_id
         AND (
           (ui.tmdb_id IS NOT NULL AND rm.tmdb_id = ui.tmdb_id)
           OR (
             lower(COALESCE(rm.tmdb_name, m.name)) = lower(ui.movie_name)
             AND COALESCE(rm.tmdb_year, m.year) IS NOT DISTINCT FROM ui.movie_year
           )
           OR rm.is_main_recommendation
         )
       ORDER BY
         CASE
           WHEN ui.tmdb_id IS NOT NULL AND rm.tmdb_id = ui.tmdb_id THEN 0
           WHEN lower(COALESCE(rm.tmdb_name, m.name)) = lower(ui.movie_name)
             AND COALESCE(rm.tmdb_year, m.year) IS NOT DISTINCT FROM ui.movie_year THEN 1
           ELSE 2
         END,
         rm.is_main_recommendation DESC,
         rm.position ASC
       LIMIT 1
     ) source_movie ON true
     WHERE ui.user_id = $1
     ORDER BY ui.updated_at DESC, ui.movie_key ASC
     LIMIT $2 OFFSET $3`,
    [userId, boundedLimit, boundedOffset],
  );

  const total = Number(result.rows[0]?.total_count ?? boundedOffset + result.rows.length);
  const nextOffset =
    boundedOffset + result.rows.length < total ? boundedOffset + result.rows.length : null;

  return {
    items: result.rows.map(mapUserMovieMemoryRow),
    total,
    nextOffset,
  };
}

function mapUserMovieMemoryRow(row: {
  kind: UserMovieInteractionKind;
  movie_key: string;
  tmdb_id: number | null;
  movie_name: string;
  movie_year: number | null;
  poster_url: string | null;
  localized_name: string | null;
  updated_at: Date | string;
}): UserMovieMemorySummary {
  return {
    kind: row.kind,
    movieKey: row.movie_key,
    tmdbId: row.tmdb_id,
    movieName: row.movie_name,
    movieYear: row.movie_year,
    posterURL: row.poster_url,
    localizedName: row.localized_name,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function searchMovieCatalogForMemory(
  query: string,
  limit = 8,
): Promise<MovieMemoryCatalogSearchResult[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  const pool = getPool();
  const result = await pool.query<{
    id: number;
    tmdb_id: number | null;
    name: string;
    year: number | null;
    poster_url: string | null;
    localized_name: string | null;
    duration: number | null;
    description: string | null;
  }>(
    `SELECT id, tmdb_id, name, year, poster_url, localized_name, duration, description
       FROM movies
      WHERE name ILIKE $1 ESCAPE '\\'
      ORDER BY (poster_url IS NULL), year DESC, name ASC
      LIMIT $2`,
    [`%${escapeLikePattern(trimmedQuery)}%`, Math.min(Math.max(limit, 1), 12)],
  );

  return result.rows.map((row) => ({
    id: row.id,
    tmdbId: row.tmdb_id,
    movieName: row.name,
    movieYear: row.year,
    posterURL: row.poster_url,
    localizedName: row.localized_name,
    duration: row.duration,
    description: row.description,
    localizedOverview: null,
  }));
}

export async function getMovieMemoryCandidatesForUser(
  userId: string,
  limit = 20,
): Promise<MovieMemoryCatalogSearchResult[]> {
  const pool = getPool();
  const boundedLimit = Math.min(Math.max(limit, 1), 20);
  const result = await pool.query<{
    id: number;
    tmdb_id: number | null;
    name: string;
    year: number | null;
    poster_url: string | null;
    localized_name: string | null;
    duration: number | null;
    description: string | null;
    score_rating: number | null;
  }>(
    `SELECT id, tmdb_id, name, year, poster_url, localized_name, duration, description, score_rating
       FROM movies m
      WHERE NOT EXISTS (
        SELECT 1
          FROM user_movie_interactions ui
         WHERE ui.user_id = $1
           AND (
             (
               m.tmdb_id IS NOT NULL
               AND (
                 ui.tmdb_id = m.tmdb_id
                 OR ui.movie_key = CONCAT('tmdb:', m.tmdb_id::text)
               )
             )
             OR (
               lower(ui.movie_name) = lower(m.name)
               AND ui.movie_year IS NOT DISTINCT FROM m.year
             )
           )
      )
      ORDER BY (m.poster_url IS NULL), m.score_rating DESC NULLS LAST, m.year DESC NULLS LAST, m.name ASC
      LIMIT $2`,
    [userId, boundedLimit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    tmdbId: row.tmdb_id,
    movieName: row.name,
    movieYear: row.year,
    posterURL: row.poster_url,
    localizedName: row.localized_name,
    duration: row.duration,
    description: row.description,
    localizedOverview: null,
  }));
}

export async function getMovieMemoryCandidateStatsForUser(
  userId: string,
): Promise<MovieMemoryCandidateStats> {
  const pool = getPool();
  const result = await pool.query<{
    catalog_count: string | number;
    memory_count: string | number;
    available_catalog_count: string | number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM movies) AS catalog_count,
       (
         SELECT COUNT(*)
           FROM user_movie_interactions
          WHERE user_id = $1
       ) AS memory_count,
       (
         SELECT COUNT(*)
           FROM movies m
          WHERE NOT EXISTS (
            SELECT 1
              FROM user_movie_interactions ui
             WHERE ui.user_id = $1
               AND (
                 (
                   m.tmdb_id IS NOT NULL
                   AND (
                     ui.tmdb_id = m.tmdb_id
                     OR ui.movie_key = CONCAT('tmdb:', m.tmdb_id::text)
                   )
                 )
                 OR (
                   lower(ui.movie_name) = lower(m.name)
                   AND ui.movie_year IS NOT DISTINCT FROM m.year
                 )
               )
          )
       ) AS available_catalog_count`,
    [userId],
  );

  const row = result.rows[0];
  return {
    catalogCount: Number(row?.catalog_count ?? 0),
    memoryCount: Number(row?.memory_count ?? 0),
    availableCatalogCount: Number(row?.available_catalog_count ?? 0),
  };
}

export async function addUserMovieMemoryFromCatalog(
  userId: string,
  movieId: number,
  kind: UserMovieInteractionKind = 'watched',
): Promise<UserMovieMemorySummary | null> {
  const pool = getPool();
  const movieResult = await pool.query<{
    tmdb_id: number | null;
    name: string;
    year: number | null;
    poster_url: string | null;
    localized_name: string | null;
  }>(
    `SELECT tmdb_id, name, year, poster_url, localized_name
       FROM movies
      WHERE id = $1
      LIMIT 1`,
    [movieId],
  );

  const movie = movieResult.rows[0];
  if (!movie) return null;

  return addUserMovieMemoryFromExternalMovie(
    userId,
    {
      tmdbId: movie.tmdb_id,
      movieName: movie.name,
      movieYear: movie.year,
      posterURL: movie.poster_url,
      localizedName: movie.localized_name,
    },
    kind,
  );
}

export async function addUserMovieMemoryFromExternalMovie(
  userId: string,
  movie: ExternalMovieMemoryInput,
  kind: UserMovieInteractionKind = 'watched',
): Promise<UserMovieMemorySummary | null> {
  const pool = getPool();
  const movieKey = getMovieIdentityKey({
    tmdbId: movie.tmdbId,
    title: movie.movieName,
    year: movie.movieYear,
  });
  if (!movieKey) return null;

  const upsertResult = await pool.query<{
    kind: UserMovieInteractionKind;
    movie_key: string;
    tmdb_id: number | null;
    movie_name: string;
    movie_year: number | null;
    poster_url: string | null;
    localized_name: string | null;
    updated_at: Date | string;
  }>(
    `INSERT INTO user_movie_interactions (
       user_id, movie_key, tmdb_id, movie_name, movie_year, poster_url, localized_name, kind
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, movie_key)
     DO UPDATE SET
       tmdb_id = COALESCE(EXCLUDED.tmdb_id, user_movie_interactions.tmdb_id),
       movie_name = EXCLUDED.movie_name,
       movie_year = EXCLUDED.movie_year,
       poster_url = COALESCE(EXCLUDED.poster_url, user_movie_interactions.poster_url),
       localized_name = COALESCE(EXCLUDED.localized_name, user_movie_interactions.localized_name),
       kind = EXCLUDED.kind,
       updated_at = now()
     RETURNING kind, movie_key, tmdb_id, movie_name, movie_year, poster_url, localized_name, updated_at`,
    [
      userId,
      movieKey,
      movie.tmdbId,
      movie.movieName,
      movie.movieYear,
      movie.posterURL,
      movie.localizedName,
      kind,
    ],
  );

  const row = upsertResult.rows[0];
  return row ? mapUserMovieMemoryRow(row) : null;
}

export async function addUserMovieMemoryBatchFromCatalog(
  userId: string,
  items: Array<{ movieId: number; kind?: UserMovieInteractionKind }>,
): Promise<UserMovieMemorySummary[]> {
  const dedupedItems = Array.from(
    items
      .reduce((map, item) => {
        map.set(item.movieId, { movieId: item.movieId, kind: item.kind ?? 'watched' });
        return map;
      }, new Map<number, { movieId: number; kind: UserMovieInteractionKind }>())
      .values(),
  );
  const saved: UserMovieMemorySummary[] = [];

  for (const item of dedupedItems) {
    const result = await addUserMovieMemoryFromCatalog(userId, item.movieId, item.kind);
    if (result) saved.push(result);
  }

  return saved;
}

export async function deleteUserMovieMemory(userId: string, movieKey: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM user_movie_interactions
      WHERE user_id = $1
        AND movie_key = $2`,
    [userId, movieKey],
  );

  return (result.rowCount ?? 0) > 0;
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
          from_tmdb, source, tmdb_id, tmdb_name, tmdb_year, tmdb_score_rating, tmdb_duration, tmdb_age_rating
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
          m.source ?? (m.fromTMDB ? 'tmdb-discover' : 'local-cache'),
          m.fromTMDB ? Math.abs(m.id) : (m.tmdbId ?? null),
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
  viewerUserId?: string,
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
    experience_mode: RecommendationExperienceMode | null;
    more_picks_status: string | null;
    source_strategy: RecommendationSourceStrategy | null;
    user_id: string | null;
  }>(
    `SELECT
       id, status, error, stage, used_broader_search, db_movie_count, quiz_data,
       experience_mode, more_picks_status, source_strategy, user_id
       FROM recommendations
      WHERE slug = $1`,
    [slug],
  );

  const rec = recResult.rows[0];
  if (!rec) return null;
  const ownerUserId = rec.user_id === null ? null : String(rec.user_id);
  const normalizedViewerUserId = viewerUserId === undefined ? null : String(viewerUserId);
  const viewerCanRate = Boolean(
    normalizedViewerUserId && ownerUserId && ownerUserId === normalizedViewerUserId,
  );
  const isSharedResult = Boolean(
    ownerUserId && (!normalizedViewerUserId || ownerUserId !== normalizedViewerUserId),
  );
  const peopleCount = getQuizPeopleCount(rec.quiz_data);
  const hasActorSignal = hasFavoriteActorSignal(rec.quiz_data);
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
      hasActorSignal,
      groupInsights,
      morePicksStatus: rec.more_picks_status ?? null,
      viewerCanRate,
      isSharedResult,
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
    source: RecommendationCandidateSource | null;
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
       rm.source,
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
        source: row.source ?? 'tmdb-discover',
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
      source: row.source ?? 'local-cache',
    };
  });

  return {
    status: rec.status,
    stage: rec.stage ?? 'complete',
    error: rec.error,
    movies,
    usedBroaderSearch: rec.used_broader_search ?? false,
    dbMovieCount: rec.db_movie_count ?? undefined,
    experienceMode: rec.experience_mode,
    sourceStrategy: rec.source_strategy,
    peopleCount,
    hasActorSignal,
    groupInsights,
    morePicksStatus: rec.more_picks_status ?? null,
    viewerCanRate,
    isSharedResult,
  };
}

export async function createRecommendationFeedback({
  slug,
  kind,
  userId,
}: {
  slug: string;
  kind: RecommendationFeedbackKind;
  userId?: string;
}): Promise<{ id: string } | null> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const feedbackResult = await client.query<{ id: string; recommendation_id: string }>(
      `INSERT INTO recommendation_feedback (recommendation_id, user_id, kind)
       SELECT id, $2, $3
         FROM recommendations
        WHERE slug = $1
          AND status = 'completed'
          AND user_id = $2
        RETURNING id, recommendation_id`,
      [slug, userId ?? null, kind],
    );

    const feedback = feedbackResult.rows[0];
    if (!feedback) {
      await client.query('COMMIT');
      return null;
    }

    const interactionKind = userId ? getInteractionKindForFeedback(kind) : null;
    if (interactionKind) {
      const movieResult = await client.query<{
        tmdb_id: number | null;
        poster_url: string | null;
        localized_name: string | null;
        movie_name: string | null;
        movie_year: number | null;
      }>(
        `SELECT
           rm.tmdb_id,
           rm.poster_url,
           rm.localized_name,
           COALESCE(rm.tmdb_name, m.name) AS movie_name,
           COALESCE(rm.tmdb_year, m.year) AS movie_year
         FROM recommendation_movies rm
         LEFT JOIN movies m ON m.id = rm.movie_id
         WHERE rm.recommendation_id = $1
         ORDER BY rm.is_main_recommendation DESC, rm.position ASC
         LIMIT 1`,
        [feedback.recommendation_id],
      );

      const movie = movieResult.rows[0];
      const movieKey = movie
        ? getMovieIdentityKey({
            tmdbId: movie.tmdb_id,
            title: movie.movie_name,
            year: movie.movie_year,
          })
        : null;

      if (movie?.movie_name && movieKey) {
        await client.query(
          `INSERT INTO user_movie_interactions (
             user_id, movie_key, tmdb_id, movie_name, movie_year, poster_url,
             localized_name, kind, source_recommendation_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id, movie_key)
           DO UPDATE SET
             tmdb_id = COALESCE(EXCLUDED.tmdb_id, user_movie_interactions.tmdb_id),
             movie_name = EXCLUDED.movie_name,
             movie_year = EXCLUDED.movie_year,
             poster_url = COALESCE(EXCLUDED.poster_url, user_movie_interactions.poster_url),
             localized_name = COALESCE(EXCLUDED.localized_name, user_movie_interactions.localized_name),
             kind = EXCLUDED.kind,
             source_recommendation_id = EXCLUDED.source_recommendation_id,
             updated_at = now()`,
          [
            userId,
            movieKey,
            movie.tmdb_id,
            movie.movie_name,
            movie.movie_year,
            movie.poster_url,
            movie.localized_name,
            interactionKind,
            feedback.recommendation_id,
          ],
        );
      }
    }

    await client.query('COMMIT');
    return { id: feedback.id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
            from_tmdb, source, tmdb_id, tmdb_name, tmdb_year, tmdb_score_rating, tmdb_duration, tmdb_age_rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
          m.source ?? 'tmdb-search',
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
