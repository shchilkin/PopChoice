import {
  applyTMDBMatchReviewAction,
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
  readBackofficeRuntimeConfig,
} from '@pop-choice/shared';
import type {
  BackofficeRuntimeConfig,
  TMDBMatchReviewAction,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
} from '@pop-choice/shared';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  type CatalogBackfillReason,
} from '../catalogMaintenanceQueue';

export const DEFAULT_REPAIR_AUDIT_LIMIT = 25;
export const DEFAULT_REVIEW_PAGE_SIZE = 25;
export const MAX_REVIEW_PAGE_SIZE = 100;
export const DEFAULT_BULK_REPAIR_LIMIT = 25;
export const MAX_BULK_REPAIR_LIMIT = 100;

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
  second: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
  year: 'numeric',
});

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
      status: 'queued' | 'partial' | 'failed' | 'unavailable' | 'empty';
      issueKey: string;
      summary: CatalogBulkRepairSummary;
    };

export type CatalogBulkRepairSummary = {
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
    jobId?: string;
    status: 'queued' | 'deduped' | 'failed' | 'unavailable';
  }>;
};

function parseBulkRepairLimit(value: FormDataEntryValue | null): number {
  return typeof value === 'string'
    ? parsePositiveIntParam(value, DEFAULT_BULK_REPAIR_LIMIT, { max: MAX_BULK_REPAIR_LIMIT })
    : DEFAULT_BULK_REPAIR_LIMIT;
}

async function performBulkCatalogRepairAction(
  formData: FormData,
  headers: Headers,
): Promise<CatalogRepairActionResult> {
  const config = await ensureBackofficeReady();
  const issueKey = parseCatalogIssueKey(formData.get('issue_key'));
  const limit = parseBulkRepairLimit(formData.get('batch_limit'));
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

  for (const movie of page.movies) {
    try {
      const job = await enqueueCatalogBackfillMovieFromBackoffice(
        {
          movieId: movie.id,
          reason: getBackfillReasonForIssue(issueKey),
          language: config.tmdbLanguage,
        },
        config.redisUrl,
      );

      if (!job) {
        summary.unavailable += 1;
        summary.jobs.push({ movieId: movie.id, status: 'unavailable' });
        continue;
      }

      summary[job.status] += 1;
      summary.jobs.push({ movieId: movie.id, jobId: job.jobId, status: job.status });
    } catch (error) {
      summary.failed += 1;
      summary.jobs.push({ movieId: movie.id, status: 'failed' });
      logger.error('Failed to enqueue catalog repair job from bulk action', {
        err: error,
        issueKey,
        movieId: movie.id,
      });
    }
  }

  await recordCatalogRepairAction({
    action: 'bulk_enqueue_backfill',
    actor: parseOperatorActor(headers),
    issueKey,
    targetType: 'catalog_issue',
    targetId: issueKey,
    note: typeof formData.get('note') === 'string' ? String(formData.get('note')) : undefined,
    previousState: {
      issueKey,
      totalCandidates: page.totalCount,
      sampledMovieIds: summary.movieIds,
    },
    result: { ...summary },
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
