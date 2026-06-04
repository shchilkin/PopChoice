const DEFAULT_TMDB_LANGUAGE = 'en-US';

export const CATALOG_BACKFILL_MOVIE_JOB_NAME = 'backfill-movie';
export const CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME = 'enqueue-catalog-repair-batch';
const CATALOG_MAINTENANCE_QUEUE_JOB_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
  'completed',
] as const;

export const CATALOG_MAINTENANCE_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

export const ACTIVE_DEDUPE_STATES = new Set([
  'active',
  'delayed',
  'prioritized',
  'waiting',
  'waiting-children',
]);

export type CatalogBackfillReason = 'missing_tmdb_id' | 'missing_metadata' | 'manual_refresh';
export type CatalogMaintenanceQueueJobState = (typeof CATALOG_MAINTENANCE_QUEUE_JOB_STATES)[number];

export interface CatalogMaintenanceQueueCounts {
  active: number;
  completed: number;
  delayed: number;
  failed: number;
  prioritized: number;
  waiting: number;
  waitingChildren: number;
}

export const EMPTY_CATALOG_MAINTENANCE_QUEUE_COUNTS: CatalogMaintenanceQueueCounts = {
  active: 0,
  completed: 0,
  delayed: 0,
  failed: 0,
  prioritized: 0,
  waiting: 0,
  waitingChildren: 0,
};

export interface CatalogMaintenanceJobData {
  version: 1;
  movieId?: string | number;
  batchId?: string | number;
  issueKey?: string;
  limit?: number;
  pageSize?: number;
  reason?: CatalogBackfillReason;
  language?: string;
  repairBatchId?: string | number;
  repairBatchItemId?: string | number;
  [key: string]: unknown;
}

type PayloadEntry = { label: string; value: string };

export function normalizeLanguage(language?: string): string {
  return (language ?? DEFAULT_TMDB_LANGUAGE).trim() || DEFAULT_TMDB_LANGUAGE;
}

export function toBullMQJobIdPart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_.-]/g, '-');
}

export function getCatalogBackfillMovieJobId(movieId: string | number): string {
  return `backfill-${toBullMQJobIdPart(movieId)}`;
}

export function getCatalogRepairBatchJobId(batchId: string | number): string {
  return `repair-batch-${toBullMQJobIdPart(batchId)}`;
}

export function isCatalogMaintenanceQueueJobState(
  value: string | null | undefined,
): value is CatalogMaintenanceQueueJobState {
  return CATALOG_MAINTENANCE_QUEUE_JOB_STATES.some((state) => state === value);
}

export function isoFromEpoch(value: number | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function compactJobValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function addPayloadValue(payload: PayloadEntry[], label: string, value: unknown): void {
  const compact = compactJobValue(value);
  if (compact) payload.push({ label, value: compact });
}

export function summarizeCatalogMaintenanceJobPayload(
  jobName: string,
  data: Record<string, unknown>,
): PayloadEntry[] {
  const payload: PayloadEntry[] = [];

  if (jobName === CATALOG_BACKFILL_MOVIE_JOB_NAME) {
    addPayloadValue(payload, 'Movie', data.movieId);
    addPayloadValue(payload, 'Reason', data.reason);
    addPayloadValue(payload, 'Language', data.language);
    addPayloadValue(payload, 'Batch', data.repairBatchId);
    addPayloadValue(payload, 'Item', data.repairBatchItemId);
    return payload;
  }

  if (jobName === CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME) {
    addPayloadValue(payload, 'Batch', data.batchId);
    addPayloadValue(payload, 'Issue', data.issueKey);
    addPayloadValue(payload, 'Limit', data.limit);
    addPayloadValue(payload, 'Page size', data.pageSize);
    addPayloadValue(payload, 'Language', data.language);
    return payload;
  }

  addPayloadValue(payload, 'Movie', data.movieId);
  addPayloadValue(payload, 'TMDB', data.tmdbId);
  addPayloadValue(payload, 'Source', data.source);
  addPayloadValue(payload, 'Page', data.page);
  addPayloadValue(payload, 'Language', data.language);
  addPayloadValue(payload, 'Version', data.version);
  return payload;
}

export function getCountForState(
  counts: CatalogMaintenanceQueueCounts,
  state: CatalogMaintenanceQueueJobState,
): number {
  if (state === 'waiting') return counts.waiting;
  return counts[state];
}
