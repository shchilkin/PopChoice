import { logger } from '@pop-choice/shared';
import { Queue, type Job } from 'bullmq';
import { Redis } from 'ioredis';

import {
  ACTIVE_DEDUPE_STATES,
  CATALOG_BACKFILL_MOVIE_JOB_NAME,
  CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
  CATALOG_MAINTENANCE_JOB_OPTIONS,
  EMPTY_CATALOG_MAINTENANCE_QUEUE_COUNTS,
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
  type CatalogMaintenanceQueueJobPage,
  type CatalogMaintenanceQueueJobSummary,
  type CatalogMaintenanceQueueJobState,
  type CatalogMaintenanceQueueSnapshot,
  type EnqueueCatalogBackfillMovieInput,
  type EnqueueCatalogBackfillMovieResult,
  type EnqueueCatalogRepairBatchInput,
  type EnqueueCatalogRepairBatchResult,
} from './catalogMaintenanceQueueHelpers';
import { redisOptionsFromUrl } from './lib/redisConnection';

export const CATALOG_MAINTENANCE_QUEUE_NAME = 'catalog-maintenance';

export {
  getCatalogBackfillMovieJobId,
  getCatalogRepairBatchJobId,
  isCatalogMaintenanceQueueJobState,
  summarizeCatalogMaintenanceJobPayload,
};
export type {
  CatalogBackfillReason,
  CatalogMaintenanceQueueJobPage,
  CatalogMaintenanceQueueJobState,
  CatalogMaintenanceQueueJobSummary,
  CatalogMaintenanceQueueSnapshot,
  EnqueueCatalogBackfillMovieInput,
  EnqueueCatalogBackfillMovieResult,
  EnqueueCatalogRepairBatchInput,
  EnqueueCatalogRepairBatchResult,
};

function enqueueResult({
  jobId,
  jobName,
  language,
  status,
}: {
  jobId: string;
  jobName: string;
  language: string;
  status: 'queued' | 'deduped';
}): EnqueueCatalogBackfillMovieResult {
  return { queueName: CATALOG_MAINTENANCE_QUEUE_NAME, jobName, jobId, language, status };
}

let redisConnection: Redis | null = null;
type CatalogMaintenanceJobName =
  | typeof CATALOG_BACKFILL_MOVIE_JOB_NAME
  | typeof CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME;
type CatalogMaintenanceBullJob = Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>;

let catalogMaintenanceQueue: Queue<CatalogMaintenanceBullJob> | null = null;

function unavailableSnapshot(): CatalogMaintenanceQueueSnapshot {
  return {
    queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
    available: false,
    counts: EMPTY_CATALOG_MAINTENANCE_QUEUE_COUNTS,
    openJobs: 0,
    updatedAt: new Date().toISOString(),
  };
}

function getCatalogMaintenanceQueue(
  redisUrl: string | undefined,
): Queue<CatalogMaintenanceBullJob> | null {
  if (catalogMaintenanceQueue) return catalogMaintenanceQueue;

  if (!redisUrl) return null;

  redisConnection = new Redis(redisOptionsFromUrl(redisUrl, { maxRetriesPerRequest: null }));
  redisConnection.on('error', (error) => {
    logger.error('Backoffice BullMQ Redis client error', { err: error });
  });

  catalogMaintenanceQueue = new Queue<CatalogMaintenanceBullJob>(CATALOG_MAINTENANCE_QUEUE_NAME, {
    connection: redisConnection,
  });
  return catalogMaintenanceQueue;
}

function toJobSummary(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
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
  const queue = getCatalogMaintenanceQueue(redisUrl);

  if (!queue) {
    return unavailableSnapshot();
  }

  let counts: Record<string, number>;
  try {
    counts = await queue.getJobCounts(
      'active',
      'completed',
      'delayed',
      'failed',
      'prioritized',
      'waiting',
      'waiting-children',
    );
  } catch (error) {
    logger.error('Backoffice failed to read BullMQ catalog-maintenance counts', { err: error });
    return unavailableSnapshot();
  }
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
    jobs: jobs.map((job) => toJobSummary(job as CatalogMaintenanceBullJob, state)),
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
      return enqueueResult({
        jobName: CATALOG_BACKFILL_MOVIE_JOB_NAME,
        jobId: String(existingJob.id ?? jobId),
        language,
        status: 'deduped',
      });
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

  return enqueueResult({
    jobName: CATALOG_BACKFILL_MOVIE_JOB_NAME,
    jobId: String(job.id ?? jobId),
    language,
    status: 'queued',
  });
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
      return enqueueResult({
        jobName: CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
        jobId: String(existingJob.id ?? jobId),
        language,
        status: 'deduped',
      });
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

  return enqueueResult({
    jobName: CATALOG_ENQUEUE_REPAIR_BATCH_JOB_NAME,
    jobId: String(job.id ?? jobId),
    language,
    status: 'queued',
  });
}
