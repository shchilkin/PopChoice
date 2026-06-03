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
