-- Docker init script: runs automatically on first container start.
-- Keep in sync with db/createDB.sql.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS movies (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  age_rating text NOT NULL,
  description text NOT NULL,
  duration integer NOT NULL,
  score_rating float NOT NULL,
  year int NOT NULL,
  tmdb_id bigint,
  tmdb_match_confidence float,
  tmdb_match_source text,
  tmdb_matched_at timestamptz,
  embedding vector(3072),
  UNIQUE(name, year)
);

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_id bigint;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_match_confidence float;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_match_source text;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_matched_at timestamptz;

ALTER TABLE movies
  DROP CONSTRAINT IF EXISTS movies_tmdb_match_source_check;

ALTER TABLE movies
  ADD CONSTRAINT movies_tmdb_match_source_check
  CHECK (tmdb_match_source IS NULL OR tmdb_match_source IN ('tmdb_discovery', 'backfill_auto', 'manual'));

CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_id_unique
  ON movies (tmdb_id)
  WHERE tmdb_id IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (lower(email));
