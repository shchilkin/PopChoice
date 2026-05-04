-- Migration: recommendations and recommendation_movies tables.
-- Keep in sync with db/recommendations.sql.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text        UNIQUE NOT NULL,
  status              text        NOT NULL DEFAULT 'pending',
  quiz_data           jsonb       NOT NULL,
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  used_broader_search boolean,
  db_movie_count      integer,
  more_picks_status   text
);

-- Idempotent column additions for databases created before slug / more_picks_status were added
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS slug             text;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS more_picks_status text;

-- Back-fill slug for any legacy rows that pre-date the column
UPDATE recommendations
   SET slug = REPLACE(id::text, '-', '')
 WHERE slug IS NULL;

-- Enforce NOT NULL now that every row has a value
ALTER TABLE recommendations ALTER COLUMN slug SET NOT NULL;

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
  tmdb_age_rating         text
);

CREATE INDEX IF NOT EXISTS idx_recommendation_movies_rec_id
  ON recommendation_movies (recommendation_id);
