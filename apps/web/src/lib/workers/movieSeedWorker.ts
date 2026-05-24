import { Worker } from 'bullmq';

import { deserializeTMDBEmbeddings, seedMovies } from '@/features/recommendation/tmdb';
import {
  MOVIE_SEED_JOB_OPTIONS,
  MOVIE_SEED_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordQueueJobEvent } from '@/lib/metrics';

import type { MovieSeedJobData } from '@/lib/jobQueue';

const MAX_MOVIE_SEED_ATTEMPTS = MOVIE_SEED_JOB_OPTIONS.attempts;

export function createMovieSeedWorker(): Worker<MovieSeedJobData> | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Movie seeding worker is disabled.');
    return null;
  }

  const worker = new Worker<MovieSeedJobData>(
    MOVIE_SEED_QUEUE_NAME,
    async (job) => {
      const { tmdbMovies, localKeys, tmdbEmbeddings } = job.data;
      const embeddingsMap = deserializeTMDBEmbeddings(tmdbEmbeddings);
      await seedMovies(tmdbMovies, new Set(localKeys), embeddingsMap);
    },
    { connection },
  );

  worker.on('completed', (job) => {
    recordQueueJobEvent({
      queue: MOVIE_SEED_QUEUE_NAME,
      job: job.name,
      event: 'completed',
      final: true,
    });
    logger.info(
      { jobId: job.id, queuedMovies: job.data.tmdbMovies.length },
      'Movie seeding job completed',
    );
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    recordQueueJobEvent({
      queue: MOVIE_SEED_QUEUE_NAME,
      job: job?.name ?? 'unknown',
      event: 'failed',
      final: attemptsMade >= MAX_MOVIE_SEED_ATTEMPTS,
    });
    logger.error(
      {
        err,
        jobId: job?.id,
        queuedMovies: job?.data?.tmdbMovies?.length ?? 0,
        attemptsMade,
        maxAttempts: MAX_MOVIE_SEED_ATTEMPTS,
        willRetry: attemptsMade < MAX_MOVIE_SEED_ATTEMPTS,
      },
      'Movie seeding job failed',
    );
  });

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
