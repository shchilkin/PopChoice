import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import logger from '@/lib/logger';

import type {
  SerializableTMDBEmbeddings,
  TMDBDiscoverMovie,
} from '@/app/api/movie-recommendation/tmdb';
import type { PersonFormData } from '@/app/api/movie-recommendation/types';
import type { Locale } from '@/lib/locale';

export const MOVIE_SEED_QUEUE_NAME = 'movie-seed';
export const RECOMMENDATION_QUEUE_NAME = 'recommendation';

export type MovieSeedJobData = {
  tmdbMovies: TMDBDiscoverMovie[];
  localKeys: string[];
  tmdbEmbeddings?: SerializableTMDBEmbeddings;
};

export type RecommendationJobData = {
  recommendationId: string;
  quizData: PersonFormData | PersonFormData[];
  locale: Locale;
};

export const MOVIE_SEED_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const RECOMMENDATION_JOB_OPTIONS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: 200,
  removeOnFail: 100,
};

let bullMQConnection: IORedis | null = null;

export function createBullMQConnection(): IORedis | null {
  if (bullMQConnection) return bullMQConnection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  bullMQConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  bullMQConnection.on('connect', () => {
    logger.info('BullMQ Redis client connected');
  });
  bullMQConnection.on('ready', () => {
    logger.info('BullMQ Redis client ready');
  });
  bullMQConnection.on('error', (error) => {
    logger.error({ err: error }, 'BullMQ Redis client error');
  });

  return bullMQConnection;
}

const queueConnection = createBullMQConnection();

export const seedQueue = queueConnection
  ? new Queue<MovieSeedJobData>(MOVIE_SEED_QUEUE_NAME, { connection: queueConnection })
  : null;

export const recommendationQueue = queueConnection
  ? new Queue<RecommendationJobData>(RECOMMENDATION_QUEUE_NAME, { connection: queueConnection })
  : null;
