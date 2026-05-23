import {
  CATALOG_MAINTENANCE_JOB_NAMES,
  CATALOG_MAINTENANCE_JOB_OPTIONS,
  catalogMaintenanceQueue,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';

import type {
  CatalogBackfillMovieJobData,
  CatalogDiscoverTMDBSourcePageJobData,
  CatalogMaintenanceJobName,
  CatalogSeedTMDBMovieJobData,
  TMDBCatalogCandidate,
} from '@/lib/jobQueue';

const DEFAULT_TMDB_LANGUAGE = 'en-US';

function normalizeLanguage(language?: string): string {
  return (language ?? DEFAULT_TMDB_LANGUAGE).trim() || DEFAULT_TMDB_LANGUAGE;
}

export function getCatalogSeedTMDBMovieJobId(tmdbId: number, language?: string): string {
  return `tmdb-seed:${tmdbId}:${normalizeLanguage(language)}`;
}

export function getCatalogDiscoverTMDBSourcePageJobId(
  source: CatalogDiscoverTMDBSourcePageJobData['source'],
  page: number,
  language?: string,
): string {
  return `tmdb-discover:${source}:${page}:${normalizeLanguage(language)}`;
}

export function getCatalogBackfillMovieJobId(movieId: string | number): string {
  return `backfill:${movieId}`;
}

export async function enqueueCatalogSeedTMDBMovie(
  input: Omit<CatalogSeedTMDBMovieJobData, 'version'>,
): Promise<boolean> {
  if (!catalogMaintenanceQueue) return false;

  const data: CatalogSeedTMDBMovieJobData = {
    version: 1,
    ...input,
    language: normalizeLanguage(input.language),
  };

  await catalogMaintenanceQueue.add(CATALOG_MAINTENANCE_JOB_NAMES.seedTMDBMovie, data, {
    ...CATALOG_MAINTENANCE_JOB_OPTIONS,
    jobId: getCatalogSeedTMDBMovieJobId(input.movie.id, data.language),
  });

  return true;
}

export async function enqueueCatalogSeedTMDBMovies(input: {
  movies: TMDBCatalogCandidate[];
  source: CatalogSeedTMDBMovieJobData['source'];
  localKeys?: string[];
  embeddings?: Map<number, number[]>;
  language?: string;
}): Promise<number> {
  if (!catalogMaintenanceQueue || input.movies.length === 0) return 0;

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
    },
    opts: {
      ...CATALOG_MAINTENANCE_JOB_OPTIONS,
      jobId: getCatalogSeedTMDBMovieJobId(movie.id, language),
    },
  }));

  await catalogMaintenanceQueue.addBulk(jobs);
  return jobs.length;
}

export async function enqueueCatalogDiscoverTMDBSourcePage(
  input: Omit<CatalogDiscoverTMDBSourcePageJobData, 'version'>,
): Promise<boolean> {
  if (!catalogMaintenanceQueue) return false;

  const data: CatalogDiscoverTMDBSourcePageJobData = {
    version: 1,
    ...input,
    language: normalizeLanguage(input.language),
  };

  await catalogMaintenanceQueue.add(CATALOG_MAINTENANCE_JOB_NAMES.discoverTMDBSourcePage, data, {
    ...CATALOG_MAINTENANCE_JOB_OPTIONS,
    jobId: getCatalogDiscoverTMDBSourcePageJobId(input.source, input.page, data.language),
  });

  logger.info({ source: input.source, page: input.page }, 'Queued catalog discovery page job');
  return true;
}

export async function enqueueCatalogBackfillMovie(
  input: Omit<CatalogBackfillMovieJobData, 'version'>,
): Promise<boolean> {
  if (!catalogMaintenanceQueue) return false;

  const data: CatalogBackfillMovieJobData = {
    version: 1,
    ...input,
    language: normalizeLanguage(input.language),
  };

  await catalogMaintenanceQueue.add(CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie, data, {
    ...CATALOG_MAINTENANCE_JOB_OPTIONS,
    jobId: getCatalogBackfillMovieJobId(input.movieId),
  });

  logger.info({ movieId: input.movieId, reason: input.reason }, 'Queued catalog backfill job');
  return true;
}
