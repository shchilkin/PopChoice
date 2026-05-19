 create table if not exists movies (
  id bigserial primary key,
  name text not null,
  age_rating text not null,
  description text not null,  
  duration integer not null,
  score_rating float not null,
  year int not null,
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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON password_reset_tokens (expires_at);

CREATE OR REPLACE FUNCTION consume_password_reset_token(
  p_token_hash text,
  p_new_password_hash text
)
RETURNS TABLE(user_id bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  matched_user_id bigint;
BEGIN
  SELECT password_reset_tokens.user_id
    INTO matched_user_id
  FROM password_reset_tokens
  WHERE password_reset_tokens.token_hash = p_token_hash
    AND password_reset_tokens.used_at IS NULL
    AND password_reset_tokens.expires_at > now()
  FOR UPDATE;

  IF matched_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE users
  SET password_hash = p_new_password_hash
  WHERE users.id = matched_user_id;

  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE password_reset_tokens.token_hash = p_token_hash;

  RETURN QUERY SELECT matched_user_id;
END;
$$;
