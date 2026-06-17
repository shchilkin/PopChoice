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
import {
  runCuratedMovieSeedJob,
  type CuratedMovieSeedSummary,
} from '@/lib/workers/curatedMovieSeed';
import {
  enqueueCuratedMovieSeedCatalogRepair,
  failedCatalogRepairSummary,
} from '@/lib/workers/curatedMovieSeedPostBackfill';

import type {
  CuratedMovieSeedJobData,
  MovieSeedJobData,
  MovieSeedJobName,
  MovieSeedTMDBJobData,
} from '@/lib/jobQueue';

const MAX_MOVIE_SEED_ATTEMPTS = MOVIE_SEED_JOB_OPTIONS.attempts;

type MovieSeedJobResult = CuratedMovieSeedSummary | void;

function isCuratedMovieSeedJobData(data: MovieSeedJobData): data is CuratedMovieSeedJobData {
  return 'kind' in data && data.kind === 'curated-file';
}

function isTMDBMovieSeedJobData(data: MovieSeedJobData): data is MovieSeedTMDBJobData {
  return 'tmdbMovies' in data;
}

// Imported dynamically by startWorkers.ts.
// fallow-ignore-next-line unused-export
export function createMovieSeedWorker(): Worker<
  MovieSeedJobData,
  MovieSeedJobResult,
  MovieSeedJobName
> | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Movie seeding worker is disabled.');
    return null;
  }

  const worker = new Worker<MovieSeedJobData, MovieSeedJobResult, MovieSeedJobName>(
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

function formatMovieSeedJobLog(message: string, context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) return message;
  return `${message}: ${JSON.stringify(context)}`;
}

async function attachCatalogRepairPhase(input: {
  data: CuratedMovieSeedJobData;
  job: Job<MovieSeedJobData, MovieSeedJobResult, MovieSeedJobName>;
  summary: CuratedMovieSeedSummary;
}): Promise<CuratedMovieSeedSummary> {
  try {
    const catalogRepair = await enqueueCuratedMovieSeedCatalogRepair({
      dryRun: input.summary.dryRun,
      requestedBy: input.data.requestedBy,
      runId: input.data.runId,
      seedStatus: input.summary.status,
    });

    input.summary.catalogRepair = catalogRepair;
    await input.job.log(
      formatMovieSeedJobLog('Curated movie seed catalog repair phase', catalogRepair),
    );
    return input.summary;
  } catch (error) {
    const catalogRepair = failedCatalogRepairSummary();
    input.summary.catalogRepair = catalogRepair;
    await input.job.log(
      formatMovieSeedJobLog('Curated movie seed catalog repair phase failed', {
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    logger.error({ err: error, jobId: input.job.id }, 'Curated movie seed catalog repair failed');
    return input.summary;
  }
}

async function processMovieSeedJob(
  job: Job<MovieSeedJobData, MovieSeedJobResult, MovieSeedJobName>,
): Promise<MovieSeedJobResult> {
  if (isCuratedMovieSeedJobData(job.data)) {
    const data = job.data;
    return withTraceSpan(
      'movie_seed.worker.process_curated_file',
      {
        carrier: data.trace,
        attributes: getMovieSeedTraceAttributes(job, null),
      },
      async () => {
        const summary = await runCuratedMovieSeedJob({
          dryRun: data.dryRun,
          moviesFilePath: data.moviesFilePath,
          reporter: async (message, context) => {
            await job.log(formatMovieSeedJobLog(message, context));
            if (context) await job.updateProgress(context);
          },
          requestedBy: data.requestedBy,
        });
        const enrichedSummary = await attachCatalogRepairPhase({ data, job, summary });
        await job.updateProgress(enrichedSummary);
        return enrichedSummary;
      },
    );
  }

  if (!isTMDBMovieSeedJobData(job.data)) {
    throw new Error(`Unsupported movie seed job payload for job ${job.name}`);
  }

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

function getMovieSeedTraceAttributes(job: Job<MovieSeedJobData>, movieCount: number | null) {
  return {
    'messaging.system': 'bullmq',
    'messaging.destination.name': MOVIE_SEED_QUEUE_NAME,
    'messaging.operation.name': 'process',
    'job.id': String(job.id ?? 'unknown'),
    'job.name': job.name,
    ...(movieCount === null ? {} : { 'movie.count': movieCount }),
  };
}

function recordMovieSeedCompleted(job: { id?: string; name: string; data: MovieSeedJobData }) {
  recordQueueJobEvent({
    event: 'completed',
    final: true,
    job: job.name,
    queue: MOVIE_SEED_QUEUE_NAME,
  });
  if (isCuratedMovieSeedJobData(job.data)) {
    logger.info({ jobId: job.id, requestedBy: job.data.requestedBy }, 'Movie seed job completed');
    return;
  }

  if (!isTMDBMovieSeedJobData(job.data)) {
    logger.info({ jobId: job.id }, 'Movie seed job completed with unknown payload');
    return;
  }

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
    queuedMovies:
      job?.data && isTMDBMovieSeedJobData(job.data) ? job.data.tmdbMovies.length : undefined,
    seedKind: job?.data && isCuratedMovieSeedJobData(job.data) ? job.data.kind : 'tmdb-discover',
    willRetry: attemptsMade < MAX_MOVIE_SEED_ATTEMPTS,
  };
}
