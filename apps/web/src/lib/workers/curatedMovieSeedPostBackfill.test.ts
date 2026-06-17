import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateCatalogRepairBatch,
  mockEnsureCatalogRepairActionSchema,
  mockListCatalogHealthIssueMoviePage,
  mockQueueAdd,
  mockRecordCatalogRepairAction,
  mockUpdateCatalogRepairBatchOrchestrationResult,
} = vi.hoisted(() => ({
  mockCreateCatalogRepairBatch: vi.fn(),
  mockEnsureCatalogRepairActionSchema: vi.fn(),
  mockListCatalogHealthIssueMoviePage: vi.fn(),
  mockQueueAdd: vi.fn(),
  mockRecordCatalogRepairAction: vi.fn(),
  mockUpdateCatalogRepairBatchOrchestrationResult: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  createCatalogRepairBatch: mockCreateCatalogRepairBatch,
  ensureCatalogRepairActionSchema: mockEnsureCatalogRepairActionSchema,
  listCatalogHealthIssueMoviePage: mockListCatalogHealthIssueMoviePage,
  recordCatalogRepairAction: mockRecordCatalogRepairAction,
  updateCatalogRepairBatchOrchestrationResult: mockUpdateCatalogRepairBatchOrchestrationResult,
}));

vi.mock('@/lib/jobQueue', () => ({
  CATALOG_MAINTENANCE_JOB_NAMES: {
    enqueueCatalogRepairBatch: 'enqueue-catalog-repair-batch',
  },
  CATALOG_MAINTENANCE_JOB_OPTIONS: {
    attempts: 4,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 500,
    removeOnFail: 200,
  },
  catalogMaintenanceQueue: {
    add: mockQueueAdd,
  },
}));

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn() },
}));

vi.mock('@/lib/tracing', () => ({
  getTraceCarrier: vi.fn(() => ({ traceparent: 'trace' })),
}));

import { enqueueCuratedMovieSeedCatalogRepair } from './curatedMovieSeedPostBackfill';

describe('enqueueCuratedMovieSeedCatalogRepair', () => {
  beforeEach(() => {
    mockCreateCatalogRepairBatch.mockResolvedValue({ id: '42' });
    mockEnsureCatalogRepairActionSchema.mockResolvedValue(undefined);
    mockListCatalogHealthIssueMoviePage.mockResolvedValue({ totalCount: 12 });
    mockQueueAdd.mockResolvedValue({ id: 'repair-batch-42' });
    mockRecordCatalogRepairAction.mockResolvedValue({});
    mockUpdateCatalogRepairBatchOrchestrationResult.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('can be disabled with a zero catalog repair limit', async () => {
    vi.stubEnv('CATALOG_SEED_REPAIR_LIMIT', '0');

    await expect(
      enqueueCuratedMovieSeedCatalogRepair({
        dryRun: false,
        seedStatus: 'completed',
      }),
    ).resolves.toMatchObject({ status: 'disabled', limit: 0 });
    expect(mockCreateCatalogRepairBatch).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('skips seed states that should not enqueue repair work', async () => {
    await expect(
      enqueueCuratedMovieSeedCatalogRepair({
        dryRun: false,
        seedStatus: 'empty',
      }),
    ).resolves.toMatchObject({ status: 'skipped' });
    expect(mockCreateCatalogRepairBatch).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('creates a durable repair batch and queues catalog maintenance for missing TMDB ids first', async () => {
    vi.stubEnv('CATALOG_SEED_REPAIR_LIMIT', '10');

    const summary = await enqueueCuratedMovieSeedCatalogRepair({
      dryRun: false,
      requestedBy: 'lexi',
      runId: 'run-1',
      seedStatus: 'no_new_movies',
    });

    expect(summary).toMatchObject({
      batchId: '42',
      issueKey: 'missing_tmdb_id',
      jobId: 'repair-batch-42',
      limit: 10,
      status: 'queued',
      totalCandidates: 12,
    });
    expect(mockCreateCatalogRepairBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'movie-seed:lexi',
        issueKey: 'missing_tmdb_id',
        requestedLimit: 10,
        totalCandidates: 12,
      }),
    );
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'enqueue-catalog-repair-batch',
      expect.objectContaining({
        batchId: '42',
        issueKey: 'missing_tmdb_id',
        limit: 10,
        version: 1,
      }),
      expect.objectContaining({ jobId: 'repair-batch-42' }),
    );
    expect(mockRecordCatalogRepairAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'movie-seed:lexi',
        issueKey: 'missing_tmdb_id',
        repairBatchId: '42',
      }),
    );
  });

  it('falls back to poster repair when TMDB identities are already complete', async () => {
    vi.stubEnv('CATALOG_SEED_REPAIR_LIMIT', '10');
    mockListCatalogHealthIssueMoviePage
      .mockResolvedValueOnce({ totalCount: 0 })
      .mockResolvedValueOnce({ totalCount: 7 });

    const summary = await enqueueCuratedMovieSeedCatalogRepair({
      dryRun: false,
      requestedBy: 'lexi',
      runId: 'run-1',
      seedStatus: 'completed',
    });

    expect(summary).toMatchObject({
      issueKey: 'missing_poster_url',
      limit: 7,
      status: 'queued',
      totalCandidates: 7,
    });
    expect(mockListCatalogHealthIssueMoviePage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ issueKey: 'missing_tmdb_id' }),
    );
    expect(mockListCatalogHealthIssueMoviePage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ issueKey: 'missing_poster_url' }),
    );
  });
});
