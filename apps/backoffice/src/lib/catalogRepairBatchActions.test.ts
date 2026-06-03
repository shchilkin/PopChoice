import type { CatalogMovieSample } from '@pop-choice/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCatalogRepairBatchItem: vi.fn(),
  enqueueCatalogBackfillMovieFromBackoffice: vi.fn(),
  loggerError: vi.fn(),
  updateCatalogRepairBatchItemEnqueueResult: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  createCatalogRepairBatchItem: mocks.createCatalogRepairBatchItem,
  logger: { error: mocks.loggerError },
  updateCatalogRepairBatchItemEnqueueResult: mocks.updateCatalogRepairBatchItemEnqueueResult,
}));

vi.mock('../catalogMaintenanceQueue', () => ({
  enqueueCatalogBackfillMovieFromBackoffice: mocks.enqueueCatalogBackfillMovieFromBackoffice,
}));

import {
  createCatalogBulkRepairSummary,
  enqueueCatalogRepairBatchItems,
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
});
