import { CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL } from '../../catalogDuplicateMergeSchema.js';

export const REVIEW_AND_REPAIR_SCHEMA_SQL = `
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
        action IN ('enqueue_backfill', 'bulk_enqueue_backfill')
      )
    );

    ALTER TABLE catalog_repair_audit
      DROP CONSTRAINT IF EXISTS catalog_repair_audit_action_check;

    ALTER TABLE catalog_repair_audit
      ADD CONSTRAINT catalog_repair_audit_action_check CHECK (
        action IN ('enqueue_backfill', 'bulk_enqueue_backfill')
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

    ${CATALOG_DUPLICATE_MERGE_AUDIT_SCHEMA_SQL}
  `;
