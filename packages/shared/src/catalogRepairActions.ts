import { getPool } from './db.js';

export type CatalogRepairAction = 'enqueue_backfill' | 'bulk_enqueue_backfill';
export type CatalogRepairBatchStatus =
  | 'enqueueing'
  | 'queued'
  | 'processing'
  | 'partial'
  | 'failed'
  | 'unavailable'
  | 'empty'
  | 'completed';
export type CatalogRepairItemStatus =
  | 'pending'
  | 'queued'
  | 'deduped'
  | 'unavailable'
  | 'enqueue_failed'
  | 'processing'
  | 'completed'
  | 'completed_resolved'
  | 'completed_unresolved'
  | 'failed'
  | 'skipped';

export interface CatalogRepairMovieSnapshot {
  id: string;
  name: string;
  year: number;
  duration: number;
  age_rating: string;
  tmdb_id: number | null;
  poster_url: string | null;
  localized_name: string | null;
  tmdb_match_confidence: number | null;
  tmdb_match_source: string | null;
  tmdb_matched_at: string | null;
  tmdb_metadata_refreshed_at: string | null;
}

export interface CatalogRepairActionAudit {
  id: string;
  action: CatalogRepairAction;
  actor: string;
  issueKey: string;
  targetType: string;
  targetId: string;
  note: string | null;
  previousState: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  repairBatchId: string | null;
  repairBatchItemId: string | null;
}

export interface CatalogRepairActionAuditPage {
  audit: CatalogRepairActionAudit[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface RecordCatalogRepairActionInput {
  action: CatalogRepairAction;
  actor: string;
  issueKey: string;
  targetType: string;
  targetId: string | number;
  note?: string;
  previousState: Record<string, unknown>;
  result: Record<string, unknown>;
  repairBatchId?: string | number;
  repairBatchItemId?: string | number;
}

export interface CatalogRepairBatch {
  id: string;
  action: CatalogRepairAction;
  actor: string;
  issueKey: string;
  targetType: string;
  targetId: string;
  status: CatalogRepairBatchStatus;
  requestedLimit: number;
  totalCandidates: number;
  attemptedCount: number;
  queuedCount: number;
  dedupedCount: number;
  unavailableCount: number;
  failedCount: number;
  completedCount: number;
  skippedCount: number;
  note: string | null;
  previousState: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CatalogRepairBatchItem {
  id: string;
  batchId: string;
  movieId: string;
  issueKey: string;
  status: CatalogRepairItemStatus;
  queueName: string | null;
  jobName: string | null;
  jobId: string | null;
  language: string | null;
  reason: string | null;
  errorMessage: string | null;
  movieSnapshot: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateCatalogRepairBatchInput {
  action: CatalogRepairAction;
  actor: string;
  issueKey: string;
  targetType: string;
  targetId: string | number;
  requestedLimit: number;
  totalCandidates: number;
  attemptedCount?: number;
  note?: string;
  previousState: Record<string, unknown>;
}

export interface CreateCatalogRepairBatchItemInput {
  batchId: string | number;
  movieId: string | number;
  issueKey: string;
  movieSnapshot: Record<string, unknown>;
  reason?: string;
  language?: string;
}

export interface UpdateCatalogRepairBatchItemEnqueueInput {
  itemId: string | number;
  status: Extract<CatalogRepairItemStatus, 'queued' | 'deduped' | 'unavailable' | 'enqueue_failed'>;
  queueName?: string;
  jobName?: string;
  jobId?: string;
  language?: string;
  errorMessage?: string;
  result?: Record<string, unknown>;
}

export interface UpdateCatalogRepairBatchItemStatusInput {
  itemId: string | number;
  status: Extract<
    CatalogRepairItemStatus,
    | 'processing'
    | 'completed'
    | 'completed_resolved'
    | 'completed_unresolved'
    | 'failed'
    | 'skipped'
  >;
  errorMessage?: string;
  result?: Record<string, unknown>;
}

export function catalogRepairCompletionStatusForResolution(
  resolved: boolean,
): Extract<CatalogRepairItemStatus, 'completed_resolved' | 'completed_unresolved'> {
  return resolved ? 'completed_resolved' : 'completed_unresolved';
}

export interface CatalogRepairBatchPage {
  batches: CatalogRepairBatch[];
  totalCount: number;
  limit: number;
  offset: number;
}

export type CatalogRepairBatchStatusFilter = CatalogRepairBatchStatus | 'all';
export type CatalogRepairBatchSort = 'newest' | 'updated' | 'needs_review';

export interface CatalogRepairBatchItemPage {
  items: CatalogRepairBatchItem[];
  totalCount: number;
  limit: number;
  offset: number;
}

export type CatalogRepairBatchItemStatusFilter =
  | CatalogRepairItemStatus
  | 'all'
  | 'failed'
  | 'in_progress'
  | 'needs_review';
export type CatalogRepairBatchItemSort = 'oldest' | 'newest' | 'needs_review';

export interface CatalogRepairBatchDetail {
  batch: CatalogRepairBatch;
  items: CatalogRepairBatchItemPage;
}

type CatalogRepairMovieSnapshotRow = Omit<
  CatalogRepairMovieSnapshot,
  'id' | 'year' | 'duration' | 'tmdb_id' | 'tmdb_match_confidence'
> & {
  id: string;
  year: string | number;
  duration: string | number;
  tmdb_id: string | number | null;
  tmdb_match_confidence: string | number | null;
};

type CatalogRepairActionAuditRow = {
  id: string;
  action: CatalogRepairAction;
  actor: string;
  issue_key: string;
  target_type: string;
  target_id: string;
  note: string | null;
  previous_state: unknown;
  result: unknown;
  created_at: string;
  repair_batch_id?: string | number | null;
  repair_batch_item_id?: string | number | null;
};

type CatalogRepairBatchRow = {
  id: string | number;
  action: CatalogRepairAction;
  actor: string;
  issue_key: string;
  target_type: string;
  target_id: string;
  status: CatalogRepairBatchStatus;
  requested_limit: string | number;
  total_candidates: string | number;
  attempted_count: string | number;
  queued_count: string | number;
  deduped_count: string | number;
  unavailable_count: string | number;
  failed_count: string | number;
  completed_count: string | number;
  skipped_count: string | number;
  note: string | null;
  previous_state: unknown;
  result: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type CatalogRepairBatchItemRow = {
  id: string | number;
  batch_id: string | number;
  movie_id: string | number;
  issue_key: string;
  status: CatalogRepairItemStatus;
  queue_name: string | null;
  job_name: string | null;
  job_id: string | null;
  language: string | null;
  reason: string | null;
  error_message: string | null;
  movie_snapshot: unknown;
  result: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeMovieSnapshot(row: CatalogRepairMovieSnapshotRow): CatalogRepairMovieSnapshot {
  return {
    ...row,
    id: String(row.id),
    year: Number(row.year),
    duration: Number(row.duration),
    tmdb_id: row.tmdb_id === null ? null : Number(row.tmdb_id),
    tmdb_match_confidence:
      row.tmdb_match_confidence === null ? null : Number(row.tmdb_match_confidence),
  };
}

function normalizeAudit(row: CatalogRepairActionAuditRow): CatalogRepairActionAudit {
  return {
    id: String(row.id),
    action: row.action,
    actor: row.actor,
    issueKey: row.issue_key,
    targetType: row.target_type,
    targetId: row.target_id,
    note: row.note,
    previousState: toRecord(row.previous_state),
    result: toRecord(row.result),
    createdAt: row.created_at,
    repairBatchId:
      row.repair_batch_id === null || row.repair_batch_id === undefined
        ? null
        : String(row.repair_batch_id),
    repairBatchItemId:
      row.repair_batch_item_id === null || row.repair_batch_item_id === undefined
        ? null
        : String(row.repair_batch_item_id),
  };
}

function normalizeBatch(row: CatalogRepairBatchRow): CatalogRepairBatch {
  return {
    id: String(row.id),
    action: row.action,
    actor: row.actor,
    issueKey: row.issue_key,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    requestedLimit: toNumber(row.requested_limit),
    totalCandidates: toNumber(row.total_candidates),
    attemptedCount: toNumber(row.attempted_count),
    queuedCount: toNumber(row.queued_count),
    dedupedCount: toNumber(row.deduped_count),
    unavailableCount: toNumber(row.unavailable_count),
    failedCount: toNumber(row.failed_count),
    completedCount: toNumber(row.completed_count),
    skippedCount: toNumber(row.skipped_count),
    note: row.note,
    previousState: toRecord(row.previous_state),
    result: toRecord(row.result),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function normalizeBatchItem(row: CatalogRepairBatchItemRow): CatalogRepairBatchItem {
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    movieId: String(row.movie_id),
    issueKey: row.issue_key,
    status: row.status,
    queueName: row.queue_name,
    jobName: row.job_name,
    jobId: row.job_id,
    language: row.language,
    reason: row.reason,
    errorMessage: row.error_message,
    movieSnapshot: toRecord(row.movie_snapshot),
    result: toRecord(row.result),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function clampAuditLimit(limit: number): number {
  return Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 25;
}

function clampAuditOffset(offset: number): number {
  return Number.isSafeInteger(offset) && offset > 0 ? Math.min(offset, 100_000) : 0;
}

export const CATALOG_REPAIR_BATCH_SCHEMA_SQL = `
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
`;

export async function ensureCatalogRepairActionSchema(): Promise<void> {
  await getPool().query(`
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

    ${CATALOG_REPAIR_BATCH_SCHEMA_SQL}
  `);
}

export async function getCatalogRepairMovieSnapshot(
  movieId: string | number,
): Promise<CatalogRepairMovieSnapshot | null> {
  const result = await getPool().query<CatalogRepairMovieSnapshotRow>(
    `SELECT
        id::text,
        name,
        year,
        duration,
        age_rating,
        tmdb_id,
        poster_url,
        localized_name,
        tmdb_match_confidence,
        tmdb_match_source,
        tmdb_matched_at::text,
        tmdb_metadata_refreshed_at::text
       FROM movies
      WHERE id = $1`,
    [movieId],
  );

  return result.rows[0] ? normalizeMovieSnapshot(result.rows[0]) : null;
}

export async function createCatalogRepairBatch(
  input: CreateCatalogRepairBatchInput,
): Promise<CatalogRepairBatch> {
  const result = await getPool().query<CatalogRepairBatchRow>(
    `INSERT INTO catalog_repair_batches (
        action,
        actor,
        issue_key,
        target_type,
        target_id,
        requested_limit,
        total_candidates,
        attempted_count,
        note,
        previous_state
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      RETURNING
        id::text,
        action,
        actor,
        issue_key,
        target_type,
        target_id,
        status,
        requested_limit,
        total_candidates,
        attempted_count,
        queued_count,
        deduped_count,
        unavailable_count,
        failed_count,
        completed_count,
        skipped_count,
        note,
        previous_state,
        result,
        created_at::text,
        updated_at::text,
        completed_at::text`,
    [
      input.action,
      input.actor,
      input.issueKey,
      input.targetType,
      String(input.targetId),
      input.requestedLimit,
      input.totalCandidates,
      input.attemptedCount ?? 0,
      input.note?.trim() || null,
      JSON.stringify(input.previousState),
    ],
  );

  return normalizeBatch(result.rows[0]);
}

export async function createCatalogRepairBatchItem(
  input: CreateCatalogRepairBatchItemInput,
): Promise<CatalogRepairBatchItem> {
  const result = await getPool().query<CatalogRepairBatchItemRow>(
    `INSERT INTO catalog_repair_batch_items (
        batch_id,
        movie_id,
        issue_key,
        movie_snapshot,
        reason,
        language
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6)
      RETURNING
        id::text,
        batch_id::text,
        movie_id::text,
        issue_key,
        status,
        queue_name,
        job_name,
        job_id,
        language,
        reason,
        error_message,
        movie_snapshot,
        result,
        created_at::text,
        updated_at::text,
        completed_at::text`,
    [
      input.batchId,
      input.movieId,
      input.issueKey,
      JSON.stringify(input.movieSnapshot),
      input.reason ?? null,
      input.language ?? null,
    ],
  );

  return normalizeBatchItem(result.rows[0]);
}

export async function updateCatalogRepairBatchItemEnqueueResult(
  input: UpdateCatalogRepairBatchItemEnqueueInput,
): Promise<CatalogRepairBatchItem> {
  const result = await getPool().query<CatalogRepairBatchItemRow>(
    `UPDATE catalog_repair_batch_items
        SET status = $2,
            queue_name = COALESCE($3, queue_name),
            job_name = COALESCE($4, job_name),
            job_id = COALESCE($5, job_id),
            language = COALESCE($6, language),
            error_message = $7,
            result = COALESCE($8::jsonb, result),
            updated_at = now(),
            completed_at = CASE
              WHEN $2 IN ('unavailable', 'enqueue_failed') THEN now()
              ELSE completed_at
            END
      WHERE id = $1
      RETURNING
        id::text,
        batch_id::text,
        movie_id::text,
        issue_key,
        status,
        queue_name,
        job_name,
        job_id,
        language,
        reason,
        error_message,
        movie_snapshot,
        result,
        created_at::text,
        updated_at::text,
        completed_at::text`,
    [
      input.itemId,
      input.status,
      input.queueName ?? null,
      input.jobName ?? null,
      input.jobId ?? null,
      input.language ?? null,
      input.errorMessage ?? null,
      input.result ? JSON.stringify(input.result) : null,
    ],
  );

  return normalizeBatchItem(result.rows[0]);
}

export async function updateCatalogRepairBatchItemStatus(
  input: UpdateCatalogRepairBatchItemStatusInput,
): Promise<CatalogRepairBatchItem> {
  const result = await getPool().query<CatalogRepairBatchItemRow>(
    `UPDATE catalog_repair_batch_items
        SET status = $2,
            error_message = $3,
            result = COALESCE($4::jsonb, result),
            updated_at = now(),
            completed_at = CASE
              WHEN $2 IN (
                'completed',
                'completed_resolved',
                'completed_unresolved',
                'failed',
                'skipped'
              ) THEN COALESCE(completed_at, now())
              ELSE completed_at
            END
      WHERE id = $1
      RETURNING
        id::text,
        batch_id::text,
        movie_id::text,
        issue_key,
        status,
        queue_name,
        job_name,
        job_id,
        language,
        reason,
        error_message,
        movie_snapshot,
        result,
        created_at::text,
        updated_at::text,
        completed_at::text`,
    [
      input.itemId,
      input.status,
      input.errorMessage ?? null,
      input.result ? JSON.stringify(input.result) : null,
    ],
  );

  return normalizeBatchItem(result.rows[0]);
}

export async function refreshCatalogRepairBatchCounts(
  batchId: string | number,
): Promise<CatalogRepairBatch> {
  const result = await getPool().query<CatalogRepairBatchRow>(
    `WITH counts AS (
       SELECT
         COUNT(*)::int AS attempted_count,
         COUNT(*) FILTER (WHERE status = 'queued')::int AS queued_count,
         COUNT(*) FILTER (WHERE status = 'deduped')::int AS deduped_count,
         COUNT(*) FILTER (WHERE status = 'unavailable')::int AS unavailable_count,
         COUNT(*) FILTER (WHERE status IN ('enqueue_failed', 'failed'))::int AS failed_count,
         COUNT(*) FILTER (WHERE status IN ('completed', 'completed_resolved'))::int AS completed_count,
         COUNT(*) FILTER (WHERE status = 'completed_unresolved')::int AS unresolved_count,
         COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped_count,
         COUNT(*) FILTER (WHERE status = 'processing')::int AS processing_count
       FROM catalog_repair_batch_items
       WHERE batch_id = $1
     ),
     next_values AS (
       SELECT
         *,
         CASE
           WHEN attempted_count = 0 THEN 'empty'
           WHEN completed_count = attempted_count THEN 'completed'
           WHEN failed_count = attempted_count THEN 'failed'
           WHEN unavailable_count = attempted_count THEN 'unavailable'
           WHEN completed_count
             + unresolved_count
             + skipped_count
             + failed_count
             + unavailable_count = attempted_count
             THEN 'partial'
           WHEN failed_count + unavailable_count + unresolved_count + skipped_count > 0 THEN 'partial'
           WHEN processing_count > 0 THEN 'processing'
           WHEN queued_count + deduped_count > 0 THEN 'queued'
           ELSE 'enqueueing'
         END AS next_status
       FROM counts
     )
     UPDATE catalog_repair_batches batch
        SET status = next_values.next_status,
            attempted_count = next_values.attempted_count,
            queued_count = next_values.queued_count,
            deduped_count = next_values.deduped_count,
            unavailable_count = next_values.unavailable_count,
            failed_count = next_values.failed_count,
            completed_count = next_values.completed_count,
            skipped_count = next_values.skipped_count,
            result = jsonb_build_object(
              'attempted', next_values.attempted_count,
              'queued', next_values.queued_count,
              'deduped', next_values.deduped_count,
              'unavailable', next_values.unavailable_count,
              'failed', next_values.failed_count,
              'completed', next_values.completed_count,
              'completedUnresolved', next_values.unresolved_count,
              'skipped', next_values.skipped_count
            ),
            updated_at = now(),
            completed_at = CASE
              WHEN next_values.next_status IN ('empty', 'failed', 'unavailable', 'completed')
                OR (
                  next_values.next_status = 'partial'
                  AND next_values.completed_count
                    + next_values.unresolved_count
                    + next_values.skipped_count
                    + next_values.failed_count
                    + next_values.unavailable_count = next_values.attempted_count
                )
                THEN COALESCE(batch.completed_at, now())
              ELSE batch.completed_at
            END
       FROM next_values
      WHERE batch.id = $1
      RETURNING
        batch.id::text,
        batch.action,
        batch.actor,
        batch.issue_key,
        batch.target_type,
        batch.target_id,
        batch.status,
        batch.requested_limit,
        batch.total_candidates,
        batch.attempted_count,
        batch.queued_count,
        batch.deduped_count,
        batch.unavailable_count,
        batch.failed_count,
        batch.completed_count,
        batch.skipped_count,
        batch.note,
        batch.previous_state,
        batch.result,
        batch.created_at::text,
        batch.updated_at::text,
        batch.completed_at::text`,
    [batchId],
  );

  return normalizeBatch(result.rows[0]);
}

export async function recordCatalogRepairAction(
  input: RecordCatalogRepairActionInput,
): Promise<CatalogRepairActionAudit> {
  const result = await getPool().query<CatalogRepairActionAuditRow>(
    `INSERT INTO catalog_repair_audit (
        action,
        actor,
        issue_key,
        target_type,
        target_id,
        note,
        previous_state,
        result,
        repair_batch_id,
        repair_batch_item_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
      RETURNING
        id::text,
        action,
        actor,
        issue_key,
        target_type,
        target_id,
        note,
        previous_state,
        result,
        repair_batch_id::text,
        repair_batch_item_id::text,
        created_at::text`,
    [
      input.action,
      input.actor,
      input.issueKey,
      input.targetType,
      String(input.targetId),
      input.note?.trim() || null,
      JSON.stringify(input.previousState),
      JSON.stringify(input.result),
      input.repairBatchId ?? null,
      input.repairBatchItemId ?? null,
    ],
  );

  return normalizeAudit(result.rows[0]);
}

export async function listCatalogRepairAudit(limit = 25): Promise<CatalogRepairActionAudit[]> {
  const page = await listCatalogRepairAuditPage({ limit, offset: 0 });
  return page.audit;
}

export async function listCatalogRepairAuditPage({
  limit = 25,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}): Promise<CatalogRepairActionAuditPage> {
  const boundedLimit = clampAuditLimit(limit);
  const boundedOffset = clampAuditOffset(offset);
  const [countResult, auditResult] = await Promise.all([
    getPool().query<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count
         FROM catalog_repair_audit`,
    ),
    getPool().query<CatalogRepairActionAuditRow>(
      `SELECT
          id::text,
          action,
          actor,
          issue_key,
          target_type,
          target_id,
          note,
          previous_state,
          result,
          repair_batch_id::text,
          repair_batch_item_id::text,
          created_at::text
         FROM catalog_repair_audit
        ORDER BY created_at DESC, id DESC
        LIMIT $1
        OFFSET $2`,
      [boundedLimit, boundedOffset],
    ),
  ]);

  return {
    audit: auditResult.rows.map(normalizeAudit),
    totalCount: toNumber(countResult.rows[0]?.count),
    limit: boundedLimit,
    offset: boundedOffset,
  };
}

export async function listCatalogRepairBatchPage({
  limit = 25,
  offset = 0,
  status = 'all',
  sort = 'newest',
}: {
  limit?: number;
  offset?: number;
  status?: CatalogRepairBatchStatusFilter;
  sort?: CatalogRepairBatchSort;
} = {}): Promise<CatalogRepairBatchPage> {
  const boundedLimit = clampAuditLimit(limit);
  const boundedOffset = clampAuditOffset(offset);
  const filters: string[] = [];
  const values: Array<number | string> = [];

  if (status !== 'all') {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const orderClause =
    sort === 'needs_review'
      ? `ORDER BY
          CASE
            WHEN status IN ('failed', 'partial', 'unavailable') THEN 1000
            ELSE 0
          END
          + failed_count
          + unavailable_count
          + CASE WHEN completed_count < attempted_count THEN 1 ELSE 0 END DESC,
          updated_at DESC,
          id DESC`
      : sort === 'updated'
        ? 'ORDER BY updated_at DESC, id DESC'
        : 'ORDER BY created_at DESC, id DESC';
  const pageValues = [...values, boundedLimit, boundedOffset];
  const [countResult, batchResult] = await Promise.all([
    getPool().query<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count
         FROM catalog_repair_batches
        ${whereClause}`,
      values,
    ),
    getPool().query<CatalogRepairBatchRow>(
      `SELECT
          id::text,
          action,
          actor,
          issue_key,
          target_type,
          target_id,
          status,
          requested_limit,
          total_candidates,
          attempted_count,
          queued_count,
          deduped_count,
          unavailable_count,
          failed_count,
          completed_count,
          skipped_count,
          note,
          previous_state,
          result,
          created_at::text,
          updated_at::text,
          completed_at::text
         FROM catalog_repair_batches
        ${whereClause}
        ${orderClause}
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}`,
      pageValues,
    ),
  ]);

  return {
    batches: batchResult.rows.map(normalizeBatch),
    totalCount: toNumber(countResult.rows[0]?.count),
    limit: boundedLimit,
    offset: boundedOffset,
  };
}

export async function getCatalogRepairBatchDetail(
  batchId: string | number,
  {
    limit = 100,
    offset = 0,
    status = 'all',
    sort = 'oldest',
  }: {
    limit?: number;
    offset?: number;
    status?: CatalogRepairBatchItemStatusFilter;
    sort?: CatalogRepairBatchItemSort;
  } = {},
): Promise<CatalogRepairBatchDetail | null> {
  const boundedLimit = clampAuditLimit(limit);
  const boundedOffset = clampAuditOffset(offset);
  const batchResult = await getPool().query<CatalogRepairBatchRow>(
    `SELECT
        id::text,
        action,
        actor,
        issue_key,
        target_type,
        target_id,
        status,
        requested_limit,
        total_candidates,
        attempted_count,
        queued_count,
        deduped_count,
        unavailable_count,
        failed_count,
        completed_count,
        skipped_count,
        note,
        previous_state,
        result,
        created_at::text,
        updated_at::text,
        completed_at::text
       FROM catalog_repair_batches
      WHERE id = $1`,
    [batchId],
  );

  if (!batchResult.rows[0]) return null;

  const itemFilters: string[] = ['batch_id = $1'];
  const itemValues: Array<number | string> = [batchId];

  if (status !== 'all') {
    if (status === 'needs_review') {
      itemFilters.push(
        "status IN ('failed', 'enqueue_failed', 'unavailable', 'completed_unresolved')",
      );
    } else if (status === 'failed') {
      itemFilters.push("status IN ('failed', 'enqueue_failed', 'unavailable')");
    } else if (status === 'in_progress') {
      itemFilters.push("status IN ('pending', 'queued', 'processing')");
    } else {
      itemValues.push(status);
      itemFilters.push(`status = $${itemValues.length}`);
    }
  }

  const itemWhereClause = `WHERE ${itemFilters.join(' AND ')}`;
  const itemOrderClause =
    sort === 'needs_review'
      ? `ORDER BY
          CASE
            WHEN status IN ('failed', 'enqueue_failed', 'unavailable') THEN 100
            WHEN status = 'completed_unresolved' THEN 90
            WHEN status IN ('pending', 'queued', 'processing') THEN 50
            ELSE 0
          END DESC,
          updated_at DESC,
          id ASC`
      : sort === 'newest'
        ? 'ORDER BY updated_at DESC, id DESC'
        : 'ORDER BY id ASC';
  const itemPageValues = [...itemValues, boundedLimit, boundedOffset];
  const [countResult, itemResult] = await Promise.all([
    getPool().query<{ count: number | string }>(
      `SELECT COUNT(*)::int AS count
         FROM catalog_repair_batch_items
        ${itemWhereClause}`,
      itemValues,
    ),
    getPool().query<CatalogRepairBatchItemRow>(
      `SELECT
          id::text,
          batch_id::text,
          movie_id::text,
          issue_key,
          status,
          queue_name,
          job_name,
          job_id,
          language,
          reason,
          error_message,
          movie_snapshot,
          result,
          created_at::text,
          updated_at::text,
          completed_at::text
         FROM catalog_repair_batch_items
        ${itemWhereClause}
        ${itemOrderClause}
        LIMIT $${itemValues.length + 1}
        OFFSET $${itemValues.length + 2}`,
      itemPageValues,
    ),
  ]);

  return {
    batch: normalizeBatch(batchResult.rows[0]),
    items: {
      items: itemResult.rows.map(normalizeBatchItem),
      totalCount: toNumber(countResult.rows[0]?.count),
      limit: boundedLimit,
      offset: boundedOffset,
    },
  };
}
