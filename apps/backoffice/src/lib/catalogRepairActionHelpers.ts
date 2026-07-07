import type { CatalogBackfillReason } from '../catalogMaintenanceQueue';
import {
  DEFAULT_ASYNC_BULK_REPAIR_CHUNK_SIZE,
  DEFAULT_BULK_REPAIR_LIMIT,
  MAX_ASYNC_BULK_REPAIR_LIMIT,
  MAX_BULK_REPAIR_LIMIT,
  parsePositiveIntParam,
} from './backofficeParams';
import { backofficeActionError } from './backofficeRuntime';

export const REPAIRABLE_CATALOG_ISSUE_KEYS = new Set([
  'missing_poster_url',
  'missing_localized_name',
  'missing_tmdb_id',
  'missing_runtime',
  'missing_age_rating',
  'missing_tmdb_matched_at',
  'stale_tmdb_metadata',
  'missing_cast_metadata',
  'missing_director_metadata',
  'missing_genre_metadata',
  'missing_keyword_metadata',
]);

export type CatalogRepairActionStatus =
  'queued' | 'deduped' | 'orchestration_queued' | 'partial' | 'failed' | 'unavailable' | 'empty';

export type CatalogBulkRepairSummaryCounters = {
  attempted: number;
  queued: number;
  deduped: number;
  failed: number;
  unavailable: number;
};

export function parseMovieId(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw backofficeActionError('Movie id is required.');
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw backofficeActionError('Movie id must be numeric.');
  }

  return trimmed;
}

export function parseCatalogIssueKey(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || !REPAIRABLE_CATALOG_ISSUE_KEYS.has(value)) {
    throw backofficeActionError('Unsupported catalog-health repair issue.');
  }

  return value;
}

export function getBackfillReasonForIssue(issueKey: string): CatalogBackfillReason {
  if (issueKey === 'missing_tmdb_id') return 'missing_tmdb_id';
  if (issueKey === 'stale_tmdb_metadata') return 'manual_refresh';
  return 'missing_metadata';
}

export function catalogRepairMessage(status: CatalogRepairActionStatus): string {
  if (status === 'orchestration_queued') {
    return 'Catalog repair orchestration accepted. A worker will create repair items and queue backfill jobs in chunks.';
  }
  if (status === 'queued') {
    return 'Catalog backfill job queued. Workers will process it through the existing rate-limited TMDB path.';
  }
  if (status === 'deduped') {
    return 'Catalog backfill job is already queued. Workers will process the existing job.';
  }
  if (status === 'empty') {
    return 'No affected movies are currently available for this repair action.';
  }
  if (status === 'partial') {
    return 'Catalog repair batch partially queued. Review the queued, deduped, unavailable, and failed counts.';
  }
  if (status === 'failed') {
    return 'Catalog repair jobs failed to enqueue. Check backoffice logs before retrying.';
  }

  return 'Catalog repair queue is unavailable. Check REDIS_URL and the backoffice logs.';
}

export function parseBulkRepairLimit(value: FormDataEntryValue | null): number {
  return typeof value === 'string'
    ? parsePositiveIntParam(value, DEFAULT_BULK_REPAIR_LIMIT, { max: MAX_BULK_REPAIR_LIMIT })
    : DEFAULT_BULK_REPAIR_LIMIT;
}

export function parseAsyncBulkRepairLimit(
  value: FormDataEntryValue | null,
  fallback: number,
): number {
  return typeof value === 'string'
    ? parsePositiveIntParam(value, fallback, { max: MAX_ASYNC_BULK_REPAIR_LIMIT })
    : Math.min(fallback, MAX_ASYNC_BULK_REPAIR_LIMIT);
}

export function getAsyncBulkRepairPageSize(): number {
  return DEFAULT_ASYNC_BULK_REPAIR_CHUNK_SIZE;
}

export function getBulkRepairStatus(
  summary: CatalogBulkRepairSummaryCounters,
): CatalogRepairActionStatus {
  if (summary.attempted === 0) return 'empty';
  if (summary.failed + summary.unavailable > 0 && summary.queued + summary.deduped > 0) {
    return 'partial';
  }
  if (summary.queued + summary.deduped > 0) return 'queued';
  if (summary.failed > 0) return 'failed';
  return 'unavailable';
}
