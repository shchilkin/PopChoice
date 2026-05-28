import { describe, expect, it } from 'vitest';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  getCatalogBackfillMovieJobId,
  getCatalogMaintenanceQueueSnapshot,
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
});
