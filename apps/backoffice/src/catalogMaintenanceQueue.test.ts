import { describe, expect, it } from 'vitest';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  getCatalogBackfillMovieJobId,
  getCatalogMaintenanceQueueSnapshot,
  listCatalogMaintenanceQueueJobs,
  summarizeCatalogMaintenanceJobPayload,
} from './catalogMaintenanceQueue';

describe('catalog maintenance queue helpers', () => {
  it('sanitizes BullMQ job ids so operator-supplied ids cannot contain colons', () => {
    expect(getCatalogBackfillMovieJobId('tmdb:331')).toBe('backfill-tmdb-331');
  });

  it('does not pretend to queue work when Redis is unavailable', async () => {
    await expect(
      enqueueCatalogBackfillMovieFromBackoffice(
        { movieId: 331, reason: 'missing_metadata', language: 'en-US' },
        undefined,
      ),
    ).resolves.toBeNull();
  });

  it('reports an unavailable queue snapshot when Redis is unavailable', async () => {
    await expect(getCatalogMaintenanceQueueSnapshot(undefined)).resolves.toMatchObject({
      available: false,
      counts: {
        active: 0,
        completed: 0,
        delayed: 0,
        failed: 0,
        prioritized: 0,
        waiting: 0,
        waitingChildren: 0,
      },
      openJobs: 0,
      queueName: 'catalog-maintenance',
    });
  });

  it('reports an unavailable queue job page when Redis is unavailable', async () => {
    await expect(
      listCatalogMaintenanceQueueJobs({
        limit: 25,
        offset: 0,
        redisUrl: undefined,
        state: 'waiting',
      }),
    ).resolves.toMatchObject({
      available: false,
      jobs: [],
      limit: 25,
      offset: 0,
      state: 'waiting',
      totalCount: 0,
    });
  });

  it('summarizes backfill payloads without exposing raw job internals', () => {
    expect(
      summarizeCatalogMaintenanceJobPayload('backfill-movie', {
        movieId: 331,
        reason: 'missing_metadata',
        language: 'en-US',
        repairBatchId: 12,
        repairBatchItemId: 44,
        ignored: { large: true },
      }),
    ).toEqual([
      { label: 'Movie', value: '331' },
      { label: 'Reason', value: 'missing_metadata' },
      { label: 'Language', value: 'en-US' },
      { label: 'Batch', value: '12' },
      { label: 'Item', value: '44' },
    ]);
  });
});
