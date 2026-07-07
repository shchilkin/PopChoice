import {
  CATALOG_MAINTENANCE_JOB_NAMES,
  CATALOG_MAINTENANCE_JOB_OPTIONS,
  catalogMaintenanceQueue,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { getTraceCarrier, withTraceSpan } from '@/lib/tracing';

import type {
  CatalogBackfillMovieJobData,
  CatalogDiscoverTMDBSourcePageJobData,
  CatalogMaintenanceJobName,
  CatalogSeedTMDBMovieJobData,
  TMDBCatalogCandidate,
} from '@/lib/jobQueue';

const DEFAULT_TMDB_LANGUAGE = 'en-US';
type CatalogMaintenanceJobData =
  CatalogSeedTMDBMovieJobData | CatalogDiscoverTMDBSourcePageJobData | CatalogBackfillMovieJobData;
type TraceAttributeValue = string | number | boolean;

function normalizeLanguage(language?: string): string {
  return (language ?? DEFAULT_TMDB_LANGUAGE).trim() || DEFAULT_TMDB_LANGUAGE;
}

function toBullMQJobIdPart(value: string | number): string {
  return String(value).replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function getCatalogSeedTMDBMovieJobId(tmdbId: number, language?: string): string {
  return `tmdb-seed-${tmdbId}-${toBullMQJobIdPart(normalizeLanguage(language))}`;
}

function getCatalogDiscoverTMDBSourcePageJobId(
  source: CatalogDiscoverTMDBSourcePageJobData['source'],
  page: number,
  language?: string,
): string {
  return `tmdb-discover-${toBullMQJobIdPart(source)}-${page}-${toBullMQJobIdPart(
    normalizeLanguage(language),
  )}`;
}

function getCatalogBackfillMovieJobId(movieId: string | number): string {
  return `backfill-${toBullMQJobIdPart(movieId)}`;
}

async function enqueueCatalogMaintenanceJob(input: {
  queue: NonNullable<typeof catalogMaintenanceQueue>;
  name: CatalogMaintenanceJobName;
  data: CatalogMaintenanceJobData;
  jobId: string;
  attributes: Record<string, TraceAttributeValue>;
}): Promise<void> {
  await withTraceSpan(
    'catalog_maintenance.enqueue',
    {
      attributes: {
        'messaging.system': 'bullmq',
        'messaging.destination.name': 'catalog-maintenance',
        'messaging.operation.name': 'enqueue',
        'job.name': input.name,
        ...input.attributes,
      },
    },
    async (span) => {
      const job = await input.queue.add(input.name, input.data, {
        ...CATALOG_MAINTENANCE_JOB_OPTIONS,
        jobId: input.jobId,
      });
      span.setAttribute('job.id', String(job.id ?? 'unknown'));
    },
  );
}

export async function enqueueCatalogSeedTMDBMovies(input: {
  movies: TMDBCatalogCandidate[];
  source: CatalogSeedTMDBMovieJobData['source'];
  localKeys?: string[];
  embeddings?: Map<number, number[]>;
  language?: string;
}): Promise<number> {
  if (!catalogMaintenanceQueue || input.movies.length === 0) return 0;
  const queue = catalogMaintenanceQueue;

  const language = normalizeLanguage(input.language);
  const jobs = input.movies.map((movie) => ({
    name: CATALOG_MAINTENANCE_JOB_NAMES.seedTMDBMovie as CatalogMaintenanceJobName,
    data: {
      version: 1 as const,
      source: input.source,
      movie,
      localKeys: input.localKeys,
      embedding: input.embeddings?.get(movie.id),
      language,
      trace: getTraceCarrier(),
    },
    opts: {
      ...CATALOG_MAINTENANCE_JOB_OPTIONS,
      jobId: getCatalogSeedTMDBMovieJobId(movie.id, language),
    },
  }));

  await withTraceSpan(
    'catalog_maintenance.enqueue_bulk',
    {
      attributes: {
        'messaging.system': 'bullmq',
        'messaging.destination.name': 'catalog-maintenance',
        'messaging.operation.name': 'enqueue',
        'job.name': CATALOG_MAINTENANCE_JOB_NAMES.seedTMDBMovie,
        'catalog.jobs.count': jobs.length,
      },
    },
    async () => {
      await queue.addBulk(jobs);
    },
  );
  return jobs.length;
}

export async function enqueueCatalogDiscoverTMDBSourcePage(
  input: Omit<CatalogDiscoverTMDBSourcePageJobData, 'version'>,
): Promise<boolean> {
  if (!catalogMaintenanceQueue) return false;
  const queue = catalogMaintenanceQueue;

  const data: CatalogDiscoverTMDBSourcePageJobData = {
    version: 1,
    ...input,
    language: normalizeLanguage(input.language),
    trace: getTraceCarrier(),
  };

  await enqueueCatalogMaintenanceJob({
    queue,
    name: CATALOG_MAINTENANCE_JOB_NAMES.discoverTMDBSourcePage,
    data,
    jobId: getCatalogDiscoverTMDBSourcePageJobId(input.source, input.page, data.language),
    attributes: {
      'tmdb.source': input.source,
      'tmdb.page': input.page,
    },
  });

  logger.info({ source: input.source, page: input.page }, 'Queued catalog discovery page job');
  return true;
}

export async function enqueueCatalogBackfillMovie(
  input: Omit<CatalogBackfillMovieJobData, 'version'>,
): Promise<boolean> {
  if (!catalogMaintenanceQueue) return false;
  const queue = catalogMaintenanceQueue;

  const data: CatalogBackfillMovieJobData = {
    version: 1,
    ...input,
    language: normalizeLanguage(input.language),
    trace: getTraceCarrier(),
  };

  await enqueueCatalogMaintenanceJob({
    queue,
    name: CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie,
    data,
    jobId: getCatalogBackfillMovieJobId(input.movieId),
    attributes: { 'movie.id': String(input.movieId) },
  });

  logger.info({ movieId: input.movieId, reason: input.reason }, 'Queued catalog backfill job');
  return true;
}
