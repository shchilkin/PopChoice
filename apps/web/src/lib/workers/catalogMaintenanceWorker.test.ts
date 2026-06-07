import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  capturedProcessor,
  mockCreateBullMQConnection,
  mockCreateEmbeddings,
  mockEnsureCatalogMetadataSchema,
  mockEnsureCatalogRepairActionSchema,
  mockExtractCatalogMetadata,
  mockExtractUSCertification,
  mockFetchMovieDetails,
  mockGetPool,
  mockInitDatabase,
  mockRecordQueueJobEvent,
  mockUpsertMovieCatalogMetadata,
  mockWorkerOn,
  MockWorker,
} = vi.hoisted(() => {
  const capturedProcessor: { current: ((job: unknown) => Promise<void>) | null } = {
    current: null,
  };
  const mockWorkerOn = vi.fn();

  function MockWorker(
    this: { on: ReturnType<typeof vi.fn>; waitUntilReady: ReturnType<typeof vi.fn> },
    _queue: string,
    processor: (job: unknown) => Promise<void>,
  ) {
    capturedProcessor.current = processor;
    this.on = mockWorkerOn;
    this.waitUntilReady = vi.fn().mockResolvedValue(undefined);
  }

  return {
    capturedProcessor,
    mockCreateBullMQConnection: vi.fn(),
    mockCreateEmbeddings: vi.fn(),
    mockEnsureCatalogMetadataSchema: vi.fn(),
    mockEnsureCatalogRepairActionSchema: vi.fn(),
    mockExtractCatalogMetadata: vi.fn(),
    mockExtractUSCertification: vi.fn(),
    mockFetchMovieDetails: vi.fn(),
    mockGetPool: vi.fn(),
    mockInitDatabase: vi.fn(),
    mockRecordQueueJobEvent: vi.fn(),
    mockUpsertMovieCatalogMetadata: vi.fn(),
    mockWorkerOn,
    MockWorker,
  };
});

vi.mock('bullmq', () => ({
  Worker: Object.assign(MockWorker, {
    RateLimitError: () => new Error('rate limited'),
  }),
}));

vi.mock('@pop-choice/shared', () => ({
  catalogRepairCompletionStatusForResolution: (resolved: boolean) =>
    resolved ? 'completed_resolved' : 'completed_unresolved',
  createEmbeddings: mockCreateEmbeddings,
  ensureCatalogMetadataSchema: mockEnsureCatalogMetadataSchema,
  ensureCatalogRepairActionSchema: mockEnsureCatalogRepairActionSchema,
  getPool: mockGetPool,
  initDatabase: mockInitDatabase,
  insertMovies: vi.fn(),
  isCatalogHealthIssueResolvedForMovie: vi.fn().mockResolvedValue(true),
  refreshCatalogRepairBatchCounts: vi.fn(),
  updateCatalogRepairBatchItemStatus: vi.fn(),
  upsertMovieCatalogMetadata: mockUpsertMovieCatalogMetadata,
}));

vi.mock('@/features/catalogMaintenance/tmdb', () => ({
  TMDBRateLimitError: class TMDBRateLimitError extends Error {
    retryAfterMs = 1000;
  },
  extractCatalogMetadata: mockExtractCatalogMetadata,
  extractUSCertification: mockExtractUSCertification,
  fetchMovieDetails: mockFetchMovieDetails,
  fetchTMDBSourcePage: vi.fn(),
  getPosterUrl: (path: string | null | undefined) =>
    path ? `https://image.tmdb.org/t/p/w500${path}` : null,
  movieToEmbeddingText: vi.fn().mockReturnValue('embedding text'),
  parseTMDBYear: vi.fn().mockReturnValue(2024),
  searchMovieMatch: vi.fn(),
}));

vi.mock('@/lib/jobQueue', () => ({
  CATALOG_MAINTENANCE_JOB_NAMES: {
    backfillMovie: 'backfill-movie',
    discoverTMDBSourcePage: 'discover-tmdb-source-page',
    seedTMDBMovie: 'seed-tmdb-movie',
  },
  CATALOG_MAINTENANCE_JOB_OPTIONS: {
    attempts: 4,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 200,
  },
  CATALOG_MAINTENANCE_QUEUE_NAME: 'catalog-maintenance',
  createBullMQConnection: mockCreateBullMQConnection,
}));

vi.mock('@/lib/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/metrics', () => ({
  recordQueueJobEvent: mockRecordQueueJobEvent,
  recordTMDBProviderError: vi.fn(),
}));
vi.mock('@/lib/tracing', () => ({
  withTraceSpan: (_name: string, _options: unknown, callback: () => Promise<void>) => callback(),
}));

import { createCatalogMaintenanceWorker } from './catalogMaintenanceWorker';

function backfillJob(reason: 'missing_metadata' | 'missing_tmdb_id' = 'missing_metadata') {
  return {
    attemptsMade: 0,
    data: {
      language: 'en-US',
      movieId: '334',
      reason,
      version: 1,
    },
    id: 'backfill-334',
    name: 'backfill-movie',
  };
}

describe('createCatalogMaintenanceWorker', () => {
  const query = vi.fn();

  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    vi.stubEnv('TMDB_API_KEY', 'tmdb-test-key');
    vi.stubEnv('OPENAI_API_KEY', '');
    mockCreateBullMQConnection.mockReturnValue({ host: 'localhost' });
    mockEnsureCatalogMetadataSchema.mockResolvedValue(undefined);
    mockEnsureCatalogRepairActionSchema.mockResolvedValue(undefined);
    mockGetPool.mockReturnValue({ query });
    query.mockReset();
    query
      .mockResolvedValueOnce({
        rows: [
          {
            description: 'A puzzle thriller.',
            duration: 113,
            id: '334',
            name: 'Memento',
            score_rating: 8.4,
            tmdb_id: 77,
            year: 2000,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    mockFetchMovieDetails.mockResolvedValue({
      id: 77,
      original_language: 'en',
      original_title: 'Memento',
      overview: 'A puzzle thriller.',
      popularity: 20,
      poster_path: '/poster.jpg',
      release_date: '2000-10-11',
      runtime: 113,
      title: 'Memento',
      vote_average: 8.4,
      vote_count: 1000,
    });
    mockExtractUSCertification.mockReturnValue('R');
    mockExtractCatalogMetadata.mockReturnValue({
      genres: [],
      keywords: [],
      people: [],
      providers: [],
      qualityFlags: [],
      qualityScore: 100,
      snapshot: { id: 77, title: 'Memento' },
    });
    mockUpsertMovieCatalogMetadata.mockResolvedValue(undefined);
    mockCreateEmbeddings.mockResolvedValue([[0.1, 0.2]]);
    mockWorkerOn.mockReset();
    capturedProcessor.current = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('does not require OpenAI embeddings for metadata-only backfill jobs', async () => {
    createCatalogMaintenanceWorker();

    expect(capturedProcessor.current).not.toBeNull();
    await capturedProcessor.current!(backfillJob('missing_metadata'));

    expect(mockCreateEmbeddings).not.toHaveBeenCalled();
    expect(query.mock.calls[1][0]).toContain('embedding = COALESCE($7::vector, embedding)');
    expect(query.mock.calls[1][1][6]).toBeNull();
    expect(mockUpsertMovieCatalogMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ movieId: '334' }),
    );
  });

  it('still requires OpenAI embeddings for missing TMDB identity backfills', async () => {
    createCatalogMaintenanceWorker();

    await expect(capturedProcessor.current!(backfillJob('missing_tmdb_id'))).rejects.toThrow(
      'OPENAI_API_KEY is required for catalog backfill jobs',
    );
  });
});
