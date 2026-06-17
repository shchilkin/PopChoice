import { type Job, Queue } from 'bullmq';
import IORedis from 'ioredis';

import logger from '@/lib/logger';
import { redisOptionsFromUrl } from '@/lib/redisConnection';

import type { SerializableTMDBEmbeddings, TMDBDiscoverMovie } from '@/features/recommendation/tmdb';
import type {
  PersonFormData,
  RecommendationExperienceMode,
  RecommendationSourceStrategy,
} from '@/features/recommendation/types';
import type { Locale } from '@/lib/locale';
import type { TraceCarrier } from '@/lib/tracing';

export const MOVIE_SEED_QUEUE_NAME = 'movie-seed';
export const MOVIE_SEED_JOB_NAME = 'seed-movies';
export const RECOMMENDATION_QUEUE_NAME = 'recommendation';
export const RECOMMENDATION_JOB_NAME = 'recommendation';
export const MORE_PICKS_QUEUE_NAME = 'more-picks';
export const MORE_PICKS_JOB_NAME = 'more-picks';
export const CATALOG_MAINTENANCE_QUEUE_NAME = 'catalog-maintenance';
export const RECOMMENDATION_EVAL_QUEUE_NAME = 'recommendation-evals';

export const CATALOG_MAINTENANCE_JOB_NAMES = {
  discoverTMDBSourcePage: 'discover-tmdb-source-page',
  seedTMDBMovie: 'seed-tmdb-movie',
  backfillMovie: 'backfill-movie',
  enqueueCatalogRepairBatch: 'enqueue-catalog-repair-batch',
} as const;

export type CatalogMaintenanceJobName =
  (typeof CATALOG_MAINTENANCE_JOB_NAMES)[keyof typeof CATALOG_MAINTENANCE_JOB_NAMES];

export const RECOMMENDATION_EVAL_JOB_NAMES = {
  runRecommendationEval: 'run-recommendation-eval',
} as const;

export type RecommendationEvalJobName =
  (typeof RECOMMENDATION_EVAL_JOB_NAMES)[keyof typeof RECOMMENDATION_EVAL_JOB_NAMES];

export type TMDBCatalogCandidate = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  poster_path?: string | null;
};

export type TMDBDiscoverySource = 'now_playing' | 'upcoming' | 'top_rated' | 'popular';

export type MovieSeedTMDBJobData = {
  tmdbMovies: TMDBDiscoverMovie[];
  localKeys: string[];
  tmdbEmbeddings?: SerializableTMDBEmbeddings;
  trace?: TraceCarrier;
};

export type CuratedMovieSeedJobData = {
  version: 1;
  kind: 'curated-file';
  dryRun?: boolean;
  moviesFilePath?: string;
  requestedBy?: string;
  trace?: TraceCarrier;
};

export type MovieSeedJobData = MovieSeedTMDBJobData | CuratedMovieSeedJobData;

export type RecommendationJobData = {
  recommendationId: string;
  quizData: PersonFormData | PersonFormData[];
  experienceMode?: RecommendationExperienceMode;
  locale: Locale;
  sourceStrategy?: RecommendationSourceStrategy;
  userId?: string;
  trace?: TraceCarrier;
};

export type MorePicksJobData = {
  recommendationId: string; // internal UUID
  slug: string; // public slug (for logging)
  locale: Locale;
  trace?: TraceCarrier;
};

export type RecommendationEvalJobData = {
  version: 1;
  runId: string;
  mode: 'mock' | 'real-data' | 'live';
  trace?: TraceCarrier;
};

export type CatalogSeedTMDBMovieJobData = {
  version: 1;
  source: 'recommendation_jit' | 'tmdb_discovery' | 'manual_refresh';
  movie: TMDBCatalogCandidate;
  localKeys?: string[];
  embedding?: number[];
  language?: string;
  trace?: TraceCarrier;
};

export type CatalogDiscoverTMDBSourcePageJobData = {
  version: 1;
  source: TMDBDiscoverySource;
  page: number;
  language?: string;
  minVoteCount?: number;
  minVoteAverage?: number;
  maxMoviesPerPage?: number;
  trace?: TraceCarrier;
};

export type CatalogBackfillMovieJobData = {
  version: 1;
  movieId: string | number;
  reason?: 'missing_tmdb_id' | 'missing_metadata' | 'manual_refresh';
  language?: string;
  repairBatchId?: string | number;
  repairBatchItemId?: string | number;
  trace?: TraceCarrier;
};

export type CatalogEnqueueRepairBatchJobData = {
  version: 1;
  batchId: string | number;
  issueKey: string;
  limit: number;
  pageSize: number;
  language?: string;
  staleAfterDays?: number;
  trace?: TraceCarrier;
};

export type CatalogMaintenanceJobData =
  | CatalogDiscoverTMDBSourcePageJobData
  | CatalogSeedTMDBMovieJobData
  | CatalogBackfillMovieJobData
  | CatalogEnqueueRepairBatchJobData;

export type MovieSeedJobName = typeof MOVIE_SEED_JOB_NAME;
export type RecommendationJobName = typeof RECOMMENDATION_JOB_NAME;
export type MorePicksJobName = typeof MORE_PICKS_JOB_NAME;

type MovieSeedJob = Job<MovieSeedJobData, void, MovieSeedJobName>;
type RecommendationJob = Job<RecommendationJobData, void, RecommendationJobName>;
type MorePicksJob = Job<MorePicksJobData, void, MorePicksJobName>;
type CatalogMaintenanceJob = Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>;
type RecommendationEvalJob = Job<RecommendationEvalJobData, void, RecommendationEvalJobName>;

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

export const CATALOG_MAINTENANCE_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

export const RECOMMENDATION_EVAL_JOB_OPTIONS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: 100,
  removeOnFail: 100,
  timeout: 120_000,
};

let bullMQConnection: IORedis | null = null;

export function createBullMQConnection(): IORedis | null {
  if (bullMQConnection) return bullMQConnection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  bullMQConnection = new IORedis(
    redisOptionsFromUrl(redisUrl, {
      maxRetriesPerRequest: null,
    }),
  );

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
  ? new Queue<MovieSeedJob>(MOVIE_SEED_QUEUE_NAME, { connection: queueConnection })
  : null;

export const recommendationQueue = queueConnection
  ? new Queue<RecommendationJob>(RECOMMENDATION_QUEUE_NAME, { connection: queueConnection })
  : null;

export const MORE_PICKS_JOB_OPTIONS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: 200,
  removeOnFail: 100,
  /** Kill the job if the worker takes longer than 90 s — ensures more_picks_status reaches 'failed' and the UI can recover. */
  timeout: 90_000,
};

export const morePicksQueue = queueConnection
  ? new Queue<MorePicksJob>(MORE_PICKS_QUEUE_NAME, { connection: queueConnection })
  : null;

export const catalogMaintenanceQueue = queueConnection
  ? new Queue<CatalogMaintenanceJob>(CATALOG_MAINTENANCE_QUEUE_NAME, {
      connection: queueConnection,
    })
  : null;

export const recommendationEvalQueue = queueConnection
  ? new Queue<RecommendationEvalJob>(RECOMMENDATION_EVAL_QUEUE_NAME, {
      connection: queueConnection,
    })
  : null;

export async function closeBullMQQueues(): Promise<void> {
  await Promise.all([
    seedQueue?.close(),
    recommendationQueue?.close(),
    morePicksQueue?.close(),
    catalogMaintenanceQueue?.close(),
    recommendationEvalQueue?.close(),
  ]);
  if (bullMQConnection) {
    const connection = bullMQConnection;
    bullMQConnection = null;
    await connection.quit();
  }
}
