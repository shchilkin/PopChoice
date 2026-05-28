import { getPool } from './db.js';

export type CatalogRepairAction = 'enqueue_backfill' | 'bulk_enqueue_backfill';

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
        result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
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
