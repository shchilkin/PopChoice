import { describe, expect, it } from 'vitest';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  getCatalogBackfillMovieJobId,
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
});
