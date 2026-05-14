CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recommendations table
-- future: add  user_id uuid REFERENCES users(id) ON DELETE SET NULL
CREATE TABLE IF NOT EXISTS recommendations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text        UNIQUE NOT NULL,              -- short nanoid(12) used in public URLs
  status              text        NOT NULL DEFAULT 'pending',   -- pending | processing | completed | failed
  stage               text        NOT NULL DEFAULT 'queued',    -- queued | preparing | embedding | local-search | tmdb-search | ai-ranking | posters | descriptions | complete | failed
  quiz_data           jsonb       NOT NULL,
  error               text,                                      -- populated on failure
  created_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  used_broader_search boolean,
  db_movie_count      integer,
  more_picks_status   text                                       -- null | pending | processing | completed | failed
  -- future: user_id uuid, rating smallint CHECK (rating BETWEEN 1 AND 5)
);

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS more_picks_status text;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS stage text;

UPDATE recommendations
   SET stage = 'queued'
 WHERE stage IS NULL;

ALTER TABLE recommendations
  ALTER COLUMN stage SET DEFAULT 'queued';

ALTER TABLE recommendations
  ALTER COLUMN stage SET NOT NULL;

UPDATE recommendations
   SET slug = REPLACE(id::text, '-', '')
 WHERE slug IS NULL;

ALTER TABLE recommendations
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_slug
  ON recommendations (slug);

-- Individual movies linked to a recommendation
CREATE TABLE IF NOT EXISTS recommendation_movies (
  id                    bigserial  PRIMARY KEY,
  recommendation_id     uuid       NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  movie_id              bigint     REFERENCES movies(id),   -- NULL for TMDB-only entries
  position              integer    NOT NULL,
  is_main_recommendation boolean   NOT NULL DEFAULT false,
  ai_description        text,
  poster_url            text,
  localized_name        text,
  similarity            float,
  -- denormalised fields for movies not yet in local DB (from_tmdb = true)
  from_tmdb             boolean    NOT NULL DEFAULT false,
  tmdb_id               bigint,
  tmdb_name             text,
  tmdb_year             integer,
  tmdb_score_rating     float,
  tmdb_duration         integer,
  tmdb_age_rating       text
);

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS tmdb_id bigint;

ALTER TABLE recommendation_movies
  ADD COLUMN IF NOT EXISTS from_tmdb boolean NOT NULL DEFAULT false;

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

CREATE INDEX IF NOT EXISTS idx_recommendation_movies_rec_id
  ON recommendation_movies (recommendation_id);
