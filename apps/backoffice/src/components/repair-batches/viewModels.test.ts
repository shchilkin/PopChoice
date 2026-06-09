import { describe, expect, it } from 'vitest';

import { catalogRepairBatchItem } from '../../test/backofficeFixtures';
import { canRetryRepairBatchItem, getRepairBatchItemRowView } from './viewModels';

describe('repair batch view models', () => {
  it('marks only retryable item statuses as retry actions', () => {
    expect(canRetryRepairBatchItem(catalogRepairBatchItem({ status: 'failed' }))).toBe(true);
    expect(canRetryRepairBatchItem(catalogRepairBatchItem({ status: 'enqueue_failed' }))).toBe(
      true,
    );
    expect(canRetryRepairBatchItem(catalogRepairBatchItem({ status: 'unavailable' }))).toBe(true);
    expect(
      canRetryRepairBatchItem(catalogRepairBatchItem({ status: 'completed_unresolved' })),
    ).toBe(false);
  });

  it('builds stable display labels for a repair batch item row', () => {
    const view = getRepairBatchItemRowView(
      catalogRepairBatchItem({
        batchId: 'batch:7',
        id: 'item-7',
        movieId: '99',
        movieSnapshot: { name: 'Primer', year: 2004 },
        result: { attemptsMade: 3 },
        status: 'failed',
      }),
    );

    expect(view).toMatchObject({
      action: {
        batchId: 'batch:7',
        itemId: 'item-7',
        returnTo: '/repair-batches/batch%3A7?status=needs_review',
        type: 'retry',
      },
      attemptsLabel: '3 attempts',
      issueHref: '/catalog-health#issue-missing_poster_url',
      movieHref: '/movies/99',
      movieLabel: 'Primer',
      movieMeta: '#99 · 2004',
      pressureLabel: 'Retry pressure: high',
    });
  });
});
