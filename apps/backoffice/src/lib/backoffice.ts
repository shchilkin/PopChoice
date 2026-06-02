import {
  applyTMDBMatchReviewAction,
  createCatalogRepairBatch,
  createCatalogRepairBatchItem,
  ensureCatalogRepairActionSchema,
  ensureTMDBMatchReviewActionSchema,
  getCatalogRepairMovieSnapshot,
  initDatabase,
  isTMDBMatchReviewReason,
  isTMDBMatchReviewSort,
  isTMDBMatchReviewStatus,
  listCatalogHealthIssueMoviePage,
  logger,
  recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts,
  readBackofficeRuntimeConfig,
  updateCatalogRepairBatchOrchestrationResult,
  updateCatalogRepairBatchItemEnqueueResult,
} from '@pop-choice/shared';
import type {
  BackofficeRuntimeConfig,
  CatalogRepairBatchItemSort,
  CatalogRepairBatchItemStatusFilter,
  CatalogRepairBatchSort,
  CatalogRepairBatchStatusFilter,
  TMDBMatchReviewAction,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
} from '@pop-choice/shared';

import {
  isCatalogMaintenanceQueueJobState,
  enqueueCatalogRepairBatchFromBackoffice,
  enqueueCatalogBackfillMovieFromBackoffice,
  type CatalogBackfillReason,
  type CatalogMaintenanceQueueJobState,
} from '../catalogMaintenanceQueue';

export const DEFAULT_REPAIR_AUDIT_LIMIT = 25;
export const DEFAULT_CATALOG_ISSUE_PAGE_SIZE = 25;
export const MAX_CATALOG_ISSUE_PAGE_NUMBER = 4_001;
export const MAX_REPAIR_AUDIT_PAGE_NUMBER = 4_001;
export const DEFAULT_REVIEW_PAGE_SIZE = 25;
export const MAX_REVIEW_PAGE_SIZE = 100;
export const DEFAULT_BULK_REPAIR_LIMIT = 25;
export const MAX_BULK_REPAIR_LIMIT = DEFAULT_BULK_REPAIR_LIMIT;
export const MAX_ASYNC_BULK_REPAIR_LIMIT = 1_000;
export const DEFAULT_ASYNC_BULK_REPAIR_CHUNK_SIZE = DEFAULT_BULK_REPAIR_LIMIT;
export const DEFAULT_REPAIR_BATCH_PAGE_SIZE = 25;
export const DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE = 100;
export const MAX_REPAIR_BATCH_PAGE_SIZE = 100;
export const MAX_REPAIR_BATCH_PAGE_NUMBER = 4_001;
export const DEFAULT_QUEUE_JOB_PAGE_SIZE = 25;
export const MAX_QUEUE_JOB_PAGE_SIZE = 50;
export const MAX_QUEUE_JOB_PAGE_NUMBER = 4_001;

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

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  year: 'numeric',
});

const REPAIR_BATCH_STATUS_FILTERS = new Set<CatalogRepairBatchStatusFilter>([
  'all',
  'empty',
  'enqueueing',
  'failed',
  'partial',
  'processing',
  'queued',
  'completed',
  'unavailable',
]);

const REPAIR_BATCH_SORTS = new Set<CatalogRepairBatchSort>(['newest', 'updated', 'needs_review']);

const REPAIR_BATCH_ITEM_STATUS_FILTERS = new Set<CatalogRepairBatchItemStatusFilter>([
  'all',
  'completed',
  'completed_resolved',
  'completed_unresolved',
  'deduped',
  'enqueue_failed',
  'failed',
  'in_progress',
  'needs_review',
  'pending',
  'processing',
  'queued',
  'skipped',
  'unavailable',
]);

const REPAIR_BATCH_ITEM_SORTS = new Set<CatalogRepairBatchItemSort>([
  'oldest',
  'newest',
  'needs_review',
]);

let cachedConfig: BackofficeRuntimeConfig | null = null;
let initialization: Promise<BackofficeRuntimeConfig> | null = null;

export function getBackofficeErrorStatus(error: unknown): number {
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;

  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600 ? statusCode : 500;
}

function backofficeActionError(message: string, statusCode = 400): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

export function getBackofficeConfig(): BackofficeRuntimeConfig {
  cachedConfig ??= readBackofficeRuntimeConfig();
  return cachedConfig;
}

export async function ensureBackofficeReady(): Promise<BackofficeRuntimeConfig> {
  if (!initialization) {
    initialization = (async () => {
      try {
        const config = getBackofficeConfig();
        initDatabase(config.databaseUrl);
        await ensureCatalogRepairActionSchema();
        await ensureTMDBMatchReviewActionSchema();
        return config;
      } catch (error) {
        initialization = null;
        throw error;
      }
    })();
  }

  return initialization;
}

export function formatBackofficeDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const raw =
    value instanceof Date
      ? Number.isFinite(value.getTime())
        ? value.toISOString()
        : '-'
      : value.trim();
  if (raw === '-') return raw;

  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return raw;
  return DATE_TIME_FORMATTER.format(date);
}

export function parseOperatorActor(headers: Headers): string {
  const header = headers.get('authorization');
  if (!header?.startsWith('Basic ')) return 'anonymous-operator';

  try {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    return username.trim() || 'anonymous-operator';
  } catch {
    return 'anonymous-operator';
  }
}

export function parseTMDBReviewStatus(value: string | null): TMDBMatchReviewStatus | 'all' {
  if (value === 'all') return 'all';
  return value && isTMDBMatchReviewStatus(value) ? value : 'open';
}

export function parseTMDBReviewReason(value: string | null): TMDBMatchReviewReason | 'all' {
  if (value === 'all') return 'all';
  return value && isTMDBMatchReviewReason(value) ? value : 'all';
}

export function parseTMDBReviewSort(value: string | null): TMDBMatchReviewSort {
  return value && isTMDBMatchReviewSort(value) ? value : 'highest_risk';
}

export function parsePositiveIntParam(
  value: string | null,
  fallback: number,
  { max }: { max: number },
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseRepairBatchListParams(params: Record<string, string | string[] | undefined>): {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  status: CatalogRepairBatchStatusFilter;
  sort: CatalogRepairBatchSort;
} {
  const pageSize = parsePositiveIntParam(
    firstSearchParam(params.pageSize),
    DEFAULT_REPAIR_BATCH_PAGE_SIZE,
    { max: MAX_REPAIR_BATCH_PAGE_SIZE },
  );
  const page = parsePositiveIntParam(firstSearchParam(params.page), 1, {
    max: MAX_REPAIR_BATCH_PAGE_NUMBER,
  });
  const statusValue = firstSearchParam(params.status);
  const sortValue = firstSearchParam(params.sort);
  const status =
    statusValue && REPAIR_BATCH_STATUS_FILTERS.has(statusValue as CatalogRepairBatchStatusFilter)
      ? (statusValue as CatalogRepairBatchStatusFilter)
      : 'all';
  const sort =
    sortValue && REPAIR_BATCH_SORTS.has(sortValue as CatalogRepairBatchSort)
      ? (sortValue as CatalogRepairBatchSort)
      : 'newest';

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    status,
    sort,
  };
}

export function parseRepairBatchItemParams(params: Record<string, string | string[] | undefined>): {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
  status: CatalogRepairBatchItemStatusFilter;
  sort: CatalogRepairBatchItemSort;
} {
  const pageSize = parsePositiveIntParam(
    firstSearchParam(params.itemPageSize),
    DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE,
    { max: MAX_REPAIR_BATCH_PAGE_SIZE },
  );
  const page = parsePositiveIntParam(firstSearchParam(params.itemPage), 1, {
    max: MAX_REPAIR_BATCH_PAGE_NUMBER,
  });
  const statusValue = firstSearchParam(params.itemStatus);
  const sortValue = firstSearchParam(params.itemSort);
  const status =
    statusValue &&
    REPAIR_BATCH_ITEM_STATUS_FILTERS.has(statusValue as CatalogRepairBatchItemStatusFilter)
      ? (statusValue as CatalogRepairBatchItemStatusFilter)
      : 'needs_review';
  const sort =
    sortValue && REPAIR_BATCH_ITEM_SORTS.has(sortValue as CatalogRepairBatchItemSort)
      ? (sortValue as CatalogRepairBatchItemSort)
      : 'needs_review';

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    status,
    sort,
  };
}

export function parseCatalogMaintenanceQueueParams(
  params: Record<string, string | string[] | undefined>,
): {
  state: CatalogMaintenanceQueueJobState;
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
} {
  const stateValue = firstSearchParam(params.state);
  const pageSize = parsePositiveIntParam(
    firstSearchParam(params.pageSize),
    DEFAULT_QUEUE_JOB_PAGE_SIZE,
    {
      max: MAX_QUEUE_JOB_PAGE_SIZE,
    },
  );
  const page = parsePositiveIntParam(firstSearchParam(params.page), 1, {
    max: MAX_QUEUE_JOB_PAGE_NUMBER,
  });

  return {
    state: isCatalogMaintenanceQueueJobState(stateValue) ? stateValue : 'waiting',
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function parseAction(value: FormDataEntryValue | null): TMDBMatchReviewAction {
  if (
    value === 'apply_candidate' ||
    value === 'reject' ||
    value === 'defer' ||
    value === 'reopen'
  ) {
    return value;
  }

  throw backofficeActionError(`Unsupported review action "${String(value)}".`);
}

function parseMovieId(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw backofficeActionError('Movie id is required.');
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw backofficeActionError('Movie id must be numeric.');
  }

  return trimmed;
}

function parseCandidateId(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  if (typeof value !== 'string') {
    throw backofficeActionError('Candidate id must be numeric.');
  }

  const trimmed = value.trim();
  if (trimmed === '') return undefined;

  if (!/^\d+$/.test(trimmed)) {
    throw backofficeActionError('Candidate id must be numeric.');
  }

  const candidateId = Number(trimmed);
  if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
    throw backofficeActionError('Candidate id must be a positive safe integer.');
  }

  return candidateId;
}

function parseCatalogIssueKey(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || !REPAIRABLE_CATALOG_ISSUE_KEYS.has(value)) {
    throw backofficeActionError('Unsupported catalog-health repair issue.');
  }

  return value;
}

function getBackfillReasonForIssue(issueKey: string): CatalogBackfillReason {
  if (issueKey === 'missing_tmdb_id') return 'missing_tmdb_id';
  if (issueKey === 'stale_tmdb_metadata') return 'manual_refresh';
  return 'missing_metadata';
}

export function catalogRepairMessage(status: CatalogRepairActionResult['status']): string {
  if (status === 'orchestration_queued') {
    return 'Catalog repair orchestration accepted. A worker will create repair items and queue backfill jobs in chunks.';
  }
  if (status === 'queued') {
    return 'Catalog backfill job queued. Workers will process it through the existing rate-limited TMDB path.';
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

export type CatalogRepairActionResult =
  | {
      mode: 'single';
      status: 'queued' | 'unavailable';
      issueKey: string;
      movieId: string;
      job: Awaited<ReturnType<typeof enqueueCatalogBackfillMovieFromBackoffice>>;
    }
  | {
      mode: 'bulk';
      status: 'queued' | 'orchestration_queued' | 'partial' | 'failed' | 'unavailable' | 'empty';
      issueKey: string;
      summary: CatalogBulkRepairSummary;
    };

export type CatalogBulkRepairSummary = {
  batchId?: string;
  issueKey: string;
  totalCandidates: number;
  attempted: number;
  queued: number;
  deduped: number;
  failed: number;
  unavailable: number;
  limit: number;
  movieIds: string[];
  jobs: Array<{
    movieId: string;
    itemId?: string;
    jobId?: string;
    status: 'queued' | 'deduped' | 'failed' | 'unavailable';
  }>;
};

function parseBulkRepairLimit(value: FormDataEntryValue | null): number {
  return typeof value === 'string'
    ? parsePositiveIntParam(value, DEFAULT_BULK_REPAIR_LIMIT, { max: MAX_BULK_REPAIR_LIMIT })
    : DEFAULT_BULK_REPAIR_LIMIT;
}

function parseAsyncBulkRepairLimit(value: FormDataEntryValue | null, fallback: number): number {
  return typeof value === 'string'
    ? parsePositiveIntParam(value, fallback, { max: MAX_ASYNC_BULK_REPAIR_LIMIT })
    : Math.min(fallback, MAX_ASYNC_BULK_REPAIR_LIMIT);
}

async function performAsyncBulkCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const actor = parseOperatorActor(headers);
  const note = typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined;
  const countPage = await listCatalogHealthIssueMoviePage({
    issueKey,
    limit: 1,
    offset: 0,
    staleAfterDays: config.catalogHealthStaleDays,
  });
  const limit = parseAsyncBulkRepairLimit(formData.get('batch_limit'), countPage.totalCount);
  const requestedLimit = Math.min(limit, countPage.totalCount);
  const summary: CatalogBulkRepairSummary = {
    issueKey,
    totalCandidates: countPage.totalCount,
    attempted: 0,
    queued: 0,
    deduped: 0,
    failed: 0,
    unavailable: 0,
    limit: requestedLimit,
    movieIds: [],
    jobs: [],
  };

  if (requestedLimit === 0) {
    return {
      mode: 'bulk',
      status: 'empty',
      issueKey,
      summary,
    };
  }

  const batch = await createCatalogRepairBatch({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    requestedLimit,
    totalCandidates: countPage.totalCount,
    attemptedCount: 0,
    note,
    previousState: {
      async: true,
      issueKey,
      requestedLimit,
      totalCandidates: countPage.totalCount,
    },
  });
  summary.batchId = batch.id;

  const orchestrationJob = await enqueueCatalogRepairBatchFromBackoffice(
    {
      batchId: batch.id,
      issueKey,
      limit: requestedLimit,
      pageSize: DEFAULT_ASYNC_BULK_REPAIR_CHUNK_SIZE,
      language: config.tmdbLanguage,
      staleAfterDays: config.catalogHealthStaleDays,
    },
    config.redisUrl,
  );

  if (!orchestrationJob) {
    await updateCatalogRepairBatchOrchestrationResult({
      batchId: batch.id,
      status: 'unavailable',
      result: { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
    });
    await recordCatalogRepairAction({
      action: 'bulk_enqueue_backfill',
      actor,
      issueKey,
      targetType: 'catalog_issue',
      targetId: issueKey,
      note,
      previousState: {
        async: true,
        issueKey,
        requestedLimit,
        totalCandidates: countPage.totalCount,
      },
      result: {
        ...summary,
        status: 'queue_unavailable',
        queueName: 'catalog-maintenance',
      },
      repairBatchId: batch.id,
    });

    return { mode: 'bulk', status: 'unavailable', issueKey, summary };
  }

  await updateCatalogRepairBatchOrchestrationResult({
    batchId: batch.id,
    status: 'enqueueing',
    result: { ...orchestrationJob, async: true, requestedLimit },
  });
  await recordCatalogRepairAction({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    note,
    previousState: {
      async: true,
      issueKey,
      requestedLimit,
      totalCandidates: countPage.totalCount,
    },
    result: {
      ...summary,
      orchestrationJob,
      status: 'orchestration_queued',
    },
    repairBatchId: batch.id,
  });
  summary.jobs.push({
    movieId: 'batch',
    jobId: orchestrationJob.jobId,
    status: orchestrationJob.status,
  });

  return {
    mode: 'bulk',
    status: 'orchestration_queued',
    issueKey,
    summary,
  };
}

async function performBulkCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const limit = parseBulkRepairLimit(formData.get('batch_limit'));
  const actor = parseOperatorActor(headers);
  const note = typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined;
  const page = await listCatalogHealthIssueMoviePage({
    issueKey,
    limit,
    offset: 0,
    staleAfterDays: config.catalogHealthStaleDays,
  });
  const summary: CatalogBulkRepairSummary = {
    issueKey,
    totalCandidates: page.totalCount,
    attempted: page.movies.length,
    queued: 0,
    deduped: 0,
    failed: 0,
    unavailable: 0,
    limit: page.limit,
    movieIds: page.movies.map((movie) => movie.id),
    jobs: [],
  };
  const batch = await createCatalogRepairBatch({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    requestedLimit: page.limit,
    totalCandidates: page.totalCount,
    attemptedCount: page.movies.length,
    note,
    previousState: {
      issueKey,
      totalCandidates: page.totalCount,
      sampledMovieIds: summary.movieIds,
    },
  });
  summary.batchId = batch.id;
  const reason = getBackfillReasonForIssue(issueKey);

  for (const movie of page.movies) {
    const item = await createCatalogRepairBatchItem({
      batchId: batch.id,
      movieId: movie.id,
      issueKey,
      movieSnapshot: { ...movie },
      reason,
      language: config.tmdbLanguage,
    });

    try {
      const job = await enqueueCatalogBackfillMovieFromBackoffice(
        {
          movieId: movie.id,
          reason,
          language: config.tmdbLanguage,
          repairBatchId: batch.id,
          repairBatchItemId: item.id,
        },
        config.redisUrl,
      );

      if (!job) {
        await updateCatalogRepairBatchItemEnqueueResult({
          itemId: item.id,
          status: 'unavailable',
          errorMessage: 'REDIS_URL is unavailable or the catalog-maintenance queue is disabled.',
          result: { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
        });
        summary.unavailable += 1;
        summary.jobs.push({ movieId: movie.id, itemId: item.id, status: 'unavailable' });
        continue;
      }

      await updateCatalogRepairBatchItemEnqueueResult({
        itemId: item.id,
        status: job.status,
        queueName: job.queueName,
        jobName: job.jobName,
        jobId: job.jobId,
        language: job.language,
        result: { ...job },
      });
      summary[job.status] += 1;
      summary.jobs.push({
        movieId: movie.id,
        itemId: item.id,
        jobId: job.jobId,
        status: job.status,
      });
    } catch (error) {
      await updateCatalogRepairBatchItemEnqueueResult({
        itemId: item.id,
        status: 'enqueue_failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        result: { status: 'enqueue_failed' },
      });
      summary.failed += 1;
      summary.jobs.push({ movieId: movie.id, itemId: item.id, status: 'failed' });
      logger.error('Failed to enqueue catalog repair job from bulk action', {
        err: error,
        issueKey,
        movieId: movie.id,
      });
    }
  }

  await refreshCatalogRepairBatchCounts(batch.id);
  await recordCatalogRepairAction({
    action: 'bulk_enqueue_backfill',
    actor,
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    note,
    previousState: {
      issueKey,
      totalCandidates: page.totalCount,
      sampledMovieIds: summary.movieIds,
    },
    result: { ...summary },
    repairBatchId: batch.id,
  });

  return {
    mode: 'bulk',
    status:
      summary.attempted === 0
        ? 'empty'
        : summary.failed + summary.unavailable > 0 && summary.queued + summary.deduped > 0
          ? 'partial'
          : summary.queued + summary.deduped > 0
            ? 'queued'
            : summary.failed > 0
              ? 'failed'
              : 'unavailable',
    issueKey,
    summary,
  };
}

export async function performCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();

  if (formData.get('action') === 'bulk_enqueue_backfill') {
    return performBulkCatalogRepairAction(formData, headers);
  }

  if (formData.get('action') === 'bulk_enqueue_backfill_async') {
    return performAsyncBulkCatalogRepairAction(formData, headers);
  }

  if (formData.get('action') !== 'enqueue_backfill') {
    throw backofficeActionError('Unsupported catalog-health action.');
  }

  const movieId = parseMovieId(formData.get('movie_id'));
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const snapshot = await getCatalogRepairMovieSnapshot(movieId);

  if (!snapshot) {
    throw backofficeActionError('Movie not found.', 404);
  }

  const job = await enqueueCatalogBackfillMovieFromBackoffice(
    {
      movieId,
      reason: getBackfillReasonForIssue(issueKey),
      language: config.tmdbLanguage,
    },
    config.redisUrl,
  );

  await recordCatalogRepairAction({
    action: 'enqueue_backfill',
    actor: parseOperatorActor(headers),
    issueKey,
    targetType: 'movie',
    targetId: movieId,
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined,
    previousState: { ...snapshot },
    result: job ? { ...job } : { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
  });

  return {
    mode: 'single',
    status: job ? 'queued' : 'unavailable',
    issueKey,
    movieId,
    job,
  };
}

export async function applyTMDBReviewFormAction(
  reviewId: string,
  formData: FormData,
  headers: Headers,
): Promise<void> {
  await ensureBackofficeReady();

  const action = parseAction(formData.get('action'));
  const candidateId = parseCandidateId(formData.get('candidate_id'));
  const note = formData.get('note');

  await applyTMDBMatchReviewAction({
    reviewId,
    action,
    actor: parseOperatorActor(headers),
    candidateId,
    note: typeof note === 'string' ? note : undefined,
  });
}

export function logBackofficeError(message: string, error: unknown): void {
  logger.error(message, { err: error });
}
