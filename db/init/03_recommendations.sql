-- Recommendations feature tables.
-- Keep in sync with db/recommendations.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE INDEX IF NOT EXISTS idx_recommendations_slug
  ON recommendations (slug);

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
