import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import type { SerializableTMDBEmbeddings } from '@/app/api/movie-recommendation/tmdb';
import type { TMDBDiscoverMovie } from '@/app/api/movie-recommendation/types';

export const MOVIE_SEED_QUEUE_NAME = 'movie-seed';

export type MovieSeedJobData = {
  tmdbMovies: TMDBDiscoverMovie[];
  localKeys: string[];
  tmdbEmbeddings?: SerializableTMDBEmbeddings;
};

export const MOVIE_SEED_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export function createBullMQConnection(): IORedis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}

const queueConnection = createBullMQConnection();

export const seedQueue = queueConnection
  ? new Queue<MovieSeedJobData>(MOVIE_SEED_QUEUE_NAME, { connection: queueConnection })
  : null;
