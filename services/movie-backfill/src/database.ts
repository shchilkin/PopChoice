import {
  checkTableExists,
  closeDatabase,
  ensureCatalogMetadataSchema,
  getPool,
  initDatabase,
  logger,
  upsertMovieCatalogMetadata,
} from '@pop-choice/shared';

import type { TMDBSearchCandidate } from './tmdb.js';
import type { MovieCatalogMetadataInput } from '@pop-choice/shared';

export {
  initDatabase,
  closeDatabase,
  checkTableExists,
  ensureCatalogMetadataSchema,
  upsertMovieCatalogMetadata,
};
export type { MovieCatalogMetadataInput };

export interface IncompleteMovie {
  id: string;
  name: string;
  year: number;
  duration: number;
  score_rating: number;
  description: string;
  tmdb_id: number | null;
}

export type TMDBMatchReviewReason = 'ambiguous_match' | 'runtime_mismatch';

export interface RecordTMDBMatchReviewInput {
  movie: IncompleteMovie;
  reason: TMDBMatchReviewReason;
  candidates: TMDBSearchCandidate[];
  notes?: string;
}

export async function ensureTMDBMatchReviewSchema(): Promise<void> {
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

    CREATE TABLE IF NOT EXISTS catalog_repair_audit (
      id bigserial PRIMARY KEY,
      action text NOT NULL,
      actor text NOT NULL,
      issue_key text NOT NULL,
      target_type text NOT NULL,
      target_id text NOT NULL,
      note text,
      previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
      result jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT catalog_repair_audit_action_check CHECK (
        action IN ('enqueue_backfill')
      )
    );

    CREATE INDEX IF NOT EXISTS idx_catalog_repair_audit_target_created_at
      ON catalog_repair_audit (target_type, target_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_catalog_repair_audit_issue_created_at
      ON catalog_repair_audit (issue_key, created_at DESC);
  `);
}

export async function getIncompleteMovies(limit: number): Promise<IncompleteMovie[]> {
  const query =
    limit > 0
      ? `SELECT id, name, year, duration, score_rating, description, tmdb_id
           FROM movies
          WHERE tmdb_id IS NULL
             OR duration = 0
             OR poster_url IS NULL
             OR (tmdb_id IS NOT NULL AND tmdb_metadata_refreshed_at IS NULL)
          ORDER BY id
          LIMIT $1`
      : `SELECT id, name, year, duration, score_rating, description, tmdb_id
           FROM movies
          WHERE tmdb_id IS NULL
             OR duration = 0
             OR poster_url IS NULL
             OR (tmdb_id IS NOT NULL AND tmdb_metadata_refreshed_at IS NULL)
          ORDER BY id`;

  const result = await getPool().query<{
    id: string;
    name: string;
    year: number;
    duration: number;
    score_rating: number;
    description: string;
    tmdb_id: number | null;
  }>(query, limit > 0 ? [limit] : []);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    year: row.year,
    duration: row.duration,
    score_rating: Number(row.score_rating),
    description: row.description,
    tmdb_id: row.tmdb_id,
  }));
}

export async function updateMovie(
  id: string,
  duration: number,
  ageRating: string,
  tmdbId: number,
  matchConfidence: number,
  posterUrl: string | null,
  localizedName: string | null,
  embedding: number[],
): Promise<void> {
  await getPool().query(
    `UPDATE movies
        SET duration = $1,
            age_rating = $2,
            tmdb_id = $3,
            tmdb_match_confidence = $4,
            tmdb_match_source = 'backfill_auto',
            tmdb_matched_at = now(),
            poster_url = COALESCE($5, poster_url),
            localized_name = COALESCE($6, localized_name),
            embedding = $7::vector
      WHERE id = $8`,
    [
      duration,
      ageRating,
      tmdbId,
      matchConfidence,
      posterUrl,
      localizedName,
      JSON.stringify(embedding),
      id,
    ],
  );
  logger.debug('Movie updated in database', {
    id,
    duration,
    ageRating,
    tmdbId,
    matchConfidence,
    hasPoster: Boolean(posterUrl),
    hasLocalizedName: Boolean(localizedName),
  });
}

export async function recordTMDBMatchReview(input: RecordTMDBMatchReviewInput): Promise<void> {
  const { movie, reason, candidates, notes } = input;

  await getPool().query(
    `INSERT INTO tmdb_match_reviews (
       movie_id, movie_name, movie_year, reason, status, candidates, notes, updated_at
     )
     VALUES ($1, $2, $3, $4, 'open', $5::jsonb, $6, now())
     ON CONFLICT (movie_id, reason) DO UPDATE
       SET movie_name = EXCLUDED.movie_name,
           movie_year = EXCLUDED.movie_year,
           status = 'open',
           candidates = EXCLUDED.candidates,
           notes = EXCLUDED.notes,
           updated_at = now()`,
    [movie.id, movie.name, movie.year, reason, JSON.stringify(candidates), notes ?? null],
  );

  logger.debug('TMDB match review recorded', {
    id: movie.id,
    name: movie.name,
    year: movie.year,
    reason,
    candidateCount: candidates.length,
  });
}
