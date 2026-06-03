-- Migration: recommendations and recommendation_movies tables.
-- Keep in sync with db/recommendations.sql.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             bigint      REFERENCES users(id) ON DELETE SET NULL,
  slug                text        UNIQUE NOT NULL,
  status              text        NOT NULL DEFAULT 'pending',
  stage               text        NOT NULL DEFAULT 'queued',
  quiz_data           jsonb       NOT NULL,
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  used_broader_search boolean,
  db_movie_count      integer,
  more_picks_status   text,
  source_strategy     text        NOT NULL DEFAULT 'hybrid-fast',
  experience_mode     text        NOT NULL DEFAULT 'normal-match'
);

-- Idempotent column additions for databases created before slug / more_picks_status were added
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS slug             text;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS user_id          bigint REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS more_picks_status text;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS stage             text;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS source_strategy   text;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS experience_mode   text;

-- Back-fill slug for any legacy rows that pre-date the column
UPDATE recommendations
   SET slug = REPLACE(id::text, '-', '')
 WHERE slug IS NULL;

UPDATE recommendations
   SET stage = 'queued'
 WHERE stage IS NULL;

UPDATE recommendations
   SET source_strategy = 'hybrid-fast'
 WHERE source_strategy IS NULL;

UPDATE recommendations
   SET experience_mode = 'normal-match'
 WHERE experience_mode IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE recommendations ALTER COLUMN slug SET NOT NULL;
ALTER TABLE recommendations ALTER COLUMN stage SET DEFAULT 'queued';
ALTER TABLE recommendations ALTER COLUMN stage SET NOT NULL;
ALTER TABLE recommendations ALTER COLUMN source_strategy SET DEFAULT 'hybrid-fast';
ALTER TABLE recommendations ALTER COLUMN source_strategy SET NOT NULL;
ALTER TABLE recommendations ALTER COLUMN experience_mode SET DEFAULT 'normal-match';
ALTER TABLE recommendations ALTER COLUMN experience_mode SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_slug
  ON recommendations (slug);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id_created_at
  ON recommendations (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Individual movies linked to a recommendation
CREATE TABLE IF NOT EXISTS recommendation_movies (
  id                      bigserial  PRIMARY KEY,
  recommendation_id       uuid       NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  movie_id                bigint     REFERENCES movies(id),
  position                integer    NOT NULL,
  is_main_recommendation  boolean    NOT NULL DEFAULT false,
  ai_description          text,
  poster_url              text,
  localized_name          text,
  similarity              float,
  from_tmdb               boolean    NOT NULL DEFAULT false,
  tmdb_id                 bigint,
  tmdb_name               text,
  tmdb_year               integer,
  tmdb_score_rating       float,
  tmdb_duration           integer,
  tmdb_age_rating         text,
  source                  text       NOT NULL DEFAULT 'local-cache'
);

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS from_tmdb boolean NOT NULL DEFAULT false;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS poster_url text;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS localized_name text;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_id bigint;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_name text;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_year integer;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_score_rating float;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_duration integer;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_age_rating text;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS source text;

UPDATE recommendation_movies
   SET source = CASE WHEN from_tmdb THEN 'tmdb-discover' ELSE 'local-cache' END
 WHERE source IS NULL;

ALTER TABLE recommendation_movies
  ALTER COLUMN source SET DEFAULT 'local-cache';

ALTER TABLE recommendation_movies
  ALTER COLUMN source SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_movies_rec_id
  ON recommendation_movies (recommendation_id);

-- Lightweight user feedback for completed recommendations.
-- Stored separately from the recommendation so analytics can evolve without
-- rewriting the generated result payload.
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid        NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_id           bigint      REFERENCES users(id) ON DELETE SET NULL,
  kind              text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_feedback_kind_check CHECK (
    kind IN ('useful', 'already_watched', 'wrong_mood', 'too_obvious', 'too_obscure', 'close')
  )
);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_rec_id
  ON recommendation_feedback (recommendation_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_id_created_at
  ON recommendation_feedback (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Durable per-user movie memory derived from feedback. This lets future
-- recommendations avoid movies the signed-in user already marked as watched or
-- not relevant, regardless of which recommendation produced that feedback.
CREATE TABLE IF NOT EXISTS user_movie_interactions (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_key                text        NOT NULL,
  tmdb_id                  bigint,
  movie_name               text        NOT NULL,
  movie_year               integer,
  poster_url               text,
  localized_name           text,
  kind                     text        NOT NULL,
  source_recommendation_id uuid        REFERENCES recommendations(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_movie_interactions_kind_check CHECK (
    kind IN ('watched', 'liked', 'not_interested', 'wrong_mood', 'not_seen')
  )
);

ALTER TABLE user_movie_interactions
  DROP CONSTRAINT IF EXISTS user_movie_interactions_kind_check;

ALTER TABLE user_movie_interactions
  ADD CONSTRAINT user_movie_interactions_kind_check CHECK (
    kind IN ('watched', 'liked', 'not_interested', 'wrong_mood', 'not_seen')
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_movie_interactions_user_key
  ON user_movie_interactions (user_id, movie_key);

CREATE INDEX IF NOT EXISTS idx_user_movie_interactions_user_kind_updated_at
  ON user_movie_interactions (user_id, kind, updated_at DESC);
