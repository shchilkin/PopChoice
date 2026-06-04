/**
 * Movie Backfill Service — Entry Point
 *
 * Queries the database for movies missing TMDB identity or runtime and backfills them
 * by fetching runtime, age rating, and details from TMDB, then re-generates
 * embeddings and updates the database rows.
 *
 * Environment variables:
 *   TMDB_API_KEY    — TMDB v4 read access token (required)
 *   OPENAI_API_KEY  — OpenAI API key (required)
 *   DATABASE_URL    — PostgreSQL connection string (required)
 *   DRY_RUN         — Set to "true" to skip DB writes (default: false)
 *   BATCH_SIZE      — Number of parallel TMDB detail requests (default: 5)
 *   MAX_MOVIES      — Max movies to process; 0 = all (default: 0)
 */

import { pathToFileURL } from 'node:url';

import { loadConfig } from './config.js';
import {
  checkTableExists,
  closeDatabase,
  ensureCatalogMetadataSchema,
  ensureTMDBMatchReviewSchema,
  getIncompleteMovies,
  initDatabase,
  recordTMDBMatchReview,
  updateMovie,
  upsertMovieCatalogMetadata,
  type IncompleteMovie,
  type RecordTMDBMatchReviewInput,
} from './database.js';
import { createEmbeddings } from './embeddings.js';
import { logger } from './logger.js';
import {
  extractUSCertification,
  extractCatalogMetadata,
  fetchMovieDetails,
  getPosterUrl,
  movieToEmbeddingText,
  searchMovieMatch,
  type TMDBCatalogMetadata,
} from './tmdb.js';

type BackfillConfig = ReturnType<typeof loadConfig>;
type TMDBMatch = Awaited<ReturnType<typeof searchMovieMatch>>;
type MatchedTMDBMovie = Extract<TMDBMatch, { status: 'matched' }>;
type TMDBMovieDetails = NonNullable<Awaited<ReturnType<typeof fetchMovieDetails>>>;

interface BackfillTotals {
  totalProcessed: number;
  totalUpdated: number;
  totalWouldUpdate: number;
  totalSkipped: number;
}

interface BatchCounts {
  processed: number;
  updated: number;
  wouldUpdate: number;
  skipped: number;
}

/** A movie that passed all TMDB validations and is ready for embedding + DB update. */
export interface PendingUpdate {
  movie: IncompleteMovie;
  tmdbId: number;
  matchConfidence: number;
  runtime: number;
  ageRating: string;
  posterUrl: string | null;
  localizedName: string | null;
  embeddingText: string;
  catalogMetadata: TMDBCatalogMetadata;
}

type PreparationResult =
  | { status: 'pending'; update: PendingUpdate }
  | { status: 'skipped' }
  | { status: 'would_update' };

type MatchValidationResult = { status: 'matched'; match: MatchedTMDBMovie } | { status: 'skipped' };

type RuntimeValidationResult = { status: 'valid'; runtime: number } | { status: 'skipped' };

function isRuntimeCompatible(existingRuntime: number, tmdbRuntime: number): boolean {
  if (existingRuntime <= 0) return true;
  return Math.abs(existingRuntime - tmdbRuntime) <= 20;
}

function createTotals(): BackfillTotals {
  return {
    totalProcessed: 0,
    totalUpdated: 0,
    totalWouldUpdate: 0,
    totalSkipped: 0,
  };
}

function emptyBatchCounts(processed: number): BatchCounts {
  return {
    processed,
    updated: 0,
    wouldUpdate: 0,
    skipped: 0,
  };
}

function addBatchCounts(totals: BackfillTotals, counts: BatchCounts): void {
  totals.totalProcessed += counts.processed;
  totals.totalUpdated += counts.updated;
  totals.totalWouldUpdate += counts.wouldUpdate;
  totals.totalSkipped += counts.skipped;
}

function summarizePreparations(results: PreparationResult[]): {
  pendingUpdates: PendingUpdate[];
  wouldUpdate: number;
  skipped: number;
} {
  return results.reduce(
    (summary, result) => {
      if (result.status === 'pending') summary.pendingUpdates.push(result.update);
      if (result.status === 'would_update') summary.wouldUpdate++;
      if (result.status === 'skipped') summary.skipped++;
      return summary;
    },
    { pendingUpdates: [] as PendingUpdate[], wouldUpdate: 0, skipped: 0 },
  );
}

function logStartup(config: BackfillConfig): void {
  logger.info('Movie backfill service starting', {
    dryRun: config.dryRun,
    batchSize: config.batchSize,
    maxMovies: config.maxMovies === 0 ? 'unlimited' : config.maxMovies,
  });
}

function logCompletion(config: BackfillConfig, totals: BackfillTotals): void {
  if (config.dryRun) {
    logger.info('Dry-run complete', {
      totalProcessed: totals.totalProcessed,
      totalWouldUpdate: totals.totalWouldUpdate,
      totalSkipped: totals.totalSkipped,
    });
    return;
  }

  logger.info('Backfill complete', {
    totalProcessed: totals.totalProcessed,
    totalUpdated: totals.totalUpdated,
    totalSkipped: totals.totalSkipped,
  });
}

async function maybeRecordTMDBMatchReview(
  config: BackfillConfig,
  input: RecordTMDBMatchReviewInput,
): Promise<void> {
  if (config.dryRun) {
    logger.info('DRY RUN: would record TMDB match review', {
      id: input.movie.id,
      name: input.movie.name,
      year: input.movie.year,
      reason: input.reason,
      candidateCount: input.candidates.length,
    });
    return;
  }

  await recordTMDBMatchReview(input);
}

function resolveExistingTMDBMatch(movie: IncompleteMovie): MatchedTMDBMovie | null {
  if (!movie.tmdb_id) return null;

  return {
    status: 'matched',
    tmdbId: movie.tmdb_id,
    confidence: 1,
    title: movie.name,
    releaseYear: movie.year,
    candidates: [],
  };
}

async function resolveMovieMatch(
  config: BackfillConfig,
  movie: IncompleteMovie,
): Promise<TMDBMatch> {
  const existingMatch = resolveExistingTMDBMatch(movie);
  if (existingMatch) return existingMatch;

  return searchMovieMatch(config.tmdbApiKey, movie.name, movie.year);
}

async function validateMatch(
  config: BackfillConfig,
  movie: IncompleteMovie,
  match: TMDBMatch,
): Promise<MatchValidationResult> {
  if (match.status === 'ambiguous') {
    logger.warn('Ambiguous TMDB match — manual review needed', {
      id: movie.id,
      name: movie.name,
      year: movie.year,
      candidates: match.candidates,
    });
    await maybeRecordTMDBMatchReview(config, {
      movie,
      reason: 'ambiguous_match',
      candidates: match.candidates,
      notes: 'TMDB returned multiple high-confidence title/year candidates.',
    });
    return { status: 'skipped' };
  }

  if (match.status === 'not_found') {
    logger.warn('Movie not confidently found on TMDB — skipping', {
      id: movie.id,
      name: movie.name,
      year: movie.year,
      candidates: match.candidates,
    });
    return { status: 'skipped' };
  }

  return { status: 'matched', match };
}

async function fetchValidatedDetails(
  config: BackfillConfig,
  movie: IncompleteMovie,
  match: MatchedTMDBMovie,
): Promise<TMDBMovieDetails | null> {
  const details = await fetchMovieDetails(config.tmdbApiKey, match.tmdbId);
  if (details) return details;

  logger.warn('Failed to fetch movie details from TMDB — skipping', {
    name: movie.name,
    year: movie.year,
    tmdbId: match.tmdbId,
  });
  return null;
}

async function validateRuntime(
  config: BackfillConfig,
  movie: IncompleteMovie,
  match: MatchedTMDBMovie,
  details: TMDBMovieDetails,
): Promise<RuntimeValidationResult> {
  const runtime = details.runtime ?? movie.duration;
  if (!runtime || runtime === 0) {
    logger.warn('TMDB returned no runtime for movie — skipping', {
      name: movie.name,
      year: movie.year,
      tmdbId: match.tmdbId,
      runtime,
    });
    return { status: 'skipped' };
  }

  if (!isRuntimeCompatible(movie.duration, runtime)) {
    logger.warn('TMDB candidate runtime mismatch — manual review needed', {
      id: movie.id,
      name: movie.name,
      year: movie.year,
      existingRuntime: movie.duration,
      tmdbId: match.tmdbId,
      tmdbRuntime: runtime,
      matchConfidence: match.confidence,
      candidates: match.candidates,
    });
    await maybeRecordTMDBMatchReview(config, {
      movie,
      reason: 'runtime_mismatch',
      candidates: match.candidates,
      notes: `Existing runtime ${movie.duration} min did not match TMDB runtime ${runtime} min for candidate ${match.tmdbId}.`,
    });
    return { status: 'skipped' };
  }

  return { status: 'valid', runtime };
}

function buildPendingUpdate(
  movie: IncompleteMovie,
  match: MatchedTMDBMovie,
  details: TMDBMovieDetails,
  runtime: number,
): PendingUpdate {
  const ageRating = extractUSCertification(details);
  const catalogMetadata = extractCatalogMetadata(details);
  const embeddingText = movieToEmbeddingText(
    movie.name,
    movie.year,
    ageRating,
    runtime,
    movie.description,
    movie.score_rating,
  );

  return {
    movie,
    tmdbId: match.tmdbId,
    matchConfidence: match.confidence,
    runtime,
    ageRating,
    posterUrl: getPosterUrl(details.poster_path),
    localizedName: details.title && details.title !== movie.name ? details.title : null,
    embeddingText,
    catalogMetadata,
  };
}

function buildDryRunResult(movie: IncompleteMovie, update: PendingUpdate): PreparationResult {
  logger.info('DRY RUN: would update movie', {
    id: movie.id,
    name: movie.name,
    year: movie.year,
    tmdbId: update.tmdbId,
    matchConfidence: update.matchConfidence,
    runtime: update.runtime,
    ageRating: update.ageRating,
  });
  return { status: 'would_update' };
}

export async function preparePendingUpdate(
  config: BackfillConfig,
  movie: IncompleteMovie,
): Promise<PreparationResult> {
  const match = await resolveMovieMatch(config, movie);
  const matchResult = await validateMatch(config, movie, match);
  if (matchResult.status === 'skipped') return matchResult;

  const details = await fetchValidatedDetails(config, movie, matchResult.match);
  if (!details) return { status: 'skipped' };

  const runtimeResult = await validateRuntime(config, movie, matchResult.match, details);
  if (runtimeResult.status === 'skipped') return runtimeResult;

  const update = buildPendingUpdate(movie, matchResult.match, details, runtimeResult.runtime);
  if (config.dryRun) return buildDryRunResult(movie, update);

  return { status: 'pending', update };
}

async function preparePendingUpdateSafely(
  config: BackfillConfig,
  movie: IncompleteMovie,
): Promise<PreparationResult> {
  try {
    return await preparePendingUpdate(config, movie);
  } catch (err) {
    logger.warn('Failed to backfill movie — skipping', {
      id: movie.id,
      name: movie.name,
      year: movie.year,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'skipped' };
  }
}

async function writePendingUpdate(update: PendingUpdate, embedding: number[]): Promise<void> {
  await updateMovie(
    update.movie.id,
    update.runtime,
    update.ageRating,
    update.tmdbId,
    update.matchConfidence,
    update.posterUrl,
    update.localizedName,
    embedding,
  );
  await upsertMovieCatalogMetadata({
    movieId: update.movie.id,
    tmdbMetadata: update.catalogMetadata.snapshot,
    people: update.catalogMetadata.people,
    genres: update.catalogMetadata.genres,
    keywords: update.catalogMetadata.keywords,
    source: 'tmdb',
  });
}

function logSuccessfulUpdate(update: PendingUpdate): void {
  logger.info('Movie backfilled successfully', {
    id: update.movie.id,
    name: update.movie.name,
    year: update.movie.year,
    tmdbId: update.tmdbId,
    matchConfidence: update.matchConfidence,
    runtime: update.runtime,
    ageRating: update.ageRating,
    hasPoster: Boolean(update.posterUrl),
    hasLocalizedName: Boolean(update.localizedName),
    people: update.catalogMetadata.people.length,
    genres: update.catalogMetadata.genres.length,
    keywords: update.catalogMetadata.keywords.length,
  });
}

async function writePendingUpdateSafely(
  update: PendingUpdate,
  embedding: number[] | undefined,
): Promise<'updated' | 'skipped'> {
  if (!embedding) {
    logger.warn('Missing embedding for movie — skipping', {
      name: update.movie.name,
      year: update.movie.year,
    });
    return 'skipped';
  }

  try {
    await writePendingUpdate(update, embedding);
    logSuccessfulUpdate(update);
    return 'updated';
  } catch (err) {
    logger.warn('Failed to update movie in database — skipping', {
      id: update.movie.id,
      name: update.movie.name,
      year: update.movie.year,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'skipped';
  }
}

export async function writePendingUpdates(
  config: BackfillConfig,
  batchNum: number,
  pendingUpdates: PendingUpdate[],
): Promise<BatchCounts> {
  try {
    const embeddings = await createEmbeddings(
      config.openaiApiKey,
      pendingUpdates.map((update) => update.embeddingText),
    );
    const results = await Promise.all(
      pendingUpdates.map((update, index) => writePendingUpdateSafely(update, embeddings[index])),
    );
    return results.reduce((counts, result) => {
      counts[result === 'updated' ? 'updated' : 'skipped']++;
      return counts;
    }, emptyBatchCounts(0));
  } catch (err) {
    logger.warn('Failed to generate embeddings for batch — skipping all', {
      batch: batchNum,
      count: pendingUpdates.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ...emptyBatchCounts(0),
      skipped: pendingUpdates.length,
    };
  }
}

export async function processMovieBatch(
  config: BackfillConfig,
  batch: IncompleteMovie[],
  batchNum: number,
  totalBatches: number,
): Promise<BatchCounts> {
  logger.info('Processing batch', { batch: batchNum, totalBatches, size: batch.length });

  const preparations = await Promise.all(
    batch.map((movie) => preparePendingUpdateSafely(config, movie)),
  );
  const summary = summarizePreparations(preparations);
  const counts = {
    ...emptyBatchCounts(batch.length),
    wouldUpdate: summary.wouldUpdate,
    skipped: summary.skipped,
  };
  if (summary.pendingUpdates.length === 0) return counts;

  const writeCounts = await writePendingUpdates(config, batchNum, summary.pendingUpdates);
  return {
    ...counts,
    updated: writeCounts.updated,
    skipped: counts.skipped + writeCounts.skipped,
  };
}

export async function runBackfill(config: BackfillConfig): Promise<BackfillTotals | null> {
  const tableExists = await checkTableExists('movies');
  if (!tableExists) {
    logger.info("Table 'movies' does not exist — skipping backfill");
    return null;
  }

  await ensureTMDBMatchReviewSchema();
  await ensureCatalogMetadataSchema();

  const movies = await getIncompleteMovies(config.maxMovies);
  logger.info('Fetched movies needing TMDB identity or metadata backfill', {
    count: movies.length,
  });

  if (movies.length === 0) {
    logger.info('No movies need TMDB identity or metadata backfill — nothing to do');
    return null;
  }

  const totals = createTotals();
  const totalBatches = Math.ceil(movies.length / config.batchSize);

  for (let index = 0; index < movies.length; index += config.batchSize) {
    const batch = movies.slice(index, index + config.batchSize);
    const batchNum = Math.floor(index / config.batchSize) + 1;
    const counts = await processMovieBatch(config, batch, batchNum, totalBatches);
    addBatchCounts(totals, counts);
  }

  return totals;
}

export async function main(): Promise<void> {
  const config = loadConfig();
  logStartup(config);
  initDatabase(config.databaseUrl);

  try {
    const totals = await runBackfill(config);
    if (totals) logCompletion(config, totals);
  } finally {
    await closeDatabase();
  }
}

function logFatalError(err: unknown): void {
  logger.error('Fatal error', {
    error: err instanceof Error ? err.message : String(err),
  });
}

function isDirectRun(): boolean {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
}

if (isDirectRun()) {
  main().catch((err) => {
    logFatalError(err);
    process.exit(1);
  });
}
