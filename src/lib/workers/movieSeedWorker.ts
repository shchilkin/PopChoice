import { Worker } from 'bullmq';

import { deserializeTMDBEmbeddings, seedMovies } from '@/app/api/movie-recommendation/tmdb';
import {
  MOVIE_SEED_JOB_OPTIONS,
  MOVIE_SEED_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';

import type { MovieSeedJobData } from '@/lib/jobQueue';

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
    logger.info(
      { jobId: job.id, queuedMovies: job.data.tmdbMovies.length },
      'Movie seeding job completed',
    );
  });

  worker.on('failed', (job, err) => {
    const maxAttempts = MOVIE_SEED_JOB_OPTIONS.attempts;
    const attemptsMade = job?.attemptsMade ?? 0;
    logger.error(
      {
        err,
        jobId: job?.id,
        queuedMovies: job?.data.tmdbMovies.length ?? 0,
        attemptsMade,
        maxAttempts,
        willRetry: attemptsMade < maxAttempts,
      },
      'Movie seeding job failed',
    );
  });

  return worker;
}
