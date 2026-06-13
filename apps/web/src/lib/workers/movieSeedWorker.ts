import { type Job, Worker } from 'bullmq';

import { deserializeTMDBEmbeddings, seedMovies } from '@/features/recommendation/tmdb';
import {
  MOVIE_SEED_JOB_OPTIONS,
  MOVIE_SEED_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordQueueJobEvent } from '@/lib/metrics';
import { withTraceSpan } from '@/lib/tracing';

import type { MovieSeedJobData, MovieSeedJobName } from '@/lib/jobQueue';

const MAX_MOVIE_SEED_ATTEMPTS = MOVIE_SEED_JOB_OPTIONS.attempts;

// Imported dynamically by startWorkers.ts.
// fallow-ignore-next-line unused-export
export function createMovieSeedWorker(): Worker<MovieSeedJobData, void, MovieSeedJobName> | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Movie seeding worker is disabled.');
    return null;
  }

  const worker = new Worker<MovieSeedJobData, void, MovieSeedJobName>(
    MOVIE_SEED_QUEUE_NAME,
    processMovieSeedJob,
    {
      connection,
    },
  );

  worker.on('completed', recordMovieSeedCompleted);

  worker.on('failed', recordMovieSeedFailed);

  worker.on('error', (err) => {
    logger.error({ err }, 'Movie seeding worker encountered an unrecoverable error');
    process.exit(1);
  });

  void worker.waitUntilReady().catch((err) => {
    logger.error({ err }, 'Movie seeding worker failed to initialize');
    process.exit(1);
  });

  return worker;
}

async function processMovieSeedJob(job: Job<MovieSeedJobData, void, MovieSeedJobName>) {
  const { tmdbMovies, localKeys, tmdbEmbeddings } = job.data;
  await withTraceSpan(
    'movie_seed.worker.process',
    {
      carrier: job.data.trace,
      attributes: getMovieSeedTraceAttributes(job, tmdbMovies.length),
    },
    async () => {
      const embeddingsMap = deserializeTMDBEmbeddings(tmdbEmbeddings);
      await seedMovies(tmdbMovies, new Set(localKeys), embeddingsMap);
    },
  );
}

function getMovieSeedTraceAttributes(job: Job<MovieSeedJobData>, movieCount: number) {
  return {
    'messaging.system': 'bullmq',
    'messaging.destination.name': MOVIE_SEED_QUEUE_NAME,
    'messaging.operation.name': 'process',
    'job.id': String(job.id ?? 'unknown'),
    'job.name': job.name,
    'movie.count': movieCount,
  };
}

function recordMovieSeedCompleted(job: { id?: string; name: string; data: MovieSeedJobData }) {
  recordQueueJobEvent({
    event: 'completed',
    final: true,
    job: job.name,
    queue: MOVIE_SEED_QUEUE_NAME,
  });
  logger.info(
    { jobId: job.id, queuedMovies: job.data.tmdbMovies.length },
    'Movie seeding job completed',
  );
}

function recordMovieSeedFailed(
  job: { attemptsMade: number; data?: MovieSeedJobData; id?: string; name: string } | undefined,
  err: Error,
) {
  const attemptsMade = getMovieSeedAttemptsMade(job);
  recordQueueJobEvent({
    event: 'failed',
    final: isFinalMovieSeedAttempt(attemptsMade),
    job: getMovieSeedJobName(job),
    queue: MOVIE_SEED_QUEUE_NAME,
  });
  logger.error(getMovieSeedFailureLogData(job, err, attemptsMade), 'Movie seeding job failed');
}

function getMovieSeedAttemptsMade(job: { attemptsMade: number } | undefined) {
  return job?.attemptsMade ?? 0;
}

function isFinalMovieSeedAttempt(attemptsMade: number) {
  return attemptsMade >= MAX_MOVIE_SEED_ATTEMPTS;
}

function getMovieSeedJobName(job: { name: string } | undefined) {
  return job?.name ?? 'unknown';
}

function getMovieSeedFailureLogData(
  job: { data?: MovieSeedJobData; id?: string } | undefined,
  err: Error,
  attemptsMade: number,
) {
  return {
    attemptsMade,
    err,
    jobId: job?.id,
    maxAttempts: MAX_MOVIE_SEED_ATTEMPTS,
    queuedMovies: job?.data?.tmdbMovies?.length ?? 0,
    willRetry: attemptsMade < MAX_MOVIE_SEED_ATTEMPTS,
  };
}
