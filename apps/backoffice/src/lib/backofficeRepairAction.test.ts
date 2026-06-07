import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateCatalogRepairBatch,
  mockCreateCatalogRepairBatchItem,
  mockEnsureCatalogRepairActionSchema,
  mockEnsureRecommendationEvalRunSchema,
  mockEnsureTMDBMatchReviewActionSchema,
  mockEnqueueCatalogBackfillMovieFromBackoffice,
  mockGetCatalogRepairMovieSnapshot,
  mockInitDatabase,
  mockReadBackofficeRuntimeConfig,
  mockRecordCatalogRepairAction,
  mockRefreshCatalogRepairBatchCounts,
  mockUpdateCatalogRepairBatchItemEnqueueResult,
} = vi.hoisted(() => ({
  mockCreateCatalogRepairBatch: vi.fn(),
  mockCreateCatalogRepairBatchItem: vi.fn(),
  mockEnsureCatalogRepairActionSchema: vi.fn(),
  mockEnsureRecommendationEvalRunSchema: vi.fn(),
  mockEnsureTMDBMatchReviewActionSchema: vi.fn(),
  mockEnqueueCatalogBackfillMovieFromBackoffice: vi.fn(),
  mockGetCatalogRepairMovieSnapshot: vi.fn(),
  mockInitDatabase: vi.fn(),
  mockReadBackofficeRuntimeConfig: vi.fn(),
  mockRecordCatalogRepairAction: vi.fn(),
  mockRefreshCatalogRepairBatchCounts: vi.fn(),
  mockUpdateCatalogRepairBatchItemEnqueueResult: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  applyTMDBMatchReviewAction: vi.fn(),
  createCatalogRepairBatch: mockCreateCatalogRepairBatch,
  createCatalogRepairBatchItem: mockCreateCatalogRepairBatchItem,
  ensureCatalogRepairActionSchema: mockEnsureCatalogRepairActionSchema,
  ensureRecommendationEvalRunSchema: mockEnsureRecommendationEvalRunSchema,
  ensureTMDBMatchReviewActionSchema: mockEnsureTMDBMatchReviewActionSchema,
  getCatalogRepairMovieSnapshot: mockGetCatalogRepairMovieSnapshot,
  initDatabase: mockInitDatabase,
  isTMDBMatchReviewReason: vi.fn(),
  isTMDBMatchReviewSort: vi.fn(),
  isTMDBMatchReviewStatus: vi.fn(),
  listCatalogHealthIssueMoviePage: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn() },
  readBackofficeRuntimeConfig: mockReadBackofficeRuntimeConfig,
  recordCatalogRepairAction: mockRecordCatalogRepairAction,
  refreshCatalogRepairBatchCounts: mockRefreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchItemEnqueueResult: mockUpdateCatalogRepairBatchItemEnqueueResult,
}));

vi.mock('../catalogMaintenanceQueue', () => ({
  enqueueCatalogBackfillMovieFromBackoffice: mockEnqueueCatalogBackfillMovieFromBackoffice,
}));

import { performCatalogRepairAction } from './backoffice';

function operatorHeaders(): Headers {
  return new Headers({
    authorization: `Basic ${Buffer.from('operator:secret').toString('base64')}`,
  });
}

describe('performCatalogRepairAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadBackofficeRuntimeConfig.mockReturnValue({
      catalogHealthSampleLimit: 5,
      catalogHealthStaleDays: 180,
      databaseUrl: 'postgres://localhost/popchoice',
      operatorAuth: null,
      operatorAuthRateLimitMax: 30,
      operatorAuthRateLimitWindowSeconds: 900,
      port: 3004,
      redisUrl: 'redis://localhost:6379',
      tmdbLanguage: 'en-US',
    });
    mockEnsureCatalogRepairActionSchema.mockResolvedValue(undefined);
    mockEnsureRecommendationEvalRunSchema.mockResolvedValue(undefined);
    mockEnsureTMDBMatchReviewActionSchema.mockResolvedValue(undefined);
    mockGetCatalogRepairMovieSnapshot.mockResolvedValue({
      age_rating: 'PG-13',
      duration: 112,
      id: '334',
      localized_name: null,
      name: 'Memento',
      poster_url: null,
      tmdb_id: 77,
      tmdb_match_confidence: 1,
      tmdb_match_source: 'fixture',
      tmdb_matched_at: null,
      tmdb_metadata_refreshed_at: null,
      year: 2000,
    });
    mockCreateCatalogRepairBatch.mockResolvedValue({ id: '7' });
    mockCreateCatalogRepairBatchItem.mockResolvedValue({ id: '11' });
    mockEnqueueCatalogBackfillMovieFromBackoffice.mockResolvedValue({
      jobId: 'backfill-334',
      jobName: 'backfill-movie',
      language: 'en-US',
      queueName: 'catalog-maintenance',
      status: 'queued',
    });
    mockUpdateCatalogRepairBatchItemEnqueueResult.mockResolvedValue({ id: '11' });
    mockRefreshCatalogRepairBatchCounts.mockResolvedValue({ id: '7' });
    mockRecordCatalogRepairAction.mockResolvedValue({ id: '21' });
  });

  it('creates durable batch and item tracking for focused repair jobs', async () => {
    const formData = new FormData();
    formData.set('action', 'enqueue_backfill');
    formData.set('issue_key', 'missing_poster_url');
    formData.set('movie_id', '334');

    const result = await performCatalogRepairAction(formData, operatorHeaders());

    expect(result).toMatchObject({
      issueKey: 'missing_poster_url',
      mode: 'single',
      movieId: '334',
      status: 'queued',
    });
    expect(mockCreateCatalogRepairBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'enqueue_backfill',
        actor: 'operator',
        attemptedCount: 1,
        issueKey: 'missing_poster_url',
        requestedLimit: 1,
        targetId: '334',
        targetType: 'movie',
        totalCandidates: 1,
      }),
    );
    expect(mockCreateCatalogRepairBatchItem).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: '7',
        issueKey: 'missing_poster_url',
        movieId: '334',
        reason: 'missing_metadata',
      }),
    );
    expect(mockEnqueueCatalogBackfillMovieFromBackoffice).toHaveBeenCalledWith(
      expect.objectContaining({
        movieId: '334',
        reason: 'missing_metadata',
        repairBatchId: '7',
        repairBatchItemId: '11',
      }),
      'redis://localhost:6379',
    );
    expect(mockUpdateCatalogRepairBatchItemEnqueueResult).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: '11',
        jobId: 'backfill-334',
        status: 'queued',
      }),
    );
    expect(mockRecordCatalogRepairAction).toHaveBeenCalledWith(
      expect.objectContaining({
        repairBatchId: '7',
        repairBatchItemId: '11',
        targetId: '334',
      }),
    );
  });
});
