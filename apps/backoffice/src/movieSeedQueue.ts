import { type Job, type JobType, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

import { logger } from '@pop-choice/shared';

import { redisOptionsFromUrl } from './lib/redisConnection';

export const MOVIE_SEED_QUEUE_NAME = 'movie-seed';
export const MOVIE_SEED_JOB_NAME = 'seed-movies';

const CURATED_MOVIE_SEED_JOB_ID_PREFIX = 'curated-movie-seed';
const ACTIVE_CURATED_SEED_STATES: JobType[] = [
  'active',
  'delayed',
  'prioritized',
  'waiting',
  'waiting-children',
];

const MOVIE_SEED_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
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
  runId: string;
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

function getCuratedMovieSeedJobId(runId = randomUUID()): string {
  return `${CURATED_MOVIE_SEED_JOB_ID_PREFIX}-${runId}`;
}

function isCuratedMovieSeedJob(job: Job<CuratedMovieSeedJobData, void, MovieSeedJobName>): boolean {
  return job.name === MOVIE_SEED_JOB_NAME && job.data?.kind === 'curated-file';
}

async function findActiveCuratedMovieSeedJob(
  queue: Queue<MovieSeedJob>,
): Promise<Job<CuratedMovieSeedJobData, void, MovieSeedJobName> | null> {
  const jobs = await queue.getJobs(ACTIVE_CURATED_SEED_STATES, 0, 25, false);
  return jobs.find(isCuratedMovieSeedJob) ?? null;
}

export async function enqueueCuratedMovieSeedFromBackoffice(
  input: EnqueueCuratedMovieSeedInput,
  redisUrl = process.env.REDIS_URL,
): Promise<EnqueueCuratedMovieSeedResult | null> {
  const queue = getMovieSeedQueue(redisUrl);
  if (!queue) return null;

  const activeJob = await findActiveCuratedMovieSeedJob(queue);
  if (activeJob) {
    return enqueueResult(String(activeJob.id ?? CURATED_MOVIE_SEED_JOB_ID_PREFIX), 'deduped');
  }

  const runId = randomUUID();
  const jobId = getCuratedMovieSeedJobId(runId);
  const job = await queue.add(
    MOVIE_SEED_JOB_NAME,
    {
      kind: 'curated-file',
      requestedBy: input.requestedBy,
      runId,
      version: 1,
    },
    { ...MOVIE_SEED_JOB_OPTIONS, jobId },
  );

  return enqueueResult(String(job.id ?? jobId), 'queued');
}
