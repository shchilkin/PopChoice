import type { CatalogMovieSample } from '@pop-choice/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCatalogRepairBatchItem: vi.fn(),
  enqueueCatalogBackfillMovieFromBackoffice: vi.fn(),
  ensureBackofficeReady: vi.fn(),
  getCatalogRepairBatchItem: vi.fn(),
  loggerError: vi.fn(),
  parseOperatorActor: vi.fn(),
  recordCatalogRepairAction: vi.fn(),
  refreshCatalogRepairBatchCounts: vi.fn(),
  updateCatalogRepairBatchItemEnqueueResult: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  createCatalogRepairBatchItem: mocks.createCatalogRepairBatchItem,
  getCatalogRepairBatchItem: mocks.getCatalogRepairBatchItem,
  logger: { error: mocks.loggerError },
  recordCatalogRepairAction: mocks.recordCatalogRepairAction,
  refreshCatalogRepairBatchCounts: mocks.refreshCatalogRepairBatchCounts,
  updateCatalogRepairBatchItemEnqueueResult: mocks.updateCatalogRepairBatchItemEnqueueResult,
}));

vi.mock('../catalogMaintenanceQueue', () => ({
  enqueueCatalogBackfillMovieFromBackoffice: mocks.enqueueCatalogBackfillMovieFromBackoffice,
}));

vi.mock('./backofficeRuntime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./backofficeRuntime')>();
  return {
    ...actual,
    ensureBackofficeReady: mocks.ensureBackofficeReady,
    parseOperatorActor: mocks.parseOperatorActor,
  };
});

import {
  createCatalogBulkRepairSummary,
  enqueueCatalogRepairBatchItems,
  retryCatalogRepairBatchItem,
} from './catalogRepairBatchActions';

function sampleMovie(id: string): CatalogMovieSample {
  return {
    age_rating: 'PG',
    duration: 100,
    id,
    localized_name: null,
    name: `Movie ${id}`,
    poster_url: null,
    tmdb_id: null,
    tmdb_matched_at: null,
    year: 2026,
  };
}

describe('catalog repair batch actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureBackofficeReady.mockResolvedValue({
      redisUrl: 'redis://queue.test',
      tmdbLanguage: 'en-US',
    });
    mocks.parseOperatorActor.mockReturnValue('operator@example.test');
    mocks.createCatalogRepairBatchItem.mockImplementation(({ movieId }: { movieId: string }) =>
      Promise.resolve({ id: `item-${movieId}` }),
    );
  });

  it('continues processing when failure-status persistence fails', async () => {
    const movies = [sampleMovie('1'), sampleMovie('2')];
    const summary = createCatalogBulkRepairSummary({
      issueKey: 'missing_poster_url',
      limit: 2,
      movies,
      totalCandidates: 2,
    });

    mocks.enqueueCatalogBackfillMovieFromBackoffice
      .mockRejectedValueOnce(new Error('queue failed'))
      .mockResolvedValueOnce({
        jobId: 'job-2',
        jobName: 'backfill-movie',
        language: 'en',
        queueName: 'catalog-maintenance',
        status: 'queued',
      });
    mocks.updateCatalogRepairBatchItemEnqueueResult
      .mockRejectedValueOnce(new Error('persist failed'))
      .mockResolvedValueOnce(undefined);

    await enqueueCatalogRepairBatchItems({
      batchId: 'batch-1',
      issueKey: 'missing_poster_url',
      language: 'en',
      movies,
      summary,
    });

    expect(summary.failed).toBe(1);
    expect(summary.queued).toBe(1);
    expect(summary.jobs).toEqual([
      { movieId: '1', itemId: 'item-1', status: 'failed' },
      { movieId: '2', itemId: 'item-2', jobId: 'job-2', status: 'queued' },
    ]);
    expect(mocks.updateCatalogRepairBatchItemEnqueueResult).toHaveBeenCalledTimes(2);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Failed to persist catalog repair batch enqueue failure',
      expect.objectContaining({
        itemId: 'item-1',
        issueKey: 'missing_poster_url',
        movieId: '1',
        originalError: 'queue failed',
      }),
    );
  });

  it('retries a failed repair batch item with the original batch item context', async () => {
    const item = {
      batchId: 'batch-1',
      completedAt: '2026-06-02T12:05:00.000Z',
      createdAt: '2026-06-02T12:00:00.000Z',
      errorMessage: 'worker failed',
      id: 'item-1',
      issueKey: 'missing_poster_url',
      jobId: 'old-job',
      jobName: 'backfill-movie',
      language: 'en',
      movieId: '42',
      movieSnapshot: { id: '42', name: 'Heat' },
      queueName: 'catalog-maintenance',
      reason: 'missing_metadata',
      result: { status: 'failed' },
      status: 'failed',
      updatedAt: '2026-06-02T12:05:00.000Z',
    };
    const job = {
      jobId: 'job-42',
      jobName: 'backfill-movie',
      language: 'en-US',
      queueName: 'catalog-maintenance',
      status: 'queued',
    };
    const updatedItem = { ...item, completedAt: null, jobId: 'job-42', status: 'queued' };
    mocks.getCatalogRepairBatchItem.mockResolvedValue(item);
    mocks.enqueueCatalogBackfillMovieFromBackoffice.mockResolvedValue(job);
    mocks.updateCatalogRepairBatchItemEnqueueResult.mockResolvedValue(updatedItem);

    const formData = new FormData();
    formData.set('action', 'retry_item');
    formData.set('batch_id', 'batch-1');
    formData.set('item_id', 'item-1');

    const result = await retryCatalogRepairBatchItem(formData, new Headers());

    expect(result).toMatchObject({
      batchId: 'batch-1',
      item: updatedItem,
      job,
      status: 'queued',
    });
    expect(mocks.enqueueCatalogBackfillMovieFromBackoffice).toHaveBeenCalledWith(
      {
        language: 'en',
        movieId: '42',
        reason: 'missing_metadata',
        repairBatchId: 'batch-1',
        repairBatchItemId: 'item-1',
      },
      'redis://queue.test',
    );
    expect(mocks.updateCatalogRepairBatchItemEnqueueResult).toHaveBeenCalledWith({
      itemId: 'item-1',
      status: 'queued',
      queueName: 'catalog-maintenance',
      jobName: 'backfill-movie',
      jobId: 'job-42',
      language: 'en-US',
      result: { ...job, retry: true },
    });
    expect(mocks.refreshCatalogRepairBatchCounts).toHaveBeenCalledWith('batch-1');
    expect(mocks.recordCatalogRepairAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'enqueue_backfill',
        actor: 'operator@example.test',
        issueKey: 'missing_poster_url',
        repairBatchId: 'batch-1',
        repairBatchItemId: 'item-1',
        result: { ...job, retry: true },
        targetId: '42',
        targetType: 'movie',
      }),
    );
  });

  it('marks retried items unavailable when the queue is disabled', async () => {
    const item = {
      batchId: 'batch-1',
      completedAt: '2026-06-02T12:05:00.000Z',
      createdAt: '2026-06-02T12:00:00.000Z',
      errorMessage: 'redis missing',
      id: 'item-1',
      issueKey: 'missing_poster_url',
      jobId: null,
      jobName: null,
      language: null,
      movieId: '42',
      movieSnapshot: { id: '42', name: 'Heat' },
      queueName: null,
      reason: null,
      result: { status: 'queue_unavailable' },
      status: 'unavailable',
      updatedAt: '2026-06-02T12:05:00.000Z',
    };
    const updatedItem = { ...item, status: 'unavailable' };
    mocks.getCatalogRepairBatchItem.mockResolvedValue(item);
    mocks.enqueueCatalogBackfillMovieFromBackoffice.mockResolvedValue(null);
    mocks.updateCatalogRepairBatchItemEnqueueResult.mockResolvedValue(updatedItem);

    const formData = new FormData();
    formData.set('action', 'retry_item');
    formData.set('batch_id', 'batch-1');
    formData.set('item_id', 'item-1');

    const result = await retryCatalogRepairBatchItem(formData, new Headers());

    expect(result.status).toBe('unavailable');
    expect(mocks.updateCatalogRepairBatchItemEnqueueResult).toHaveBeenCalledWith({
      itemId: 'item-1',
      status: 'unavailable',
      errorMessage: 'REDIS_URL is unavailable or the catalog-maintenance queue is disabled.',
      result: { status: 'queue_unavailable', queueName: 'catalog-maintenance', retry: true },
    });
  });

  it('rejects retry for completed-unresolved items', async () => {
    mocks.getCatalogRepairBatchItem.mockResolvedValue({
      batchId: 'batch-1',
      id: 'item-1',
      issueKey: 'missing_poster_url',
      movieId: '42',
      status: 'completed_unresolved',
    });

    const formData = new FormData();
    formData.set('action', 'retry_item');
    formData.set('batch_id', 'batch-1');
    formData.set('item_id', 'item-1');

    await expect(retryCatalogRepairBatchItem(formData, new Headers())).rejects.toMatchObject({
      publicMessage: 'Only failed, enqueue-failed, or unavailable items can be retried.',
    });
    expect(mocks.enqueueCatalogBackfillMovieFromBackoffice).not.toHaveBeenCalled();
  });
});
