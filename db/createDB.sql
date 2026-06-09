 create table if not exists movies (
  id bigserial primary key,
  name text not null,
  age_rating text not null,
  description text not null,  
  duration integer not null,
  score_rating float not null,
  year int not null,
  original_title text,
  original_language text,
  release_date date,
  vote_count integer,
  popularity float,
  metadata_quality_score integer NOT NULL DEFAULT 0,
  metadata_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  tmdb_id bigint,
  poster_url text,
  localized_name text,
  tmdb_match_confidence float,
  tmdb_match_source text,
  tmdb_matched_at timestamptz,
  embedding vector(3072),
    UNIQUE(name, year)
);

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_id bigint;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS poster_url text;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS localized_name text;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_match_confidence float;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_match_source text;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_matched_at timestamptz;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS tmdb_metadata_refreshed_at timestamptz;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS original_title text;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS original_language text;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS release_date date;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS vote_count integer;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS popularity float;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS metadata_quality_score integer NOT NULL DEFAULT 0;

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS metadata_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE movies
  DROP CONSTRAINT IF EXISTS movies_tmdb_match_source_check;

ALTER TABLE movies
  ADD CONSTRAINT movies_tmdb_match_source_check
  CHECK (tmdb_match_source IS NULL OR tmdb_match_source IN ('tmdb_discovery', 'backfill_auto', 'manual'));

CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_id_unique
  ON movies (tmdb_id)
  WHERE tmdb_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_people (
  id bigserial PRIMARY KEY,
  tmdb_id int,
  name text NOT NULL,
  profile_path text,
  popularity float,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_people
  ALTER COLUMN tmdb_id TYPE int USING tmdb_id::int;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_people_tmdb_id_unique
  ON catalog_people (tmdb_id)
  WHERE tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_people_name_lower
  ON catalog_people (lower(name));

CREATE TABLE IF NOT EXISTS catalog_genres (
  id bigserial PRIMARY KEY,
  tmdb_id int,
  name text NOT NULL,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_genres_tmdb_id_unique
  ON catalog_genres (tmdb_id)
  WHERE tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_genres_name_lower
  ON catalog_genres (lower(name));

CREATE TABLE IF NOT EXISTS catalog_keywords (
  id bigserial PRIMARY KEY,
  tmdb_id int,
  name text NOT NULL,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_keywords
  ALTER COLUMN tmdb_id TYPE int USING tmdb_id::int;

CREATE UNIQUE INDEX IF NOT EXISTS catalog_keywords_tmdb_id_unique
  ON catalog_keywords (tmdb_id)
  WHERE tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_keywords_name_lower
  ON catalog_keywords (lower(name));

CREATE TABLE IF NOT EXISTS movie_people (
  id bigserial PRIMARY KEY,
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  person_id bigint NOT NULL REFERENCES catalog_people(id) ON DELETE CASCADE,
  tmdb_credit_id text,
  role text NOT NULL,
  character_name text,
  job text,
  department text,
  billing_order int,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT movie_people_role_check CHECK (role IN ('cast', 'director'))
);

CREATE UNIQUE INDEX IF NOT EXISTS movie_people_tmdb_credit_unique
  ON movie_people (movie_id, tmdb_credit_id)
  WHERE tmdb_credit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movie_people_movie_role_order
  ON movie_people (movie_id, role, billing_order NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_movie_people_person_role
  ON movie_people (person_id, role);

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  genre_id bigint NOT NULL REFERENCES catalog_genres(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'tmdb',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT movie_genres_source_check CHECK (source IN ('tmdb', 'manual')),
  PRIMARY KEY (movie_id, genre_id)
);

ALTER TABLE movie_genres
  DROP CONSTRAINT IF EXISTS movie_genres_source_check;

ALTER TABLE movie_genres
  ADD CONSTRAINT movie_genres_source_check CHECK (source IN ('tmdb', 'manual'));

CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id
  ON movie_genres (genre_id);

CREATE TABLE IF NOT EXISTS movie_keywords (
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  keyword_id bigint NOT NULL REFERENCES catalog_keywords(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'tmdb',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT movie_keywords_source_check CHECK (source IN ('tmdb', 'manual')),
  PRIMARY KEY (movie_id, keyword_id)
);

ALTER TABLE movie_keywords
  DROP CONSTRAINT IF EXISTS movie_keywords_source_check;

ALTER TABLE movie_keywords
  ADD CONSTRAINT movie_keywords_source_check CHECK (source IN ('tmdb', 'manual'));

CREATE INDEX IF NOT EXISTS idx_movie_keywords_keyword_id
  ON movie_keywords (keyword_id);

CREATE TABLE IF NOT EXISTS catalog_watch_providers (
  id bigserial PRIMARY KEY,
  tmdb_id int,
  provider_name text NOT NULL,
  logo_path text,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_watch_providers_tmdb_id_unique
  ON catalog_watch_providers (tmdb_id)
  WHERE tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_watch_providers_name_lower
  ON catalog_watch_providers (lower(provider_name));

CREATE TABLE IF NOT EXISTS movie_watch_providers (
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  provider_id bigint NOT NULL REFERENCES catalog_watch_providers(id) ON DELETE CASCADE,
  region text NOT NULL,
  availability_type text NOT NULL,
  display_priority int,
  link text,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT movie_watch_providers_availability_type_check CHECK (
    availability_type IN ('flatrate', 'rent', 'buy', 'ads', 'free')
  ),
  PRIMARY KEY (movie_id, provider_id, region, availability_type)
);

CREATE INDEX IF NOT EXISTS idx_movie_watch_providers_region_type
  ON movie_watch_providers (region, availability_type);

CREATE INDEX IF NOT EXISTS idx_movie_watch_providers_provider_id
  ON movie_watch_providers (provider_id);

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
    action IN ('enqueue_backfill', 'bulk_enqueue_backfill', 'manual_update')
  )
);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_audit_target_created_at
  ON catalog_repair_audit (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_audit_issue_created_at
  ON catalog_repair_audit (issue_key, created_at DESC);

CREATE TABLE IF NOT EXISTS catalog_repair_batches (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  actor text NOT NULL,
  issue_key text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  status text NOT NULL DEFAULT 'enqueueing',
  requested_limit integer NOT NULL DEFAULT 0,
  total_candidates integer NOT NULL DEFAULT 0,
  attempted_count integer NOT NULL DEFAULT 0,
  queued_count integer NOT NULL DEFAULT 0,
  deduped_count integer NOT NULL DEFAULT 0,
  unavailable_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  note text,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT catalog_repair_batches_action_check CHECK (
    action IN ('enqueue_backfill', 'bulk_enqueue_backfill')
  ),
  CONSTRAINT catalog_repair_batches_status_check CHECK (
    status IN (
      'enqueueing',
      'queued',
      'processing',
      'partial',
      'failed',
      'unavailable',
      'empty',
      'completed'
    )
  )
);

CREATE TABLE IF NOT EXISTS catalog_repair_batch_items (
  id bigserial PRIMARY KEY,
  batch_id bigint NOT NULL REFERENCES catalog_repair_batches(id) ON DELETE CASCADE,
  movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE RESTRICT,
  issue_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  queue_name text,
  job_name text,
  job_id text,
  language text,
  reason text,
  error_message text,
  movie_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT catalog_repair_batch_items_status_check CHECK (
    status IN (
      'pending',
      'queued',
      'deduped',
      'unavailable',
      'enqueue_failed',
      'processing',
      'completed',
      'completed_resolved',
      'completed_unresolved',
      'failed',
      'skipped'
    )
  )
);

ALTER TABLE catalog_repair_batches
  DROP CONSTRAINT IF EXISTS catalog_repair_batches_status_check;

ALTER TABLE catalog_repair_batches
  ADD CONSTRAINT catalog_repair_batches_status_check CHECK (
    status IN (
      'enqueueing',
      'queued',
      'processing',
      'partial',
      'failed',
      'unavailable',
      'empty',
      'completed'
    )
  );

ALTER TABLE catalog_repair_batch_items
  DROP CONSTRAINT IF EXISTS catalog_repair_batch_items_status_check;

ALTER TABLE catalog_repair_batch_items
  ADD CONSTRAINT catalog_repair_batch_items_status_check CHECK (
    status IN (
      'pending',
      'queued',
      'deduped',
      'unavailable',
      'enqueue_failed',
      'processing',
      'completed',
      'completed_resolved',
      'completed_unresolved',
      'failed',
      'skipped'
    )
  );

ALTER TABLE catalog_repair_audit
  ADD COLUMN IF NOT EXISTS repair_batch_id bigint REFERENCES catalog_repair_batches(id) ON DELETE SET NULL;

ALTER TABLE catalog_repair_audit
  ADD COLUMN IF NOT EXISTS repair_batch_item_id bigint REFERENCES catalog_repair_batch_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_repair_batches_created_at
  ON catalog_repair_batches (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_batches_issue_created_at
  ON catalog_repair_batches (issue_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_batches_status_updated_at
  ON catalog_repair_batches (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_batch_items_batch_status
  ON catalog_repair_batch_items (batch_id, status, id);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_batch_items_movie_created_at
  ON catalog_repair_batch_items (movie_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_repair_batch_items_job_id
  ON catalog_repair_batch_items (job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_repair_audit_batch_created_at
  ON catalog_repair_audit (repair_batch_id, created_at DESC)
  WHERE repair_batch_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_duplicate_merge_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  actor text NOT NULL,
  canonical_movie_id bigint NOT NULL REFERENCES movies(id) ON DELETE RESTRICT,
  loser_movie_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_duplicate_merge_audit_action_check CHECK (
    action IN ('merge_movies')
  )
);

CREATE INDEX IF NOT EXISTS idx_catalog_duplicate_merge_audit_canonical_created_at
  ON catalog_duplicate_merge_audit (canonical_movie_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_duplicate_merge_audit_created_at
  ON catalog_duplicate_merge_audit (created_at DESC, id DESC);

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

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS recommendation_eval_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'cli',
  actor text,
  queue_name text,
  job_name text,
  job_id text,
  git_sha text,
  app_version text,
  requested_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_eval_runs_mode_check CHECK (
    mode IN ('mock', 'real-data', 'live')
  ),
  CONSTRAINT recommendation_eval_runs_status_check CHECK (
    status IN (
      'pending',
      'queued',
      'processing',
      'completed',
      'failed',
      'enqueue_failed',
      'canceled'
    )
  ),
  CONSTRAINT recommendation_eval_runs_source_check CHECK (
    source IN ('cli', 'backoffice', 'schedule', 'worker', 'ci')
  )
);

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS mode text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'cli';

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS actor text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS queue_name text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS job_name text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS job_id text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS git_sha text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS app_version text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS requested_options jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS report jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS summary jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS queued_at timestamptz;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE recommendation_eval_runs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE recommendation_eval_runs
  DROP CONSTRAINT IF EXISTS recommendation_eval_runs_mode_check;

ALTER TABLE recommendation_eval_runs
  ADD CONSTRAINT recommendation_eval_runs_mode_check CHECK (
    mode IN ('mock', 'real-data', 'live')
  );

ALTER TABLE recommendation_eval_runs
  DROP CONSTRAINT IF EXISTS recommendation_eval_runs_status_check;

ALTER TABLE recommendation_eval_runs
  ADD CONSTRAINT recommendation_eval_runs_status_check CHECK (
    status IN (
      'pending',
      'queued',
      'processing',
      'completed',
      'failed',
      'enqueue_failed',
      'canceled'
    )
  );

ALTER TABLE recommendation_eval_runs
  DROP CONSTRAINT IF EXISTS recommendation_eval_runs_source_check;

ALTER TABLE recommendation_eval_runs
  ADD CONSTRAINT recommendation_eval_runs_source_check CHECK (
    source IN ('cli', 'backoffice', 'schedule', 'worker', 'ci')
  );

CREATE TABLE IF NOT EXISTS recommendation_eval_results (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES recommendation_eval_runs(id) ON DELETE CASCADE,
  fixture_id text NOT NULL,
  fixture_name text NOT NULL,
  status text NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 100,
  min_passing_score integer NOT NULL DEFAULT 85,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  fixture_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_eval_results_status_check CHECK (
    status IN ('passed', 'failed', 'error')
  )
);

ALTER TABLE recommendation_eval_results
  ADD COLUMN IF NOT EXISTS fixture_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE recommendation_eval_results
  ADD COLUMN IF NOT EXISTS response jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE recommendation_eval_results
  ADD COLUMN IF NOT EXISTS result jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE recommendation_eval_results
  DROP CONSTRAINT IF EXISTS recommendation_eval_results_status_check;

ALTER TABLE recommendation_eval_results
  ADD CONSTRAINT recommendation_eval_results_status_check CHECK (
    status IN ('passed', 'failed', 'error')
  );

CREATE INDEX IF NOT EXISTS idx_recommendation_eval_runs_created_at
  ON recommendation_eval_runs (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_eval_runs_status_updated_at
  ON recommendation_eval_runs (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_eval_runs_job_id
  ON recommendation_eval_runs (job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_eval_results_run_fixture
  ON recommendation_eval_results (run_id, fixture_id);
