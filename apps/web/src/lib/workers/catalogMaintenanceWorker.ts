import {
  createEmbeddings,
  ensureCatalogMetadataSchema,
  getPool,
  initDatabase,
  insertMovies,
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
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';

import type {
  CatalogBackfillMovieJobData,
  CatalogDiscoverTMDBSourcePageJobData,
  CatalogMaintenanceJobData,
  CatalogMaintenanceJobName,
  CatalogSeedTMDBMovieJobData,
} from '@/lib/jobQueue';
import type { MovieRecord } from '@pop-choice/shared';
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
  schemaReadyPromise ??= ensureCatalogMetadataSchema();
  await schemaReadyPromise;
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
      });
    }
    logger.debug({ jobId: job.id, tmdbId: movie.id }, 'Catalog seed skipped existing movie');
    return;
  }

  const ageRating = details ? extractUSCertification(details) : 'NR';
  const runtime = details?.runtime ?? 0;
  const description = details?.overview || movie.overview || 'No description available.';
  const scoreRating = Number((details?.vote_average ?? movie.vote_average ?? 0).toFixed(1));
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

  if (details) {
    const metadata = extractCatalogMetadata(details);
    await upsertMovieCatalogMetadata({
      movieId: insertedMovie.id,
      tmdbMetadata: metadata.snapshot,
      people: metadata.people,
      genres: metadata.genres,
      keywords: metadata.keywords,
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

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is required for catalog backfill jobs');

  const movie = await loadBackfillMovie(job.data.movieId);
  if (!movie) {
    logger.warn({ jobId: job.id, movieId: job.data.movieId }, 'Catalog backfill movie not found');
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
    return;
  }

  const details = await fetchMovieDetails(apiKey, match.tmdbId, job.data.language);
  if (!details) {
    logger.warn({ jobId: job.id, tmdbId: match.tmdbId }, 'Catalog backfill found no details');
    return;
  }

  const runtime = details.runtime ?? movie.duration;
  const ageRating = extractUSCertification(details);
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
            embedding = $7::vector
      WHERE id = $8`,
    [
      runtime,
      ageRating,
      match.tmdbId,
      match.confidence,
      getPosterUrl(details.poster_path),
      details.title && details.title !== movie.name ? details.title : null,
      JSON.stringify(embedding),
      movie.id,
    ],
  );

  const metadata = extractCatalogMetadata(details);
  await upsertMovieCatalogMetadata({
    movieId: movie.id,
    tmdbMetadata: metadata.snapshot,
    people: metadata.people,
    genres: metadata.genres,
    keywords: metadata.keywords,
  });

  logger.info(
    { jobId: job.id, movieId: movie.id, tmdbId: match.tmdbId },
    'Catalog backfill completed',
  );
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
        throw new Error(`Unsupported catalog maintenance job: ${job.name}`);
      } catch (error) {
        if (error instanceof TMDBRateLimitError) {
          await handleRateLimit(job, worker, error);
        }
        throw error;
      }
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
    logger.info({ jobId: job.id, jobName: job.name }, 'Catalog maintenance job completed');
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
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
