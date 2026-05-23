import {
  checkTableExists,
  closeDatabase,
  ensureCatalogMetadataSchema,
  getPool,
  initDatabase,
  logger,
} from '@pop-choice/shared';

import type { TMDBSearchCandidate } from './tmdb.js';

export { initDatabase, closeDatabase, checkTableExists, ensureCatalogMetadataSchema };

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
        status IN ('open', 'resolved', 'ignored')
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tmdb_match_reviews_movie_reason
      ON tmdb_match_reviews (movie_id, reason);

    CREATE INDEX IF NOT EXISTS idx_tmdb_match_reviews_status_updated_at
      ON tmdb_match_reviews (status, updated_at DESC);
  `);
}

export async function getIncompleteMovies(limit: number): Promise<IncompleteMovie[]> {
  const query =
    limit > 0
      ? 'SELECT id, name, year, duration, score_rating, description, tmdb_id FROM movies WHERE tmdb_id IS NULL OR duration = 0 OR poster_url IS NULL ORDER BY id LIMIT $1'
      : 'SELECT id, name, year, duration, score_rating, description, tmdb_id FROM movies WHERE tmdb_id IS NULL OR duration = 0 OR poster_url IS NULL ORDER BY id';

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
