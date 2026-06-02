import { Queue } from 'bullmq';
import type { Job } from 'bullmq';
import { Redis } from 'ioredis';

import { logger } from '@pop-choice/shared';

const DEFAULT_TMDB_LANGUAGE = 'en-US';
export const CATALOG_MAINTENANCE_QUEUE_NAME = 'catalog-maintenance';
const CATALOG_BACKFILL_MOVIE_JOB_NAME = 'backfill-movie';
export const CATALOG_MAINTENANCE_QUEUE_JOB_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
  'completed',
] as const;

const CATALOG_MAINTENANCE_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

export type CatalogBackfillReason = 'missing_tmdb_id' | 'missing_metadata' | 'manual_refresh';
export type CatalogMaintenanceQueueJobState = (typeof CATALOG_MAINTENANCE_QUEUE_JOB_STATES)[number];

export interface EnqueueCatalogBackfillMovieInput {
  movieId: string | number;
  reason: CatalogBackfillReason;
  language?: string;
  repairBatchId?: string | number;
  repairBatchItemId?: string | number;
}

export interface EnqueueCatalogBackfillMovieResult {
  queueName: string;
  jobName: string;
  jobId: string;
  language: string;
  status: 'queued' | 'deduped';
}

export interface CatalogMaintenanceQueueSnapshot {
  queueName: string;
  available: boolean;
  counts: {
    active: number;
    completed: number;
    delayed: number;
    failed: number;
    prioritized: number;
    waiting: number;
    waitingChildren: number;
  };
  openJobs: number;
  updatedAt: string;
}

export interface CatalogMaintenanceQueueJobSummary {
  id: string;
  name: string;
  state: CatalogMaintenanceQueueJobState;
  attemptsMade: number;
  attemptsConfigured: number | null;
  createdAt: string | null;
  processedAt: string | null;
  finishedAt: string | null;
  failedReason: string | null;
  payload: Array<{ label: string; value: string }>;
  repairBatchId: string | null;
  repairBatchItemId: string | null;
  movieId: string | null;
}

export interface CatalogMaintenanceQueueJobPage {
  queueName: string;
  available: boolean;
  state: CatalogMaintenanceQueueJobState;
  jobs: CatalogMaintenanceQueueJobSummary[];
  counts: CatalogMaintenanceQueueSnapshot['counts'];
  openJobs: number;
  totalCount: number;
  limit: number;
  offset: number;
  updatedAt: string;
}

type CatalogMaintenanceJobData = {
  version: 1;
  movieId: string | number;
  reason?: CatalogBackfillReason;
  language?: string;
  repairBatchId?: string | number;
  repairBatchItemId?: string | number;
  [key: string]: unknown;
};

let redisConnection: Redis | null = null;
let catalogMaintenanceQueue: Queue<CatalogMaintenanceJobData> | null = null;

const ACTIVE_DEDUPE_STATES = new Set([
  'active',
  'delayed',
  'prioritized',
  'waiting',
  'waiting-children',
]);

function normalizeLanguage(language?: string): string {
  return (language ?? DEFAULT_TMDB_LANGUAGE).trim() || DEFAULT_TMDB_LANGUAGE;
}

function toBullMQJobIdPart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function getCatalogMaintenanceQueue(
  redisUrl: string | undefined,
): Queue<CatalogMaintenanceJobData> | null {
  if (catalogMaintenanceQueue) return catalogMaintenanceQueue;

  if (!redisUrl) return null;

  redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  redisConnection.on('error', (error) => {
    logger.error('Backoffice BullMQ Redis client error', { err: error });
  });

  catalogMaintenanceQueue = new Queue<CatalogMaintenanceJobData>(CATALOG_MAINTENANCE_QUEUE_NAME, {
    connection: redisConnection,
  });
  return catalogMaintenanceQueue;
}

export function getCatalogBackfillMovieJobId(movieId: string | number): string {
  return `backfill-${toBullMQJobIdPart(movieId)}`;
}

export function isCatalogMaintenanceQueueJobState(
  value: string | null | undefined,
): value is CatalogMaintenanceQueueJobState {
  return CATALOG_MAINTENANCE_QUEUE_JOB_STATES.some((state) => state === value);
}

function isoFromEpoch(value: number | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function compactJobValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function addPayloadValue(
  payload: Array<{ label: string; value: string }>,
  label: string,
  value: unknown,
): void {
  const compact = compactJobValue(value);
  if (compact) payload.push({ label, value: compact });
}

export function summarizeCatalogMaintenanceJobPayload(
  jobName: string,
  data: Record<string, unknown>,
): CatalogMaintenanceQueueJobSummary['payload'] {
  const payload: CatalogMaintenanceQueueJobSummary['payload'] = [];

  if (jobName === CATALOG_BACKFILL_MOVIE_JOB_NAME) {
    addPayloadValue(payload, 'Movie', data.movieId);
    addPayloadValue(payload, 'Reason', data.reason);
    addPayloadValue(payload, 'Language', data.language);
    addPayloadValue(payload, 'Batch', data.repairBatchId);
    addPayloadValue(payload, 'Item', data.repairBatchItemId);
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

function getCountForState(
  counts: CatalogMaintenanceQueueSnapshot['counts'],
  state: CatalogMaintenanceQueueJobState,
): number {
  if (state === 'waiting') return counts.waiting;
  return counts[state];
}

function toJobSummary(
  job: Job<CatalogMaintenanceJobData>,
  state: CatalogMaintenanceQueueJobState,
): CatalogMaintenanceQueueJobSummary {
  const data = job.data;

  return {
    id: String(job.id ?? '-'),
    name: job.name,
    state,
    attemptsMade: job.attemptsMade,
    attemptsConfigured: typeof job.opts.attempts === 'number' ? job.opts.attempts : null,
    createdAt: isoFromEpoch(job.timestamp),
    processedAt: isoFromEpoch(job.processedOn),
    finishedAt: isoFromEpoch(job.finishedOn),
    failedReason: compactJobValue(job.failedReason),
    payload: summarizeCatalogMaintenanceJobPayload(job.name, data),
    repairBatchId: compactJobValue(data.repairBatchId),
    repairBatchItemId: compactJobValue(data.repairBatchItemId),
    movieId: compactJobValue(data.movieId),
  };
}

export async function getCatalogMaintenanceQueueSnapshot(
  redisUrl = process.env.REDIS_URL,
): Promise<CatalogMaintenanceQueueSnapshot> {
  const emptyCounts: CatalogMaintenanceQueueSnapshot['counts'] = {
    active: 0,
    completed: 0,
    delayed: 0,
    failed: 0,
    prioritized: 0,
    waiting: 0,
    waitingChildren: 0,
  };
  const queue = getCatalogMaintenanceQueue(redisUrl);

  if (!queue) {
    return {
      queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
      available: false,
      counts: emptyCounts,
      openJobs: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  const counts = await queue.getJobCounts(
    'active',
    'completed',
    'delayed',
    'failed',
    'prioritized',
    'waiting',
    'waiting-children',
  );
  const normalizedCounts: CatalogMaintenanceQueueSnapshot['counts'] = {
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    delayed: counts.delayed ?? 0,
    failed: counts.failed ?? 0,
    prioritized: counts.prioritized ?? 0,
    waiting: counts.waiting ?? 0,
    waitingChildren: counts['waiting-children'] ?? 0,
  };

  return {
    queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
    available: true,
    counts: normalizedCounts,
    openJobs:
      normalizedCounts.active +
      normalizedCounts.delayed +
      normalizedCounts.prioritized +
      normalizedCounts.waiting +
      normalizedCounts.waitingChildren,
    updatedAt: new Date().toISOString(),
  };
}

export async function listCatalogMaintenanceQueueJobs({
  limit,
  offset,
  redisUrl = process.env.REDIS_URL,
  state,
}: {
  limit: number;
  offset: number;
  redisUrl?: string;
  state: CatalogMaintenanceQueueJobState;
}): Promise<CatalogMaintenanceQueueJobPage> {
  const snapshot = await getCatalogMaintenanceQueueSnapshot(redisUrl);
  const totalCount = getCountForState(snapshot.counts, state);
  const queue = getCatalogMaintenanceQueue(redisUrl);

  if (!queue || !snapshot.available) {
    return {
      ...snapshot,
      state,
      jobs: [],
      totalCount: 0,
      limit,
      offset,
    };
  }

  const end = Math.max(offset + limit - 1, offset);
  const jobs = await queue.getJobs(
    [state],
    offset,
    end,
    state !== 'completed' && state !== 'failed',
  );

  return {
    ...snapshot,
    state,
    jobs: jobs.map((job) => toJobSummary(job as Job<CatalogMaintenanceJobData>, state)),
    totalCount,
    limit,
    offset,
    updatedAt: new Date().toISOString(),
  };
}

export async function enqueueCatalogBackfillMovieFromBackoffice(
  input: EnqueueCatalogBackfillMovieInput,
  redisUrl = process.env.REDIS_URL,
): Promise<EnqueueCatalogBackfillMovieResult | null> {
  const queue = getCatalogMaintenanceQueue(redisUrl);
  if (!queue) return null;

  const language = normalizeLanguage(input.language);
  const jobId = getCatalogBackfillMovieJobId(input.movieId);
  const existingJob = await queue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (ACTIVE_DEDUPE_STATES.has(state)) {
      return {
        queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
        jobName: CATALOG_BACKFILL_MOVIE_JOB_NAME,
        jobId: String(existingJob.id ?? jobId),
        language,
        status: 'deduped',
      };
    }

    await existingJob.remove();
  }

  const job = await queue.add(
    CATALOG_BACKFILL_MOVIE_JOB_NAME,
    {
      version: 1,
      movieId: input.movieId,
      reason: input.reason,
      language,
      repairBatchId: input.repairBatchId,
      repairBatchItemId: input.repairBatchItemId,
    },
    {
      ...CATALOG_MAINTENANCE_JOB_OPTIONS,
      jobId,
    },
  );

  return {
    queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
    jobName: CATALOG_BACKFILL_MOVIE_JOB_NAME,
    jobId: String(job.id ?? jobId),
    language,
    status: 'queued',
  };
}
