import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { logger } from '@pop-choice/shared';

const DEFAULT_TMDB_LANGUAGE = 'en-US';
const CATALOG_MAINTENANCE_QUEUE_NAME = 'catalog-maintenance';
const CATALOG_BACKFILL_MOVIE_JOB_NAME = 'backfill-movie';

const CATALOG_MAINTENANCE_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

export type CatalogBackfillReason = 'missing_tmdb_id' | 'missing_metadata' | 'manual_refresh';

export interface EnqueueCatalogBackfillMovieInput {
  movieId: string | number;
  reason: CatalogBackfillReason;
  language?: string;
}

export interface EnqueueCatalogBackfillMovieResult {
  queueName: string;
  jobName: string;
  jobId: string;
  language: string;
}

type CatalogBackfillMovieJobData = {
  version: 1;
  movieId: string | number;
  reason?: CatalogBackfillReason;
  language?: string;
};

let redisConnection: Redis | null = null;
let catalogMaintenanceQueue: Queue<CatalogBackfillMovieJobData> | null = null;

function normalizeLanguage(language?: string): string {
  return (language ?? DEFAULT_TMDB_LANGUAGE).trim() || DEFAULT_TMDB_LANGUAGE;
}

function getCatalogMaintenanceQueue(
  redisUrl: string | undefined,
): Queue<CatalogBackfillMovieJobData> | null {
  if (catalogMaintenanceQueue) return catalogMaintenanceQueue;

  if (!redisUrl) return null;

  redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  redisConnection.on('error', (error) => {
    logger.error('Backoffice BullMQ Redis client error', { err: error });
  });

  catalogMaintenanceQueue = new Queue<CatalogBackfillMovieJobData>(CATALOG_MAINTENANCE_QUEUE_NAME, {
    connection: redisConnection,
  });
  return catalogMaintenanceQueue;
}

export function getCatalogBackfillMovieJobId(movieId: string | number): string {
  return `backfill:${movieId}`;
}

export async function enqueueCatalogBackfillMovieFromBackoffice(
  input: EnqueueCatalogBackfillMovieInput,
  redisUrl = process.env.REDIS_URL,
): Promise<EnqueueCatalogBackfillMovieResult | null> {
  const queue = getCatalogMaintenanceQueue(redisUrl);
  if (!queue) return null;

  const language = normalizeLanguage(input.language);
  const jobId = getCatalogBackfillMovieJobId(input.movieId);
  const job = await queue.add(
    CATALOG_BACKFILL_MOVIE_JOB_NAME,
    {
      version: 1,
      movieId: input.movieId,
      reason: input.reason,
      language,
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
  };
}
