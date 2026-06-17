import { type Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { logger } from '@pop-choice/shared';

import { redisOptionsFromUrl } from './lib/redisConnection';

export const MOVIE_SEED_QUEUE_NAME = 'movie-seed';
export const MOVIE_SEED_JOB_NAME = 'seed-movies';

const CURATED_MOVIE_SEED_JOB_ID = 'curated-movie-seed';

const MOVIE_SEED_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  jobId: CURATED_MOVIE_SEED_JOB_ID,
  removeOnComplete: 100,
  removeOnFail: 50,
};

export interface EnqueueCuratedMovieSeedInput {
  requestedBy: string;
}

export interface EnqueueCuratedMovieSeedResult {
  queueName: string;
  jobName: string;
  jobId: string;
  status: 'deduped' | 'queued';
}

type CuratedMovieSeedJobData = {
  version: 1;
  kind: 'curated-file';
  requestedBy: string;
};
type MovieSeedJobName = typeof MOVIE_SEED_JOB_NAME;
type MovieSeedJob = Job<CuratedMovieSeedJobData, void, MovieSeedJobName>;

let redisConnection: Redis | null = null;
let movieSeedQueue: Queue<MovieSeedJob> | null = null;

function getMovieSeedQueue(redisUrl: string | undefined): Queue<MovieSeedJob> | null {
  if (movieSeedQueue) return movieSeedQueue;
  if (!redisUrl) return null;

  redisConnection = new Redis(redisOptionsFromUrl(redisUrl, { maxRetriesPerRequest: null }));
  redisConnection.on('error', (error) => {
    logger.error('Backoffice movie seed Redis client error', { err: error });
  });

  movieSeedQueue = new Queue<MovieSeedJob>(MOVIE_SEED_QUEUE_NAME, { connection: redisConnection });
  return movieSeedQueue;
}

function enqueueResult(
  jobId: string,
  status: EnqueueCuratedMovieSeedResult['status'],
): EnqueueCuratedMovieSeedResult {
  return {
    jobId,
    jobName: MOVIE_SEED_JOB_NAME,
    queueName: MOVIE_SEED_QUEUE_NAME,
    status,
  };
}

export async function enqueueCuratedMovieSeedFromBackoffice(
  input: EnqueueCuratedMovieSeedInput,
  redisUrl = process.env.REDIS_URL,
): Promise<EnqueueCuratedMovieSeedResult | null> {
  const queue = getMovieSeedQueue(redisUrl);
  if (!queue) return null;

  const existingJob = await queue.getJob(CURATED_MOVIE_SEED_JOB_ID);
  if (existingJob) {
    const state = await existingJob.getState();
    if (
      state === 'active' ||
      state === 'delayed' ||
      state === 'prioritized' ||
      state === 'waiting'
    ) {
      return enqueueResult(String(existingJob.id ?? CURATED_MOVIE_SEED_JOB_ID), 'deduped');
    }

    await existingJob.remove();
  }

  const job = await queue.add(
    MOVIE_SEED_JOB_NAME,
    {
      kind: 'curated-file',
      requestedBy: input.requestedBy,
      version: 1,
    },
    MOVIE_SEED_JOB_OPTIONS,
  );

  return enqueueResult(String(job.id ?? CURATED_MOVIE_SEED_JOB_ID), 'queued');
}
