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

import type { TMDBCatalogMetadata, TMDBMovieDetails } from '@/features/catalogMaintenance/tmdb';
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

type BackfillMovieMatch = Extract<
  Awaited<ReturnType<typeof searchMovieMatch>>,
  { status: 'matched' }
>;
type BackfillMovieMatchResult = Awaited<ReturnType<typeof searchMovieMatch>>;

type PreparedBackfillMovie =
  | {
      status: 'ready';
      details: TMDBMovieDetails;
      match: BackfillMovieMatch;
      movie: BackfillMovieRow;
    }
  | {
      status: 'movie_not_found';
      movieId: string | number;
    }
  | {
      status: 'tmdb_details_missing';
      movie: BackfillMovieRow;
      tmdbId: number;
    }
  | {
      status: 'tmdb_match_not_confident';
      candidateCount: number;
      matchStatus: Exclude<BackfillMovieMatchResult['status'], 'matched'>;
      movie: BackfillMovieRow;
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

let catalogDatabaseInitialized = false;
let schemaReadyPromise: Promise<void> | null = null;

function getCatalogDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) return databaseUrl;
  throw new Error('DATABASE_URL is required for catalog maintenance jobs');
}

function parseCatalogWorkerPositiveIntEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function ensureDatabase(): void {
  if (catalogDatabaseInitialized) return;
  initDatabase(getCatalogDatabaseUrl());
  catalogDatabaseInitialized = true;
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
  const repairBatchItemId = getRepairBatchItemId(job);
  if (!repairBatchItemId) return null;

  const item = await updateCatalogRepairBatchItemStatus({
    itemId: repairBatchItemId,
    status,
    errorMessage: options.errorMessage,
    result: getRepairBatchItemStatusResult(job, options.result),
  });

  const repairBatchId = getRepairBatchId(job);
  if (repairBatchId) {
    await refreshCatalogRepairBatchCounts(repairBatchId);
  }

  return item;
}

function getRepairBatchItemId(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): string | number | undefined {
  return job?.data && 'repairBatchItemId' in job.data ? job.data.repairBatchItemId : undefined;
}

function getRepairBatchId(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): string | number | undefined {
  return job?.data && 'repairBatchId' in job.data ? job.data.repairBatchId : undefined;
}

function getRepairBatchItemStatusResult(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
  result: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return {
    jobId: getWorkerJobId(job),
    jobName: getWorkerJobName(job),
    attemptsMade: getWorkerJobAttemptsMade(job),
    ...result,
  };
}

function getWorkerJobId(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): string {
  return String(job?.id ?? 'unknown');
}

function getWorkerJobName(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): string {
  return job?.name ?? 'unknown';
}

function getWorkerJobAttemptsMade(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): number {
  return job?.attemptsMade ?? 0;
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
    staleAfterDays: parseCatalogWorkerPositiveIntEnv(
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
      : parseCatalogWorkerPositiveIntEnv(
          'CATALOG_TMDB_429_BACKOFF_MS',
          DEFAULT_TMDB_429_BACKOFF_MS,
        );
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

function getSeedMovieLocalKey(movie: CatalogSeedTMDBMovieJobData['movie']): string {
  return `${movie.title.toLowerCase()}|${parseTMDBYear(movie.release_date)}`;
}

function hasLocalSeedDuplicate(jobData: CatalogSeedTMDBMovieJobData): boolean {
  return jobData.localKeys?.includes(getSeedMovieLocalKey(jobData.movie)) ?? false;
}

async function fetchSeedMovieDetails(
  movieId: number,
  language: string | undefined,
): Promise<TMDBMovieDetails | null> {
  const apiKey = process.env.TMDB_API_KEY;
  return apiKey ? fetchMovieDetails(apiKey, movieId, language) : null;
}

function getSeedMovieYear(
  movie: CatalogSeedTMDBMovieJobData['movie'],
  details: TMDBMovieDetails | null,
): number {
  return parseTMDBYear(details?.release_date ?? movie.release_date);
}

async function upsertSeedCatalogMetadata(
  movieId: string,
  metadata: TMDBCatalogMetadata,
): Promise<void> {
  await upsertMovieCatalogMetadata({
    movieId,
    tmdbMetadata: metadata.snapshot,
    people: metadata.people,
    genres: metadata.genres,
    keywords: metadata.keywords,
    providers: metadata.providers,
  });
}

async function refreshExistingSeedMovieMetadata(
  movieId: string,
  details: TMDBMovieDetails | null,
): Promise<void> {
  if (!details) return;
  await upsertSeedCatalogMetadata(movieId, extractCatalogMetadata(details));
}

type SeedMovieRecordInput = {
  ageRating: string;
  description: string;
  details: TMDBMovieDetails | null;
  embedding: number[];
  metadata: TMDBCatalogMetadata | null;
  movie: CatalogSeedTMDBMovieJobData['movie'];
  runtime: number;
  scoreRating: number;
  year: number;
};

type SeedMovieRecordDraftInput = Omit<SeedMovieRecordInput, 'embedding'> & {
  embedding: number[] | undefined;
};

type SeedMovieCandidate = {
  details: TMDBMovieDetails | null;
  year: number;
};

type SeedMovieSkipReason =
  'existing_movie' | 'insert_noop' | 'invalid_embedding' | 'local_duplicate' | 'missing_year';

type PreparedSeedMovie =
  | {
      status: 'ready';
      metadata: TMDBCatalogMetadata | null;
      movie: CatalogSeedTMDBMovieJobData['movie'];
      record: MovieRecord;
    }
  | {
      status: 'skip';
      movie: CatalogSeedTMDBMovieJobData['movie'];
      reason: SeedMovieSkipReason;
    };

type SeedMovieCandidateOutcome =
  | {
      status: 'candidate';
      candidate: SeedMovieCandidate;
      movie: CatalogSeedTMDBMovieJobData['movie'];
    }
  | Extract<PreparedSeedMovie, { status: 'skip' }>;

async function resolveSeedMovieEmbedding(
  jobData: CatalogSeedTMDBMovieJobData,
  input: Omit<SeedMovieRecordInput, 'embedding' | 'metadata'>,
): Promise<number[] | undefined> {
  if (jobData.embedding) return jobData.embedding;
  return createSeedMovieEmbedding(input);
}

function getRequiredOpenAIKeyForSeedMovie(): string {
  const openAIKey = process.env.OPENAI_API_KEY;
  if (openAIKey) return openAIKey;
  throw new Error('OPENAI_API_KEY is required to embed catalog seed movies');
}

function getSeedMovieEmbeddingTitle(
  input: Omit<SeedMovieRecordInput, 'embedding' | 'metadata'>,
): string {
  return input.details?.title ?? input.movie.title;
}

async function createSeedMovieEmbedding(
  input: Omit<SeedMovieRecordInput, 'embedding' | 'metadata'>,
): Promise<number[] | undefined> {
  const embeddings = await createEmbeddings(getRequiredOpenAIKeyForSeedMovie(), [
    movieToEmbeddingText({
      title: getSeedMovieEmbeddingTitle(input),
      year: input.year,
      ageRating: input.ageRating,
      runtime: input.runtime,
      description: input.description,
      scoreRating: input.scoreRating,
    }),
  ]);
  return embeddings[0];
}

function isValidSeedEmbedding(embedding: number[] | undefined): embedding is number[] {
  if (!embedding) return false;
  return embedding.some((value) => value !== 0);
}

function getSeedMovieName(input: SeedMovieRecordInput): string {
  return input.details?.title ?? input.movie.title;
}

function getSeedMoviePosterUrl(input: SeedMovieRecordInput): string | null {
  return getPosterUrl(input.details?.poster_path ?? input.movie.poster_path);
}

function getSeedMovieLocalizedName(input: SeedMovieRecordInput): string | null {
  const title = input.details?.title;
  return title && title !== input.movie.title ? title : null;
}

function getSeedMovieVoteCount(input: SeedMovieRecordInput): number | null {
  return input.details?.vote_count ?? input.movie.vote_count ?? null;
}

function getSeedMoviePopularity(input: SeedMovieRecordInput): number | null {
  return input.details?.popularity ?? null;
}

function getSeedMovieReleaseDate(input: SeedMovieRecordInput): string {
  return input.details?.release_date ?? input.movie.release_date;
}

function getSeedMovieQualityFlags(input: SeedMovieRecordInput): string[] {
  return input.metadata?.qualityFlags ?? ['missing_details'];
}

function getSeedMovieOriginalTitle(input: SeedMovieRecordInput): string | null {
  return input.details?.original_title ?? null;
}

function getSeedMovieOriginalLanguage(input: SeedMovieRecordInput): string | null {
  return input.details?.original_language ?? null;
}

function getSeedMovieQualityScore(input: SeedMovieRecordInput): number {
  return input.metadata?.qualityScore ?? 0;
}

function buildSeedMovieRecord(input: SeedMovieRecordInput): MovieRecord {
  return {
    name: getSeedMovieName(input),
    year: input.year,
    age_rating: input.ageRating,
    description: input.description,
    duration: input.runtime,
    score_rating: input.scoreRating,
    original_title: getSeedMovieOriginalTitle(input),
    original_language: getSeedMovieOriginalLanguage(input),
    release_date: getSeedMovieReleaseDate(input),
    vote_count: getSeedMovieVoteCount(input),
    popularity: getSeedMoviePopularity(input),
    metadata_quality_score: getSeedMovieQualityScore(input),
    metadata_quality_flags: getSeedMovieQualityFlags(input),
    poster_url: getSeedMoviePosterUrl(input),
    localized_name: getSeedMovieLocalizedName(input),
    tmdb_id: input.movie.id,
    tmdb_match_confidence: 1,
    tmdb_match_source: 'tmdb_discovery',
    embedding: input.embedding,
  };
}

async function insertSeedMovie(record: MovieRecord): Promise<string | null> {
  const result = await insertMovies([record]);
  return result.insertedMovies[0]?.id ?? null;
}

function getSeedMovieAgeRating(details: TMDBMovieDetails | null): string {
  return details ? extractUSCertification(details) : 'NR';
}

function getSeedMovieRuntime(details: TMDBMovieDetails | null): number {
  return details?.runtime ?? 0;
}

function getSeedMovieDescription(
  movie: CatalogSeedTMDBMovieJobData['movie'],
  details: TMDBMovieDetails | null,
): string {
  return details?.overview || movie.overview || 'No description available.';
}

function getSeedMovieScoreRating(
  movie: CatalogSeedTMDBMovieJobData['movie'],
  details: TMDBMovieDetails | null,
): number {
  return Number((details?.vote_average ?? movie.vote_average ?? 0).toFixed(1));
}

function getSeedMovieMetadata(details: TMDBMovieDetails | null): TMDBCatalogMetadata | null {
  return details ? extractCatalogMetadata(details) : null;
}

async function buildSeedMovieRecordDraftInput(
  jobData: CatalogSeedTMDBMovieJobData,
  candidate: SeedMovieCandidate,
): Promise<SeedMovieRecordDraftInput> {
  const movie = jobData.movie;
  const details = candidate.details;
  const ageRating = getSeedMovieAgeRating(details);
  const runtime = getSeedMovieRuntime(details);
  const description = getSeedMovieDescription(movie, details);
  const scoreRating = getSeedMovieScoreRating(movie, details);
  const metadata = getSeedMovieMetadata(details);
  const embedding = await resolveSeedMovieEmbedding(jobData, {
    ageRating,
    description,
    details,
    movie,
    runtime,
    scoreRating,
    year: candidate.year,
  });

  return {
    ageRating,
    description,
    details,
    embedding,
    metadata,
    movie,
    runtime,
    scoreRating,
    year: candidate.year,
  };
}

async function getReadySeedMovieRecordInput(
  jobData: CatalogSeedTMDBMovieJobData,
  candidate: SeedMovieCandidate,
): Promise<SeedMovieRecordInput | null> {
  const draft = await buildSeedMovieRecordDraftInput(jobData, candidate);
  if (!isValidSeedEmbedding(draft.embedding)) return null;
  return { ...draft, embedding: draft.embedding };
}

async function getSeedMovieCandidate(
  jobData: CatalogSeedTMDBMovieJobData,
): Promise<SeedMovieCandidate | null> {
  const details = await fetchSeedMovieDetails(jobData.movie.id, jobData.language);
  const year = getSeedMovieYear(jobData.movie, details);
  return year > 0 ? { details, year } : null;
}

async function seedMovieAlreadyExists(
  jobData: CatalogSeedTMDBMovieJobData,
  candidate: SeedMovieCandidate,
): Promise<boolean> {
  const existingMovieId = await findExistingMovieId({
    tmdbId: jobData.movie.id,
    title: jobData.movie.title,
    year: candidate.year,
  });
  if (!existingMovieId) return false;

  await refreshExistingSeedMovieMetadata(existingMovieId, candidate.details);
  return true;
}

async function getSeedMovieCandidateOutcome(
  jobData: CatalogSeedTMDBMovieJobData,
): Promise<SeedMovieCandidateOutcome> {
  const movie = jobData.movie;
  if (hasLocalSeedDuplicate(jobData)) return { status: 'skip', movie, reason: 'local_duplicate' };

  const candidate = await getSeedMovieCandidate(jobData);
  if (!candidate) return { status: 'skip', movie, reason: 'missing_year' };

  return { status: 'candidate', candidate, movie };
}

async function prepareSeedMovieRecord(
  jobData: CatalogSeedTMDBMovieJobData,
  outcome: Extract<SeedMovieCandidateOutcome, { status: 'candidate' }>,
): Promise<PreparedSeedMovie> {
  const { candidate, movie } = outcome;
  const alreadyExists = await seedMovieAlreadyExists(jobData, candidate);
  if (alreadyExists) return { status: 'skip', movie, reason: 'existing_movie' };

  const recordInput = await getReadySeedMovieRecordInput(jobData, candidate);
  if (!recordInput) return { status: 'skip', movie, reason: 'invalid_embedding' };

  return {
    status: 'ready',
    metadata: recordInput.metadata,
    movie,
    record: buildSeedMovieRecord(recordInput),
  };
}

async function prepareSeedMovie(jobData: CatalogSeedTMDBMovieJobData): Promise<PreparedSeedMovie> {
  const outcome = await getSeedMovieCandidateOutcome(jobData);
  if (outcome.status === 'skip') return outcome;
  return prepareSeedMovieRecord(jobData, outcome);
}

function logSeedMovieSkip(job: Job<CatalogSeedTMDBMovieJobData>, outcome: PreparedSeedMovie): void {
  if (outcome.status === 'ready') return;

  const context = { jobId: job.id, tmdbId: outcome.movie.id };
  const messages: Record<SeedMovieSkipReason, string> = {
    existing_movie: 'Catalog seed skipped existing movie',
    insert_noop: 'Catalog seed produced no inserted row',
    invalid_embedding: 'Catalog seed skipped invalid embedding',
    local_duplicate: 'Catalog seed skipped local duplicate',
    missing_year: 'Catalog seed skipped movie without year',
  };
  const log =
    outcome.reason === 'missing_year' || outcome.reason === 'invalid_embedding'
      ? logger.warn.bind(logger)
      : logger.debug.bind(logger);
  log(context, messages[outcome.reason]);
}

async function insertPreparedSeedMovie(
  job: Job<CatalogSeedTMDBMovieJobData>,
  prepared: Extract<PreparedSeedMovie, { status: 'ready' }>,
): Promise<PreparedSeedMovie> {
  const insertedMovieId = await insertSeedMovie(prepared.record);
  if (!insertedMovieId) {
    return { status: 'skip', movie: prepared.movie, reason: 'insert_noop' };
  }

  if (prepared.metadata) {
    await upsertSeedCatalogMetadata(insertedMovieId, prepared.metadata);
  }

  logger.info({ jobId: job.id, tmdbId: prepared.movie.id }, 'Catalog seed movie completed');
  return prepared;
}

async function processSeedTMDBMovie(job: Job<CatalogSeedTMDBMovieJobData>): Promise<void> {
  await ensureCatalogSchema();

  const prepared = await prepareSeedMovie(job.data);
  if (prepared.status === 'skip') {
    logSeedMovieSkip(job, prepared);
    return;
  }

  const result = await insertPreparedSeedMovie(job, prepared);
  logSeedMovieSkip(job, result);
}

function getRequiredTMDBApiKeyForDiscovery(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey) return apiKey;
  throw new Error('TMDB_API_KEY is required for catalog discovery jobs');
}

function getCatalogDiscoveryLimits(jobData: CatalogDiscoverTMDBSourcePageJobData): {
  maxMovies: number | undefined;
  minVoteAverage: number;
  minVoteCount: number;
} {
  return {
    maxMovies: jobData.maxMoviesPerPage,
    minVoteAverage: jobData.minVoteAverage ?? DEFAULT_MIN_VOTE_AVERAGE,
    minVoteCount: jobData.minVoteCount ?? DEFAULT_MIN_VOTE_COUNT,
  };
}

function isQualifiedTMDBCatalogCandidate(
  movie: Awaited<ReturnType<typeof fetchTMDBSourcePage>>[number],
  limits: ReturnType<typeof getCatalogDiscoveryLimits>,
): boolean {
  return [
    hasCatalogCandidateReleaseYear(movie),
    hasCatalogCandidateVoteFloor(movie, limits),
    hasCatalogCandidateVoteAverage(movie, limits),
    hasCatalogCandidateOverview(movie),
  ].every(Boolean);
}

function hasCatalogCandidateReleaseYear(
  movie: Awaited<ReturnType<typeof fetchTMDBSourcePage>>[number],
): boolean {
  const year = parseTMDBYear(movie.release_date);
  return year > 1800;
}

function hasCatalogCandidateVoteFloor(
  movie: Awaited<ReturnType<typeof fetchTMDBSourcePage>>[number],
  limits: ReturnType<typeof getCatalogDiscoveryLimits>,
): boolean {
  const voteCount = movie.vote_count ?? 0;
  return voteCount >= limits.minVoteCount;
}

function hasCatalogCandidateVoteAverage(
  movie: Awaited<ReturnType<typeof fetchTMDBSourcePage>>[number],
  limits: ReturnType<typeof getCatalogDiscoveryLimits>,
): boolean {
  return movie.vote_average >= limits.minVoteAverage;
}

function hasCatalogCandidateOverview(
  movie: Awaited<ReturnType<typeof fetchTMDBSourcePage>>[number],
): boolean {
  return movie.overview.trim().length > 0;
}

function getQualifiedTMDBCatalogCandidates(
  candidates: Awaited<ReturnType<typeof fetchTMDBSourcePage>>,
  limits: ReturnType<typeof getCatalogDiscoveryLimits>,
): Awaited<ReturnType<typeof fetchTMDBSourcePage>> {
  return candidates
    .filter((movie) => isQualifiedTMDBCatalogCandidate(movie, limits))
    .slice(0, limits.maxMovies ?? candidates.length);
}

async function processDiscoverTMDBSourcePage(
  job: Job<CatalogDiscoverTMDBSourcePageJobData>,
): Promise<void> {
  ensureDatabase();

  const candidates = await fetchTMDBSourcePage({
    apiKey: getRequiredTMDBApiKeyForDiscovery(),
    source: job.data.source,
    page: job.data.page,
    language: job.data.language,
  });
  const qualified = getQualifiedTMDBCatalogCandidates(
    candidates,
    getCatalogDiscoveryLimits(job.data),
  );

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

type BackfillJobEnqueueResult = {
  jobId?: string;
  status: 'queued' | 'deduped' | 'unavailable';
};

type ExistingBackfillJob = Awaited<
  ReturnType<NonNullable<typeof catalogMaintenanceQueue>['getJob']>
>;

function getUnavailableBackfillEnqueueResult(): BackfillJobEnqueueResult {
  return { status: 'unavailable' };
}

async function getExistingBackfillJobResult(
  existingJob: ExistingBackfillJob,
  fallbackJobId: string,
): Promise<BackfillJobEnqueueResult | null> {
  if (!existingJob) return null;

  const state = await existingJob.getState();
  if (ACTIVE_DEDUPE_STATES.has(state)) {
    return { jobId: String(existingJob.id ?? fallbackJobId), status: 'deduped' };
  }

  await existingJob.remove();
  return null;
}

async function enqueueBackfillJobForRepairBatchItem(input: {
  batchId: string | number;
  itemId: string | number;
  language?: string;
  movieId: string | number;
  reason: NonNullable<CatalogBackfillMovieJobData['reason']>;
}): Promise<BackfillJobEnqueueResult> {
  if (!catalogMaintenanceQueue) return getUnavailableBackfillEnqueueResult();

  const jobId = getCatalogBackfillMovieJobId(input.movieId);
  const existingJob = await catalogMaintenanceQueue.getJob(jobId);
  const existingJobResult = await getExistingBackfillJobResult(existingJob, jobId);
  if (existingJobResult) return existingJobResult;

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

type CatalogHealthIssueMovie = Awaited<
  ReturnType<typeof listCatalogHealthIssueMoviePage>
>['movies'][number];
type RepairBatchEnqueueResult = BackfillJobEnqueueResult;

type RepairBatchOrchestrationParams = {
  batchId: string | number;
  issueKey: string;
  language?: string;
  limit: number;
  pageSize: number;
  reason: NonNullable<CatalogBackfillMovieJobData['reason']>;
  staleAfterDays: number;
};

type RepairBatchCounters = {
  attempted: number;
  queued: number;
  deduped: number;
  failed: number;
  unavailable: number;
};

function normalizeRepairBatchLimit(limit: number): number {
  return Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 0);
}

function normalizeRepairBatchPageSize(pageSize: number): number {
  const normalized = Number.isFinite(pageSize)
    ? Math.floor(pageSize)
    : DEFAULT_REPAIR_ORCHESTRATION_CHUNK_SIZE;
  return Math.min(Math.max(1, normalized), MAX_REPAIR_ORCHESTRATION_CHUNK_SIZE);
}

function normalizeRepairBatchStaleDays(staleAfterDays: number | undefined): number {
  const normalized = Number.isFinite(staleAfterDays)
    ? Math.floor(staleAfterDays ?? DEFAULT_CATALOG_HEALTH_STALE_DAYS)
    : DEFAULT_CATALOG_HEALTH_STALE_DAYS;
  return Math.max(1, normalized);
}

function getRepairBatchOrchestrationParams(
  jobData: CatalogEnqueueRepairBatchJobData,
): RepairBatchOrchestrationParams {
  return {
    batchId: jobData.batchId,
    issueKey: jobData.issueKey,
    language: jobData.language,
    limit: normalizeRepairBatchLimit(jobData.limit),
    pageSize: normalizeRepairBatchPageSize(jobData.pageSize),
    reason: getBackfillReasonForIssue(jobData.issueKey),
    staleAfterDays: normalizeRepairBatchStaleDays(jobData.staleAfterDays),
  };
}

function createRepairBatchCounters(): RepairBatchCounters {
  return {
    attempted: 0,
    queued: 0,
    deduped: 0,
    failed: 0,
    unavailable: 0,
  };
}

function getRepairBatchOrchestrationStatus(counters: RepairBatchCounters): 'failed' | 'enqueueing' {
  return counters.failed + counters.unavailable > 0 && counters.queued + counters.deduped === 0
    ? 'failed'
    : 'enqueueing';
}

function getRepairBatchOrchestrationResult(
  job: Job<CatalogEnqueueRepairBatchJobData>,
  params: RepairBatchOrchestrationParams,
  counters: RepairBatchCounters,
): Record<string, unknown> {
  return {
    jobId: String(job.id ?? 'unknown'),
    jobName: job.name,
    attempted: counters.attempted,
    queued: counters.queued,
    deduped: counters.deduped,
    unavailable: counters.unavailable,
    failed: counters.failed,
    issueKey: params.issueKey,
    limit: params.limit,
    pageSize: params.pageSize,
  };
}

function getFailedRepairBatchOrchestrationResult(
  job: Job<CatalogEnqueueRepairBatchJobData>,
  params: RepairBatchOrchestrationParams,
  counters: RepairBatchCounters,
  error: unknown,
): Record<string, unknown> {
  return {
    jobId: String(job.id ?? 'unknown'),
    jobName: job.name,
    error: error instanceof Error ? error.message : String(error),
    attempted: counters.attempted,
    queued: counters.queued,
    deduped: counters.deduped,
    unavailable: counters.unavailable,
    failed: counters.failed,
    issueKey: params.issueKey,
  };
}

async function createRepairBatchItemForMovie(
  params: RepairBatchOrchestrationParams,
  movie: CatalogHealthIssueMovie,
): Promise<CatalogRepairBatchItem> {
  return createCatalogRepairBatchItem({
    batchId: params.batchId,
    issueKey: params.issueKey,
    language: params.language,
    movieId: movie.id,
    movieSnapshot: { ...movie },
    reason: params.reason,
  });
}

async function markRepairQueueUnavailable(itemId: string | number): Promise<void> {
  await updateCatalogRepairBatchItemEnqueueResult({
    itemId,
    status: 'unavailable',
    errorMessage: 'catalog-maintenance queue is unavailable in the worker process.',
    result: { status: 'queue_unavailable', queueName: CATALOG_MAINTENANCE_QUEUE_NAME },
  });
}

async function markRepairItemEnqueued(input: {
  itemId: string | number;
  language?: string;
  result: RepairBatchEnqueueResult;
}): Promise<void> {
  await updateCatalogRepairBatchItemEnqueueResult({
    itemId: input.itemId,
    status: input.result.status,
    queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
    jobName: CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie,
    jobId: input.result.jobId,
    language: input.language,
    result: {
      status: input.result.status,
      queueName: CATALOG_MAINTENANCE_QUEUE_NAME,
    },
  });
}

async function markRepairItemEnqueueFailed(itemId: string | number, error: unknown): Promise<void> {
  await updateCatalogRepairBatchItemEnqueueResult({
    itemId,
    status: 'enqueue_failed',
    errorMessage: error instanceof Error ? error.message : String(error),
    result: { status: 'enqueue_failed' },
  });
}

function recordRepairBatchEnqueueResult(
  counters: RepairBatchCounters,
  result: RepairBatchEnqueueResult,
): void {
  if (result.status === 'unavailable') counters.unavailable += 1;
  else if (result.status === 'deduped') counters.deduped += 1;
  else counters.queued += 1;
}

async function enqueueRepairBatchMovie(input: {
  counters: RepairBatchCounters;
  movie: CatalogHealthIssueMovie;
  params: RepairBatchOrchestrationParams;
}): Promise<void> {
  const item = await createRepairBatchItemForMovie(input.params, input.movie);

  try {
    const result = await enqueueBackfillJobForRepairBatchItem({
      batchId: input.params.batchId,
      itemId: item.id,
      language: input.params.language,
      movieId: input.movie.id,
      reason: input.params.reason,
    });

    recordRepairBatchEnqueueResult(input.counters, result);
    if (result.status === 'unavailable') {
      await markRepairQueueUnavailable(item.id);
      return;
    }

    await markRepairItemEnqueued({
      itemId: item.id,
      language: input.params.language,
      result,
    });
  } catch (error) {
    input.counters.failed += 1;
    await markRepairItemEnqueueFailed(item.id, error);
    logger.error(
      {
        err: error,
        batchId: input.params.batchId,
        issueKey: input.params.issueKey,
        movieId: input.movie.id,
      },
      'Catalog repair batch orchestration failed to enqueue item',
    );
  }
}

async function processRepairBatchPage(input: {
  counters: RepairBatchCounters;
  offset: number;
  params: RepairBatchOrchestrationParams;
}): Promise<{ chunkLimit: number; movieCount: number }> {
  const chunkLimit = Math.min(input.params.pageSize, input.params.limit - input.counters.attempted);
  const page = await listCatalogHealthIssueMoviePage({
    issueKey: input.params.issueKey,
    limit: chunkLimit,
    offset: input.offset,
    staleAfterDays: input.params.staleAfterDays,
  });

  for (const movie of page.movies) {
    await enqueueRepairBatchMovie({
      counters: input.counters,
      movie,
      params: input.params,
    });
  }

  return { chunkLimit, movieCount: page.movies.length };
}

async function processRepairBatchPages(
  params: RepairBatchOrchestrationParams,
  counters: RepairBatchCounters,
): Promise<void> {
  let offset = 0;

  while (counters.attempted < params.limit) {
    const { chunkLimit, movieCount } = await processRepairBatchPage({
      counters,
      offset,
      params,
    });

    if (movieCount === 0) break;

    counters.attempted += movieCount;
    offset += movieCount;
    await refreshCatalogRepairBatchCounts(params.batchId);

    if (movieCount < chunkLimit) break;
  }
}

async function processEnqueueRepairBatch(
  job: Job<CatalogEnqueueRepairBatchJobData>,
): Promise<void> {
  await ensureCatalogSchema();

  const params = getRepairBatchOrchestrationParams(job.data);
  const counters = createRepairBatchCounters();

  try {
    await processRepairBatchPages(params, counters);

    await updateCatalogRepairBatchOrchestrationResult({
      batchId: params.batchId,
      status: getRepairBatchOrchestrationStatus(counters),
      result: getRepairBatchOrchestrationResult(job, params, counters),
    });
    await refreshCatalogRepairBatchCounts(params.batchId);
  } catch (error) {
    await updateCatalogRepairBatchOrchestrationResult({
      batchId: params.batchId,
      status: 'failed',
      result: getFailedRepairBatchOrchestrationResult(job, params, counters, error),
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

function getRequiredTMDBApiKeyForBackfill(): string {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is required for catalog backfill jobs');
  return apiKey;
}

async function resolveBackfillMovieMatch(
  apiKey: string,
  movie: BackfillMovieRow,
): Promise<BackfillMovieMatchResult> {
  return movie.tmdb_id
    ? { status: 'matched' as const, tmdbId: movie.tmdb_id, confidence: 1, candidates: [] }
    : searchMovieMatch(apiKey, movie.name, movie.year);
}

async function prepareBackfillMovie(
  jobData: CatalogBackfillMovieJobData,
): Promise<PreparedBackfillMovie> {
  const apiKey = getRequiredTMDBApiKeyForBackfill();
  const movie = await loadBackfillMovie(jobData.movieId);
  if (!movie) return { status: 'movie_not_found', movieId: jobData.movieId };

  const match = await resolveBackfillMovieMatch(apiKey, movie);
  if (match.status !== 'matched') {
    return {
      status: 'tmdb_match_not_confident',
      candidateCount: match.candidates.length,
      matchStatus: match.status,
      movie,
    };
  }

  const details = await fetchMovieDetails(apiKey, match.tmdbId, jobData.language);
  return details
    ? { status: 'ready', details, match, movie }
    : {
        status: 'tmdb_details_missing',
        movie,
        tmdbId: match.tmdbId,
      };
}

function getBackfillSkipResult(prepared: Exclude<PreparedBackfillMovie, { status: 'ready' }>) {
  if (prepared.status === 'movie_not_found') {
    return { reason: prepared.status, movieId: String(prepared.movieId) };
  }
  if (prepared.status === 'tmdb_details_missing') {
    return { reason: prepared.status, movieId: prepared.movie.id, tmdbId: prepared.tmdbId };
  }
  return {
    reason: prepared.status,
    movieId: prepared.movie.id,
    matchStatus: prepared.matchStatus,
    candidateCount: prepared.candidateCount,
  };
}

function logBackfillSkip(
  job: Job<CatalogBackfillMovieJobData>,
  prepared: Exclude<PreparedBackfillMovie, { status: 'ready' }>,
): void {
  if (prepared.status === 'movie_not_found') {
    logger.warn({ jobId: job.id, movieId: prepared.movieId }, 'Catalog backfill movie not found');
    return;
  }
  if (prepared.status === 'tmdb_details_missing') {
    logger.warn({ jobId: job.id, tmdbId: prepared.tmdbId }, 'Catalog backfill found no details');
    return;
  }

  logger.warn(
    {
      jobId: job.id,
      movieId: prepared.movie.id,
      status: prepared.matchStatus,
      candidateCount: prepared.candidateCount,
    },
    'Catalog backfill skipped movie without confident TMDB match',
  );
}

async function completeSkippedBackfillMovie(input: {
  job: Job<CatalogBackfillMovieJobData>;
  prepared: Exclude<PreparedBackfillMovie, { status: 'ready' }>;
  repairItem: CatalogRepairBatchItem | null;
}): Promise<void> {
  logBackfillSkip(input.job, input.prepared);
  await completeRepairBatchItemAfterBackfill({
    job: input.job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
    repairItem: input.repairItem,
    result: getBackfillSkipResult(input.prepared),
  });
}

function getBackfillEmbeddingText(prepared: Extract<PreparedBackfillMovie, { status: 'ready' }>) {
  const runtime = prepared.details.runtime ?? prepared.movie.duration;
  return movieToEmbeddingText({
    title: prepared.movie.name,
    year: prepared.movie.year,
    ageRating: extractUSCertification(prepared.details),
    runtime,
    description: prepared.movie.description,
    scoreRating: Number(prepared.movie.score_rating),
  });
}

async function createBackfillEmbedding(
  prepared: Extract<PreparedBackfillMovie, { status: 'ready' }>,
  reason: CatalogBackfillMovieJobData['reason'],
): Promise<number[] | null> {
  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    const requiresEmbeddingRefresh = reason === 'missing_tmdb_id' || !reason;
    if (requiresEmbeddingRefresh) {
      throw new Error('OPENAI_API_KEY is required for catalog backfill jobs');
    }
    return null;
  }

  const [embedding] = await createEmbeddings(openAIKey, [getBackfillEmbeddingText(prepared)]);
  if (!embedding) throw new Error(`Embedding missing for movie ${prepared.movie.id}`);
  return embedding;
}

function getBackfillRuntime(prepared: Extract<PreparedBackfillMovie, { status: 'ready' }>): number {
  return prepared.details.runtime ?? prepared.movie.duration;
}

function getBackfillPosterUrl(details: TMDBMovieDetails): string | null {
  return getPosterUrl(details.poster_path);
}

function getBackfillLocalizedName(
  details: TMDBMovieDetails,
  movie: BackfillMovieRow,
): string | null {
  return details.title && details.title !== movie.name ? details.title : null;
}

function getBackfillOriginalTitle(details: TMDBMovieDetails): string | null {
  return details.original_title ?? null;
}

function getBackfillOriginalLanguage(details: TMDBMovieDetails): string | null {
  return details.original_language ?? null;
}

function getBackfillReleaseDate(details: TMDBMovieDetails): string | null {
  return details.release_date || null;
}

function getBackfillVoteCount(details: TMDBMovieDetails): number | null {
  return details.vote_count ?? null;
}

function getBackfillPopularity(details: TMDBMovieDetails): number | null {
  return details.popularity ?? null;
}

async function updateBackfilledMovie(input: {
  embedding: number[] | null;
  metadata: TMDBCatalogMetadata;
  prepared: Extract<PreparedBackfillMovie, { status: 'ready' }>;
}): Promise<void> {
  const { details, match, movie } = input.prepared;

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
            embedding = COALESCE($7::vector, embedding),
            original_title = $8,
            original_language = $9,
            release_date = $10::date,
            vote_count = $11,
            popularity = $12,
            metadata_quality_score = $13,
            metadata_quality_flags = $14::jsonb
      WHERE id = $15`,
    [
      getBackfillRuntime(input.prepared),
      extractUSCertification(details),
      match.tmdbId,
      match.confidence,
      getBackfillPosterUrl(details),
      getBackfillLocalizedName(details, movie),
      input.embedding ? JSON.stringify(input.embedding) : null,
      getBackfillOriginalTitle(details),
      getBackfillOriginalLanguage(details),
      getBackfillReleaseDate(details),
      getBackfillVoteCount(details),
      getBackfillPopularity(details),
      input.metadata.qualityScore,
      JSON.stringify(input.metadata.qualityFlags),
      movie.id,
    ],
  );
}

async function persistBackfillMovie(input: {
  job: Job<CatalogBackfillMovieJobData>;
  prepared: Extract<PreparedBackfillMovie, { status: 'ready' }>;
  repairItem: CatalogRepairBatchItem | null;
}): Promise<void> {
  const metadata = extractCatalogMetadata(input.prepared.details);
  const embedding = await createBackfillEmbedding(input.prepared, input.job.data.reason);

  await updateBackfilledMovie({ embedding, metadata, prepared: input.prepared });
  await upsertSeedCatalogMetadata(input.prepared.movie.id, metadata);

  logger.info(
    {
      jobId: input.job.id,
      movieId: input.prepared.movie.id,
      tmdbId: input.prepared.match.tmdbId,
    },
    'Catalog backfill completed',
  );
  await completeRepairBatchItemAfterBackfill({
    job: input.job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
    repairItem: input.repairItem,
    result: { movieId: input.prepared.movie.id, tmdbId: input.prepared.match.tmdbId },
  });
}

async function processBackfillMovie(job: Job<CatalogBackfillMovieJobData>): Promise<void> {
  await ensureCatalogSchema();
  const repairItem = await updateRepairBatchItem(
    job as Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
    'processing',
  );

  const prepared = await prepareBackfillMovie(job.data);
  if (prepared.status !== 'ready') {
    await completeSkippedBackfillMovie({ job, prepared, repairItem });
    return;
  }

  await persistBackfillMovie({ job, prepared, repairItem });
}

type CatalogMaintenanceJobHandler = (
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
) => Promise<void>;

const CATALOG_MAINTENANCE_JOB_HANDLERS: Record<
  CatalogMaintenanceJobName,
  CatalogMaintenanceJobHandler
> = {
  [CATALOG_MAINTENANCE_JOB_NAMES.seedTMDBMovie]: async (job) =>
    processSeedTMDBMovie(job as Job<CatalogSeedTMDBMovieJobData>),
  [CATALOG_MAINTENANCE_JOB_NAMES.discoverTMDBSourcePage]: async (job) =>
    processDiscoverTMDBSourcePage(job as Job<CatalogDiscoverTMDBSourcePageJobData>),
  [CATALOG_MAINTENANCE_JOB_NAMES.backfillMovie]: async (job) =>
    processBackfillMovie(job as Job<CatalogBackfillMovieJobData>),
  [CATALOG_MAINTENANCE_JOB_NAMES.enqueueCatalogRepairBatch]: async (job) =>
    processEnqueueRepairBatch(job as Job<CatalogEnqueueRepairBatchJobData>),
};

function getCatalogTraceAttributes(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
): Record<string, string | undefined> {
  return {
    'messaging.system': 'bullmq',
    'messaging.destination.name': CATALOG_MAINTENANCE_QUEUE_NAME,
    'messaging.operation.name': 'process',
    'job.id': String(job.id ?? 'unknown'),
    'job.name': job.name,
    'catalog.job.source': 'source' in job.data ? job.data.source : undefined,
  };
}

async function handleCatalogMaintenanceJobError(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
  worker: CatalogWorker,
  error: unknown,
): Promise<void> {
  if (error instanceof TMDBRateLimitError) {
    recordTMDBProviderError(catalogTMDBOperationForJob(job.name), 'rate_limited');
    await handleRateLimit(job, worker, error);
  }
  if (isTimeoutError(error)) {
    recordTMDBProviderError(catalogTMDBOperationForJob(job.name), 'timeout');
  }
}

async function processCatalogMaintenanceJob(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
  worker: CatalogWorker,
): Promise<void> {
  try {
    await CATALOG_MAINTENANCE_JOB_HANDLERS[job.name](job);
  } catch (error) {
    await handleCatalogMaintenanceJobError(job, worker, error);
    throw error;
  }
}

function recordCatalogMaintenanceCompleted(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName>,
): void {
  recordQueueJobEvent({
    queue: CATALOG_MAINTENANCE_QUEUE_NAME,
    job: job.name,
    event: 'completed',
    final: true,
  });
  logger.info({ jobId: job.id, jobName: job.name }, 'Catalog maintenance job completed');
}

type CatalogMaintenanceFailureContext = {
  attemptsMade: number;
  finalFailure: boolean;
  jobId: string | number | undefined;
  jobName: CatalogMaintenanceJobName | undefined;
};

function getCatalogMaintenanceFailureContext(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): CatalogMaintenanceFailureContext {
  const attemptsMade = getWorkerJobAttemptsMade(job);
  return {
    attemptsMade,
    finalFailure: attemptsMadeReachedLimit(attemptsMade),
    jobId: getWorkerJobId(job),
    jobName: getCatalogWorkerJobName(job),
  };
}

function attemptsMadeReachedLimit(attemptsMade: number): boolean {
  return attemptsMade >= MAX_CATALOG_ATTEMPTS;
}

function getCatalogWorkerJobName(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
): CatalogMaintenanceJobName | undefined {
  return job?.name;
}

function recordCatalogMaintenanceFailed(context: CatalogMaintenanceFailureContext): void {
  recordQueueJobEvent({
    queue: CATALOG_MAINTENANCE_QUEUE_NAME,
    job: context.jobName ?? 'unknown',
    event: 'failed',
    final: context.finalFailure,
  });
}

function markRepairBatchItemFailedAfterWorkerFailure(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
  err: Error,
): void {
  void updateRepairBatchItem(job, 'failed', {
    errorMessage: err.message,
    result: { reason: 'worker_failed' },
  }).catch((statusError) => {
    logger.error(
      { err: statusError, jobId: job?.id, jobName: job?.name },
      'Failed to persist catalog repair batch item failure',
    );
  });
}

function handleCatalogMaintenanceJobFailure(
  job: Job<CatalogMaintenanceJobData, void, CatalogMaintenanceJobName> | undefined,
  err: Error,
): void {
  const context = getCatalogMaintenanceFailureContext(job);
  recordCatalogMaintenanceFailed(context);
  if (context.finalFailure) markRepairBatchItemFailedAfterWorkerFailure(job, err);
  logger.error(
    {
      err,
      jobId: context.jobId,
      jobName: context.jobName,
      attemptsMade: context.attemptsMade,
      maxAttempts: MAX_CATALOG_ATTEMPTS,
      willRetry: !context.finalFailure,
    },
    'Catalog maintenance job failed',
  );
}

// Imported dynamically by startWorkers.ts.
// fallow-ignore-next-line unused-export
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
          attributes: getCatalogTraceAttributes(job),
        },
        () => processCatalogMaintenanceJob(job, worker),
      );
    },
    {
      connection,
      concurrency: parseCatalogWorkerPositiveIntEnv(
        'CATALOG_MAINTENANCE_CONCURRENCY',
        DEFAULT_CONCURRENCY,
      ),
      limiter: {
        max: parseCatalogWorkerPositiveIntEnv(
          'CATALOG_TMDB_REQUESTS_PER_WINDOW',
          DEFAULT_TMDB_REQUESTS_PER_WINDOW,
        ),
        duration: parseCatalogWorkerPositiveIntEnv(
          'CATALOG_TMDB_RATE_LIMIT_WINDOW_MS',
          DEFAULT_TMDB_WINDOW_MS,
        ),
      },
    },
  );

  worker.on('completed', recordCatalogMaintenanceCompleted);
  worker.on('failed', handleCatalogMaintenanceJobFailure);

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
