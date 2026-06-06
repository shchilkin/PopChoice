import { getDbClient } from '@/clients/dbClient';
import {
  enqueueCatalogBackfillMovie,
  enqueueCatalogDiscoverTMDBSourcePage,
} from '@/features/catalogMaintenance/jobs';
import { closeBullMQQueues } from '@/lib/jobQueue';

import type { TMDBDiscoverySource } from '@/lib/jobQueue';

const VALID_SOURCES: TMDBDiscoverySource[] = ['now_playing', 'upcoming', 'top_rated', 'popular'];

function ensureRedisConfigured(): void {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required to enqueue catalog maintenance jobs');
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseFloat(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSources(): TMDBDiscoverySource[] {
  const rawSources = parseRawSources();
  const filtered = rawSources.filter(isValidSource);
  if (hasOnlyInvalidSources(rawSources, filtered)) {
    throw new Error(`TMDB_SOURCES must include one of: ${VALID_SOURCES.join(', ')}`);
  }
  return rawSources.length > 0 ? filtered : [...VALID_SOURCES];
}

async function enqueueDiscovery(): Promise<void> {
  const queued = await enqueueDiscoveryPages(getDiscoveryOptions());
  console.log(`Queued ${queued} catalog discovery page jobs.`);
}

async function enqueueBackfill(): Promise<void> {
  const db = getDbClient();
  assertBackfillDbConfigured(db);

  const limit = parsePositiveInt(process.env.MAX_MOVIES, 100);
  const result = await db.query<{ id: string }>(
    `SELECT id::text
       FROM movies
      WHERE tmdb_id IS NULL
         OR duration = 0
         OR age_rating = 'NR'
         OR poster_url IS NULL
         OR localized_name IS NULL
         OR (tmdb_id IS NOT NULL AND tmdb_metadata_refreshed_at IS NULL)
      ORDER BY id ASC
      LIMIT $1`,
    [limit],
  );

  const queued = await enqueueBackfillRows(result.rows);
  console.log(`Queued ${queued} catalog backfill jobs.`);
}

function parseRawSources() {
  return process.env.TMDB_SOURCES?.split(',').map((source) => source.trim()) ?? [];
}

function isValidSource(source: string): source is TMDBDiscoverySource {
  return VALID_SOURCES.includes(source as TMDBDiscoverySource);
}

function hasOnlyInvalidSources(rawSources: string[], filtered: TMDBDiscoverySource[]) {
  return rawSources.length > 0 && filtered.length === 0;
}

function getDiscoveryOptions() {
  return {
    language: process.env.TMDB_LANGUAGE?.trim() || 'en-US',
    maxMoviesPerPage: parsePositiveInt(process.env.MAX_MOVIES_PER_PAGE, 20),
    maxPagesPerSource: parsePositiveInt(process.env.MAX_PAGES_PER_SOURCE, 3),
    minVoteAverage: parsePositiveFloat(process.env.MIN_VOTE_AVERAGE, 6.5),
    minVoteCount: parsePositiveInt(process.env.MIN_VOTE_COUNT, 500),
    sources: parseSources(),
  };
}

async function enqueueDiscoveryPages(options: ReturnType<typeof getDiscoveryOptions>) {
  let queued = 0;
  for (const source of options.sources) {
    queued += await enqueueDiscoverySource(source, options);
  }

  return queued;
}

async function enqueueDiscoverySource(
  source: TMDBDiscoverySource,
  options: ReturnType<typeof getDiscoveryOptions>,
) {
  let queued = 0;
  for (let page = 1; page <= options.maxPagesPerSource; page++) {
    const didQueue = await enqueueCatalogDiscoverTMDBSourcePage({
      language: options.language,
      maxMoviesPerPage: options.maxMoviesPerPage,
      minVoteAverage: options.minVoteAverage,
      minVoteCount: options.minVoteCount,
      page,
      source,
    });
    if (didQueue) queued++;
  }

  return queued;
}

function assertBackfillDbConfigured(db: ReturnType<typeof getDbClient>): asserts db is ReturnType<
  typeof getDbClient
> & {
  query: NonNullable<ReturnType<typeof getDbClient>['query']>;
} {
  if (!db.isConfigured() || !db.query) {
    throw new Error('DATABASE_URL is required to enqueue catalog backfill jobs');
  }
}

async function enqueueBackfillRows(rows: Array<{ id: string }>) {
  let queued = 0;
  for (const row of rows) {
    const didQueue = await enqueueCatalogBackfillMovie({
      language: process.env.TMDB_LANGUAGE?.trim() || 'en-US',
      movieId: row.id,
      reason: 'missing_metadata',
    });
    if (didQueue) queued++;
  }

  return queued;
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'help';
  if (mode === 'discovery') {
    ensureRedisConfigured();
    await enqueueDiscovery();
    return;
  }
  if (mode === 'backfill') {
    ensureRedisConfigured();
    await enqueueBackfill();
    return;
  }

  console.log(`Usage:
  npm run enqueue:catalog-maintenance --workspace=apps/web -- discovery
  npm run enqueue:catalog-maintenance --workspace=apps/web -- backfill
`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => closeBullMQQueues());
