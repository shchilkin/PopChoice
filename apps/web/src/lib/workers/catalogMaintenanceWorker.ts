import {
  catalogRepairCompletionStatusForResolution,
  createEmbeddings,
  createCatalogRepairBatchItem,
  ensureCatalogRepairActionSchema,
  ensureCatalogMetadataSchema,
  getPool,
  initDatabase,
  insertMovies,
  isCatalogHealthIssueResolvedForMovie,
  listCatalogHealthIssueMoviePage,
  refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchItemEnqueueResult,
  updateCatalogRepairBatchOrchestrationResult,
  updateCatalogRepairBatchItemStatus,
  upsertMovieCatalogMetadata,
} from '@pop-choice/shared';
import { Worker } from 'bullmq';

import {
  TMDBRateLimitError,
  extractCatalogMetadata,
  extractUSCertification,
  fetchTMDBSourcePage,
  fetchMovieDetails,
  getPosterUrl,
  movieToEmbeddingText,
  parseTMDBYear,
  searchMovieMatch,
} from '@/features/catalogMaintenance/tmdb';
import {
  CATALOG_MAINTENANCE_JOB_NAMES,
  CATALOG_MAINTENANCE_JOB_OPTIONS,
  CATALOG_MAINTENANCE_QUEUE_NAME,
  catalogMaintenanceQueue,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordQueueJobEvent, recordTMDBProviderError } from '@/lib/metrics';
import { withTraceSpan } from '@/lib/tracing';

import type {
  CatalogBackfillMovieJobData,
  CatalogDiscoverTMDBSourcePageJobData,
  CatalogEnqueueRepairBatchJobData,
  CatalogMaintenanceJobData,
  CatalogMaintenanceJobName,
  CatalogSeedTMDBMovieJobData,
} from '@/lib/jobQueue';
import type {
  CatalogRepairBatchItem,
  CatalogRepairItemStatus,
  MovieRecord,
} from '@pop-choice/shared';
import type { Job } from 'bullmq';

type CatalogWorker = Worker<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>;

type ExistingMovieRow = {
  id: string;
};

type BackfillMovieRow = {
  id: string;
  name: string;
  year: number;
  duration: number;
  description: string;
  score_rating: number;
  tmdb_id: number | null;
};

const MAX_CATALOG_ATTEMPTS = CATALOG_MAINTENANCE_JOB_OPTIONS.attempts;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_TMDB_REQUESTS_PER_WINDOW = 10;
const DEFAULT_TMDB_WINDOW_MS = 10_000;
const DEFAULT_TMDB_429_BACKOFF_MS = 30_000;
const DEFAULT_MIN_VOTE_COUNT = 500;
const DEFAULT_MIN_VOTE_AVERAGE = 6.5;
const DEFAULT_CATALOG_HEALTH_STALE_DAYS = 180;
const DEFAULT_REPAIR_ORCHESTRATION_CHUNK_SIZE = 25;
const MAX_REPAIR_ORCHESTRATION_CHUNK_SIZE = 100;
const ACTIVE_DEDUPE_STATES = new Set([
  'active',
  'delayed',
  'prioritized',
  'waiting',
  'waiting-children',
]);

let databaseInitialized = false;
let schemaReadyPromise: Promise<void> | null = null;

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureDatabase(): void {
  if (databaseInitialized) return;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for catalog maintenance jobs');
  }

  initDatabase(databaseUrl);
  databaseInitialized = true;
}

async function ensureCatalogSchema(): Promise<void> {
  ensureDatabase();
  schemaReadyPromise ??= Promise.all([
    ensureCatalogMetadataSchema(),
    ensureCatalogRepairActionSchema(),
  ]).then(() => undefined);
  await schemaReadyPromise;
}

async function updateRepairBatchItem(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
  status: Extract<
    CatalogRepairItemStatus,
    | 'processing'
    | 'completed'
    | 'completed_resolved'
    | 'completed_unresolved'
    | 'failed'
    | 'skipped'
  >,
  options: { errorMessage?: string; result?: Record<string, unknown> } = {},
): Promise<CatalogRepairBatchItem | null> {
  const repairBatchItemId =
    job?.data && 'repairBatchItemId' in job.data ? job.data.repairBatchItemId : undefined;
  if (!repairBatchItemId) return null;

  const item = await updateCatalogRepairBatchItemStatus({
    itemId: repairBatchItemId,
    status,
    errorMessage: options.errorMessage,
    result: {
      jobId: String(job?.id ?? 'unknown'),
      jobName: job?.name ?? 'unknown',
      attemptsMade: job?.attemptsMade ?? 0,
      ...options.result,
    },
  });

  const repairBatchId =
    job?.data && 'repairBatchId' in job.data ? job.data.repairBatchId : undefined;
  if (repairBatchId) {
    await refreshCatalogRepairBatchCounts(repairBatchId);
  }

  return item;
}

async function completeRepairBatchItemAfterBackfill({
  job,
  repairItem,
  result,
}: {
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>;
  repairItem: CatalogRepairBatchItem | null;
  result: Record<string, unknown>;
}): Promise<void> {
  if (!repairItem) {
    await updateRepairBatchItem(job, 'completed', { result });
    return;
  }

  const issueResolved = await isCatalogHealthIssueResolvedForMovie({
    issueKey: repairItem.issueKey,
    movieId: repairItem.movieId,
    staleAfterDays: parsePositiveIntEnv(
      'CATALOG_HEALTH_STALE_DAYS',
      DEFAULT_CATALOG_HEALTH_STALE_DAYS,
    ),
  });

  await updateRepairBatchItem(job, catalogRepairCompletionStatusForResolution(issueResolved), {
    result: {
      ...result,
      issueKey: repairItem.issueKey,
      issueResolved,
    },
  });
}

async function handleRateLimit(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
  worker: CatalogWorker,
  error: TMDBRateLimitError,
): Promise<never> {
  const delayMs =
    error.retryAfterMs > 0
      ? error.retryAfterMs
      : parsePositiveIntEnv('CATALOG_TMDB_429_BACKOFF_MS', DEFAULT_TMDB_429_BACKOFF_MS);
  logger.warn({ jobId: job.id, delayMs }, 'TMDB returned 429; pausing catalog queue');
  await worker.rateLimit(delayMs);
  throw Worker.RateLimitError();
}

function catalogTMDBOperationForJob(jobName: CatalogMaintenanceJobName) {
  return jobName === CATALOG_MAINTENANCE_JOB_NAMES.discoverTMDBSourcePage
    ? 'catalog_discover'
    : 'catalog_details';
}

function toBullMQJobIdPart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function getCatalogBackfillMovieJobId(movieId: string | number): string {
  return `backfill-${toBullMQJobIdPart(movieId)}`;
}

function getBackfillReasonForIssue(
  issueKey: string,
): NonNullable<CatalogBackfillMovieJobData['reason']> {
  if (issueKey === 'missing_tmdb_id') return 'missing_tmdb_id';
  if (issueKey === 'stale_tmdb_metadata') return 'manual_refresh';
  return 'missing_metadata';
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

async function findExistingMovieId(input: {
  tmdbId: number;
  title: string;
  year: number;
}): Promise<string | null> {
  const result = await getPool().query<ExistingMovieRow>(
    `SELECT id::text
       FROM movies
      WHERE tmdb_id = $1
         OR (lower(name) = lower($2) AND year = $3)
      LIMIT 1`,
    [input.tmdbId, input.title, input.year],
  );

  return result.rows[0]?.id ?? null;
}

async function processSeedTMDBMovie(job: Job<CatalogSeedTMDBMovieJobData>): Promise<void> {
  await ensureCatalogSchema();

  const apiKey = process.env.TMDB_API_KEY;
  const { movie, language } = job.data;
  const localKey = `${movie.title.toLowerCase()}|${parseTMDBYear(movie.release_date)}`;
  if (job.data.localKeys?.includes(localKey)) {
    logger.debug({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed skipped local duplicate');
    return;
  }

  const details = apiKey ? await fetchMovieDetails(apiKey, movie.id, language) : null;
  const year = parseTMDBYear(details?.release_date ?? movie.release_date);
  if (year <= 0) {
    logger.warn({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed skipped movie without year');
    return;
  }

  const existingMovieId = await findExistingMovieId({
    tmdbId: movie.id,
    title: movie.title,
    year,
  });
  if (existingMovieId) {
    if (details) {
      const metadata = extractCatalogMetadata(details);
      await upsertMovieCatalogMetadata({
        movieId: existingMovieId,
        tmdbMetadata: metadata.snapshot,
        people: metadata.people,
        genres: metadata.genres,
        keywords: metadata.keywords,
        providers: metadata.providers,
      });
    }
    logger.debug({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed skipped existing movie');
    return;
  }

  const ageRating = details ? extractUSCertification(details) : 'NR';
  const runtime = details?.runtime ?? 0;
  const description = details?.overview || movie.overview || 'No description available.';
  const scoreRating = Number((details?.vote_average ?? movie.vote_average ?? 0).toFixed(1));
  const metadata = details ? extractCatalogMetadata(details) : null;
  let embedding = job.data.embedding;

  if (!embedding) {
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY is required to embed catalog seed movies');
    }

    const embeddings = await createEmbeddings(openAIKey, [
      movieToEmbeddingText({
        title: details?.title ?? movie.title,
        year,
        ageRating,
        runtime,
        description,
        scoreRating,
      }),
    ]);
    embedding = embeddings[0];
  }

  if (!embedding || embedding.every((value) => value === 0)) {
    logger.warn({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed skipped invalid embedding');
    return;
  }

  const record: MovieRecord = {
    name: details?.title ?? movie.title,
    year,
    age_rating: ageRating,
    description,
    duration: runtime,
    score_rating: scoreRating,
    original_title: details?.original_title ?? null,
    original_language: details?.original_language ?? null,
    release_date: details?.release_date ?? movie.release_date,
    vote_count: details?.vote_count ?? movie.vote_count ?? null,
    popularity: details?.popularity ?? null,
    metadata_quality_score: metadata?.qualityScore ?? 0,
    metadata_quality_flags: metadata?.qualityFlags ?? ['missing_details'],
    poster_url: getPosterUrl(details?.poster_path ?? movie.poster_path),
    localized_name: details?.title && details.title !== movie.title ? details.title : null,
    tmdb_id: movie.id,
    tmdb_match_confidence: 1,
    tmdb_match_source: 'tmdb_discovery',
    embedding,
  };

  const result = await insertMovies([record]);
  const insertedMovie = result.insertedMovies[0];
  if (!insertedMovie?.id) {
    logger.debug({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed produced no inserted row');
    return;
  }

  if (details && metadata) {
    await upsertMovieCatalogMetadata({
      movieId: insertedMovie.id,
      tmdbMetadata: metadata.snapshot,
      people: metadata.people,
      genres: metadata.genres,
      keywords: metadata.keywords,
      providers: metadata.providers,
    });
  }

  logger.info({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed movie completed');
}

async function processDiscoverTMDBSourcePage(
  job: Job<CatalogDiscoverTMDBSourcePageJobData>,
): Promise<void> {
  ensureDatabase();

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is required for catalog discovery jobs');

  const candidates = await fetchTMDBSourcePage({
    apiKey,
    source: job.data.source,
    page: job.data.page,
    language: job.data.language,
  });
  const minVoteCount = job.data.minVoteCount ?? DEFAULT_MIN_VOTE_COUNT;
  const minVoteAverage = job.data.minVoteAverage ?? DEFAULT_MIN_VOTE_AVERAGE;
  const maxMovies = job.data.maxMoviesPerPage ?? candidates.length;
  const qualified = candidates
    .filter((movie) => {
      const year = parseTMDBYear(movie.release_date);
      return (
        year > 1800 &&
        (movie.vote_count ?? 0) >= minVoteCount &&
        movie.vote_average >= minVoteAverage &&
        movie.overview.trim().length > 0
      );
    })
    .slice(0, maxMovies);

  const queued = await import('@/features/catalogMaintenance/jobs').then(
    ({ enqueueCatalogSeedTMDBMovies }) =>
      enqueueCatalogSeedTMDBMovies({
        movies: qualified,
        source: 'tmdb_discovery',
        language: job.data.language,
      }),
  );

  logger.info(
    {
      jobId: job.id,
      source: job.data.source,
      page: job.data.page,
      candidates: candidates.length,
      qualified: qualified.length,
      queued,
    },
    'Catalog discovery page completed',
  );
}

async function enqueueBackfillJobForRepairBatchItem(input: {
  batchId: string | number;
  itemId: string | number;
  language?: string;
  movieId: string | number;
  reason: NonNullable<CatalogBackfillMovieJobData['reason']>;
}): Promise<{ jobId?: string; status: 'queued' | 'deduped' | 'unavailable' }> {
  if (!catalogMaintenanceQueue) return { status: 'unavailable' };

  const jobId = getCatalogBackfillMovieJobId(input.movieId);
  const existingJob = await catalogMaintenanceQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (ACTIVE_DEDUPE_STATES.has(state)) {
      return { jobId: String(existingJob.id ?? jobId), status: 'deduped' };
    }

    await existingJob.remove();
  }

  const job = await catalogMaintenanceQueue.add(
    CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie,
    {
      version: 1,
      movieId: input.movieId,
      reason: input.reason,
      language: input.language,
      repairBatchId: input.batchId,
      repairBatchItemId: input.itemId,
    },
    {
      ...CATALOG_MAINTENANCE_JOB_OPTIONS,
      jobId,
    },
  );

  return { jobId: String(job.id ?? jobId), status: 'queued' };
}

async function processEnqueueRepairBatch(
  job: Job<CatalogEnqueueRepairBatchJobData>,
): Promise<void> {
  await ensureCatalogSchema();

  const issueKey = job.data.issueKey;
  const batchId = job.data.batchId;
  const limit = Math.max(0, Number.isFinite(job.data.limit) ? Math.floor(job.data.limit) : 0);
  const pageSize = Math.min(
    Math.max(
      1,
      Number.isFinite(job.data.pageSize)
        ? Math.floor(job.data.pageSize)
        : DEFAULT_REPAIR_ORCHESTRATION_CHUNK_SIZE,
    ),
    MAX_REPAIR_ORCHESTRATION_CHUNK_SIZE,
  );
  const staleAfterDays = Math.max(
    1,
    Number.isFinite(job.data.staleAfterDays)
      ? Math.floor(job.data.staleAfterDays ?? DEFAULT_CATALOG_HEALTH_STALE_DAYS)
      : DEFAULT_CATALOG_HEALTH_STALE_DAYS,
  );
  const reason = getBackfillReasonForIssue(issueKey);
  let offset = 0;
  let attempted = 0;
  let queued = 0;
  let deduped = 0;
  let failed = 0;
  let unavailable = 0;

  try {
    while (attempted < limit) {
      const chunkLimit = Math.min(pageSize, limit - attempted);
      const page = await listCatalogHealthIssueMoviePage({
        issueKey,
        limit: chunkLimit,
        offset,
        staleAfterDays,
      });

      if (page.movies.length === 0) break;

      for (const movie of page.movies) {
        const item = await createCatalogRepairBatchItem({
          batchId,
          issueKey,
          language: job.data.language,
          movieId: movie.id,
          movieSnapshot: { ...movie },
          reason,
        });

        try {
          const enqueueResult = await enqueueBackfillJobForRepairBatchItem({
            batchId,
            itemId: item.id,
            language: job.data.language,
            movieId: movie.id,
            reason,
          });

          if (enqueueResult.status === 'unavailable') {
            unavailable += 1;
            await updateCatalogRepairBatchItemEnqueueResult({
              itemId: item.id,
              status: 'unavailable',
              errorMessage: 'catalog-maintenance queue is unavailable in the worker process.',
              result: { status: 'queue_unavailable', queueName: CATALOG_MAINTENANCE_QUEUE_NAME },
            });
            continue;
          }

          if (enqueueResult.status === 'deduped') deduped += 1;
          else queued += 1;

          await updateCatalogRepairBatchItemEnqueueResult({
            itemId: item.id,
            status: enqueueResult.status,
            queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
            jobName: CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie,
            jobId: enqueueResult.jobId,
            language: job.data.language,
            result: {
              status: enqueueResult.status,
              queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
            },
          });
        } catch (error) {
          failed += 1;
          await updateCatalogRepairBatchItemEnqueueResult({
            itemId: item.id,
            status: 'enqueue_failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            result: { status: 'enqueue_failed' },
          });
          logger.error(
            { err: error, batchId, issueKey, movieId: movie.id },
            'Catalog repair batch orchestration failed to enqueue item',
          );
        }
      }

      attempted += page.movies.length;
      offset += page.movies.length;
      await refreshCatalogRepairBatchCounts(batchId);

      if (page.movies.length < chunkLimit) break;
    }

    await updateCatalogRepairBatchOrchestrationResult({
      batchId,
      status: failed + unavailable > 0 && queued + deduped === 0 ? 'failed' : 'enqueueing',
      result: {
        jobId: String(job.id ?? 'unknown'),
        jobName: job.name,
        attempted,
        queued,
        deduped,
        unavailable,
        failed,
        issueKey,
        limit,
        pageSize,
      },
    });
    await refreshCatalogRepairBatchCounts(batchId);
  } catch (error) {
    await updateCatalogRepairBatchOrchestrationResult({
      batchId,
      status: 'failed',
      result: {
        jobId: String(job.id ?? 'unknown'),
        jobName: job.name,
        error: error instanceof Error ? error.message : String(error),
        attempted,
        queued,
        deduped,
        unavailable,
        failed,
        issueKey,
      },
    });
    throw error;
  }
}

async function loadBackfillMovie(movieId: string | number): Promise<BackfillMovieRow | null> {
  const result = await getPool().query<BackfillMovieRow>(
    `SELECT id::text, name, year, duration, description, score_rating, tmdb_id
       FROM movies
      WHERE id = $1
      LIMIT 1`,
    [movieId],
  );

  return result.rows[0] ?? null;
}

async function processBackfillMovie(job: Job<CatalogBackfillMovieJobData>): Promise<void> {
  await ensureCatalogSchema();
  const repairItem = await updateRepairBatchItem(
    job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
    'processing',
  );

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is required for catalog backfill jobs');

  const movie = await loadBackfillMovie(job.data.movieId);
  if (!movie) {
    logger.warn({ jobId: job.id, movieId: job.data.movieId }, 'Catalog backfill movie not found');
    await completeRepairBatchItemAfterBackfill({
      job: job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
      repairItem,
      result: { reason: 'movie_not_found', movieId: String(job.data.movieId) },
    });
    return;
  }

  const match = movie.tmdb_id
    ? { status: 'matched' as const, tmdbId: movie.tmdb_id, confidence: 1, candidates: [] }
    : await searchMovieMatch(apiKey, movie.name, movie.year);

  if (match.status !== 'matched') {
    logger.warn(
      {
        jobId: job.id,
        movieId: movie.id,
        status: match.status,
        candidateCount: match.candidates.length,
      },
      'Catalog backfill skipped movie without confident TMDB match',
    );
    await completeRepairBatchItemAfterBackfill({
      job: job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
      repairItem,
      result: {
        reason: 'tmdb_match_not_confident',
        movieId: movie.id,
        matchStatus: match.status,
        candidateCount: match.candidates.length,
      },
    });
    return;
  }

  const details = await fetchMovieDetails(apiKey, match.tmdbId, job.data.language);
  if (!details) {
    logger.warn({ jobId: job.id, tmdbId: match.tmdbId }, 'Catalog backfill found no details');
    await completeRepairBatchItemAfterBackfill({
      job: job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
      repairItem,
      result: { reason: 'tmdb_details_missing', movieId: movie.id, tmdbId: match.tmdbId },
    });
    return;
  }

  const runtime = details.runtime ?? movie.duration;
  const ageRating = extractUSCertification(details);
  const metadata = extractCatalogMetadata(details);
  const embeddingText = movieToEmbeddingText({
    title: movie.name,
    year: movie.year,
    ageRating,
    runtime,
    description: movie.description,
    scoreRating: Number(movie.score_rating),
  });

  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) throw new Error('OPENAI_API_KEY is required for catalog backfill jobs');
  const [embedding] = await createEmbeddings(openAIKey, [embeddingText]);
  if (!embedding) throw new Error(`Embedding missing for movie ${movie.id}`);

  await getPool().query(
    `UPDATE movies
        SET duration = $1,
            age_rating = $2,
            tmdb_id = $3,
            tmdb_match_confidence = $4,
            tmdb_match_source = 'backfill_auto',
            tmdb_matched_at = now(),
            poster_url = COALESCE($5, poster_url),
            localized_name = COALESCE($6, localized_name),
            embedding = $7::vector,
            original_title = $8,
            original_language = $9,
            release_date = $10::date,
            vote_count = $11,
            popularity = $12,
            metadata_quality_score = $13,
            metadata_quality_flags = $14::jsonb
      WHERE id = $15`,
    [
      runtime,
      ageRating,
      match.tmdbId,
      match.confidence,
      getPosterUrl(details.poster_path),
      details.title && details.title !== movie.name ? details.title : null,
      JSON.stringify(embedding),
      details.original_title ?? null,
      details.original_language ?? null,
      details.release_date || null,
      details.vote_count ?? null,
      details.popularity ?? null,
      metadata.qualityScore,
      JSON.stringify(metadata.qualityFlags),
      movie.id,
    ],
  );

  await upsertMovieCatalogMetadata({
    movieId: movie.id,
    tmdbMetadata: metadata.snapshot,
    people: metadata.people,
    genres: metadata.genres,
    keywords: metadata.keywords,
    providers: metadata.providers,
  });

  logger.info(
    { jobId: job.id, movieId: movie.id, tmdbId: match.tmdbId },
    'Catalog backfill completed',
  );
  await completeRepairBatchItemAfterBackfill({
    job: job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
    repairItem,
    result: { movieId: movie.id, tmdbId: match.tmdbId },
  });
}

export function createCatalogMaintenanceWorker(): CatalogWorker | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Catalog maintenance worker is disabled.');
    return null;
  }

  let worker!: CatalogWorker;
  worker = new Worker<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>(
    CATALOG_MAINTENANCE_QUEUE_NAME,
    async (job) => {
      await withTraceSpan(
        'catalog_maintenance.worker.process',
        {
          carrier: job.data.trace,
          attributes: {
            'messaging.system': 'bullmq',
            'messaging.destination.name': CATALOG_MAINTENANCE_QUEUE_NAME,
            'messaging.operation.name': 'process',
            'job.id': String(job.id ?? 'unknown'),
            'job.name': job.name,
            'catalog.job.source': 'source' in job.data ? job.data.source : undefined,
          },
        },
        async () => {
          try {
            if (job.name === CATALOG_MAINTENANCE_JOB_NAMES.seedTMDBMovie) {
              await processSeedTMDBMovie(job as Job<CatalogSeedTMDBMovieJobData>);
              return;
            }
            if (job.name === CATALOG_MAINTENANCE_JOB_NAMES.discoverTMDBSourcePage) {
              await processDiscoverTMDBSourcePage(job as Job<CatalogDiscoverTMDBSourcePageJobData>);
              return;
            }
            if (job.name === CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie) {
              await processBackfillMovie(job as Job<CatalogBackfillMovieJobData>);
              return;
            }
            if (job.name === CATALOG_MAINTENANCE_JOB_NAMES.enqueueCatalogRepairBatch) {
              await processEnqueueRepairBatch(job as Job<CatalogEnqueueRepairBatchJobData>);
              return;
            }
            throw new Error(`Unsupported catalog maintenance job: ${job.name}`);
          } catch (error) {
            if (error instanceof TMDBRateLimitError) {
              recordTMDBProviderError(catalogTMDBOperationForJob(job.name), 'rate_limited');
              await handleRateLimit(job, worker, error);
            }
            if (isTimeoutError(error)) {
              recordTMDBProviderError(catalogTMDBOperationForJob(job.name), 'timeout');
            }
            throw error;
          }
        },
      );
    },
    {
      connection,
      concurrency: parsePositiveIntEnv('CATALOG_MAINTENANCE_CONCURRENCY', DEFAULT_CONCURRENCY),
      limiter: {
        max: parsePositiveIntEnv(
          'CATALOG_TMDB_REQUESTS_PER_WINDOW',
          DEFAULT_TMDB_REQUESTS_PER_WINDOW,
        ),
        duration: parsePositiveIntEnv('CATALOG_TMDB_RATE_LIMIT_WINDOW_MS', DEFAULT_TMDB_WINDOW_MS),
      },
    },
  );

  worker.on('completed', (job) => {
    recordQueueJobEvent({
      queue: CATALOG_MAINTENANCE_QUEUE_NAME,
      job: job.name,
      event: 'completed',
      final: true,
    });
    logger.info({ jobId: job.id, jobName: job.name }, 'Catalog maintenance job completed');
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    const finalFailure = attemptsMade >= MAX_CATALOG_ATTEMPTS;
    recordQueueJobEvent({
      queue: CATALOG_MAINTENANCE_QUEUE_NAME,
      job: job?.name ?? 'unknown',
      event: 'failed',
      final: finalFailure,
    });
    if (finalFailure) {
      void updateRepairBatchItem(job, 'failed', {
        errorMessage: err instanceof Error ? err.message : String(err),
        result: { reason: 'worker_failed' },
      }).catch((statusError) => {
        logger.error(
          { err: statusError, jobId: job?.id, jobName: job?.name },
          'Failed to persist catalog repair batch item failure',
        );
      });
    }
    logger.error(
      {
        err,
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade,
        maxAttempts: MAX_CATALOG_ATTEMPTS,
        willRetry: attemptsMade < MAX_CATALOG_ATTEMPTS,
      },
      'Catalog maintenance job failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Catalog maintenance worker encountered an unrecoverable error');
    process.exit(1);
  });

  void worker.waitUntilReady().catch((err) => {
    logger.error({ err }, 'Catalog maintenance worker failed to initialize');
    process.exit(1);
  });

  return worker;
}
