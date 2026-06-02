import { Queue } from 'bullmq';
import type { Job } from 'bullmq';
import { Redis } from 'ioredis';

import { logger } from '@pop-choice/shared';

import {
  ACTIVE_DEDUPE_STATES,
  CATALOG_BACKFILL_MOVIE_JOB_NAME,
  CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
  CATALOG_MAINTENANCE_JOB_OPTIONS,
  CATALOG_MAINTENANCE_QUEUE_JOB_STATES,
  compactJobValue,
  getCatalogBackfillMovieJobId,
  getCatalogRepairBatchJobId,
  getCountForState,
  isoFromEpoch,
  isCatalogMaintenanceQueueJobState,
  normalizeLanguage,
  summarizeCatalogMaintenanceJobPayload,
  type CatalogBackfillReason,
  type CatalogMaintenanceJobData,
  type CatalogMaintenanceQueueCounts,
  type CatalogMaintenanceQueueJobState,
} from './catalogMaintenanceQueueHelpers';

export const CATALOG_MAINTENANCE_QUEUE_NAME = 'catalog-maintenance';

export {
  CATALOG_MAINTENANCE_QUEUE_JOB_STATES,
  getCatalogBackfillMovieJobId,
  getCatalogRepairBatchJobId,
  isCatalogMaintenanceQueueJobState,
  summarizeCatalogMaintenanceJobPayload,
};
export type { CatalogBackfillReason, CatalogMaintenanceQueueJobState };

export interface EnqueueCatalogBackfillMovieInput {
  movieId: string | number;
  reason: CatalogBackfillReason;
  language?: string;
  repairBatchId?: string | number;
  repairBatchItemId?: string | number;
}

export interface EnqueueCatalogRepairBatchInput {
  batchId: string | number;
  issueKey: string;
  limit: number;
  pageSize: number;
  language?: string;
  staleAfterDays: number;
}

export interface EnqueueCatalogBackfillMovieResult {
  queueName: string;
  jobName: string;
  jobId: string;
  language: string;
  status: 'queued' | 'deduped';
}

export interface EnqueueCatalogRepairBatchResult {
  queueName: string;
  jobName: string;
  jobId: string;
  language: string;
  status: 'queued' | 'deduped';
}

export interface CatalogMaintenanceQueueSnapshot {
  queueName: string;
  available: boolean;
  counts: CatalogMaintenanceQueueCounts;
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

let redisConnection: Redis | null = null;
let catalogMaintenanceQueue: Queue<CatalogMaintenanceJobData> | null = null;

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

export async function enqueueCatalogRepairBatchFromBackoffice(
  input: EnqueueCatalogRepairBatchInput,
  redisUrl = process.env.REDIS_URL,
): Promise<EnqueueCatalogRepairBatchResult | null> {
  const queue = getCatalogMaintenanceQueue(redisUrl);
  if (!queue) return null;

  const language = normalizeLanguage(input.language);
  const jobId = getCatalogRepairBatchJobId(input.batchId);
  const existingJob = await queue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (ACTIVE_DEDUPE_STATES.has(state)) {
      return {
        queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
        jobName: CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
        jobId: String(existingJob.id ?? jobId),
        language,
        status: 'deduped',
      };
    }

    await existingJob.remove();
  }

  const job = await queue.add(
    CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
    {
      version: 1,
      batchId: input.batchId,
      issueKey: input.issueKey,
      limit: input.limit,
      pageSize: input.pageSize,
      language,
      staleAfterDays: input.staleAfterDays,
    },
    {
      ...CATALOG_MAINTENANCE_JOB_OPTIONS,
      jobId,
    },
  );

  return {
    queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
    jobName: CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
    jobId: String(job.id ?? jobId),
    language,
    status: 'queued',
  };
}
