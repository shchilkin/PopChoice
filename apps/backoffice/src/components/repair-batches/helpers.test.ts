import { describe, expect, it } from 'vitest';
import type { CatalogRepairBatch } from '@pop-choice/shared';

import {
  buildRepairBatchItemPageHref,
  buildRepairBatchListHref,
  getRepairBatchProgress,
  issueHref,
  movieHref,
  repairBatchRecoveryHint,
  repairItemPressureLabel,
  resultValue,
  snapshotValue,
  truncateText,
} from './helpers';

const baseBatch: CatalogRepairBatch = {
  action: 'bulk_enqueue_backfill',
  actor: 'lexi',
  attemptedCount: 10,
  completedAt: null,
  completedCount: 3,
  createdAt: '2026-06-02T10:00:00Z',
  dedupedCount: 2,
  failedCount: 0,
  id: '42',
  issueKey: 'missing_poster_url',
  note: null,
  previousState: {},
  requestedLimit: 10,
  result: {},
  skippedCount: 1,
  status: 'completed',
  targetId: 'missing_poster_url',
  targetType: 'catalog_issue',
  totalCandidates: 100,
  unavailableCount: 0,
  updatedAt: '2026-06-02T10:10:00Z',
  queuedCount: 4,
};

describe('repair batch helpers', () => {
  it('formats progress from terminal item counts', () => {
    expect(getRepairBatchProgress(baseBatch)).toBe('6/10 finished');
    expect(getRepairBatchProgress({ ...baseBatch, attemptedCount: 0 })).toBe('No items attempted');
  });

  it('builds stable list and item hrefs with non-default filters only', () => {
    expect(
      buildRepairBatchListHref({
        page: 2,
        pageSize: 25,
        sort: 'needs_review',
        status: 'partial',
      }),
    ).toBe('/repair-batches?page=2&pageSize=25&status=partial&sort=needs_review');

    expect(
      buildRepairBatchItemPageHref({
        batchId: 'batch:42',
        page: 3,
        pageSize: 50,
        sort: 'newest',
        status: 'failed',
      }),
    ).toBe(
      '/repair-batches/batch%3A42?itemPage=3&itemPageSize=50&itemStatus=failed&itemSort=newest',
    );
  });

  it('formats backoffice links and compact values', () => {
    expect(issueHref('missing keyword metadata')).toBe('/#issue-missing%20keyword%20metadata');
    expect(movieHref('123')).toBe('/movies/123');
    expect(truncateText('abcdef', 4)).toBe('abc...');
    expect(snapshotValue({ title: 'Memento', nested: {} }, 'title')).toBe('Memento');
    expect(snapshotValue({ nested: {} }, 'nested')).toBeUndefined();
    expect(resultValue({ attempts: 2, nested: {} }, 'attempts')).toBe(2);
    expect(resultValue({ nested: {} }, 'nested')).toBeNull();
  });

  it('labels item pressure by status', () => {
    expect(repairItemPressureLabel({ status: 'failed' })).toContain('high');
    expect(repairItemPressureLabel({ status: 'unavailable' })).toContain('Redis');
    expect(repairItemPressureLabel({ status: 'queued' })).toContain('wait');
    expect(repairItemPressureLabel({ status: 'completed_resolved' })).toContain('low');
  });

  it('prioritizes recovery hints by batch risk', () => {
    expect(repairBatchRecoveryHint({ ...baseBatch, failedCount: 1 })).toContain(
      'Inspect failed/unavailable',
    );
    expect(repairBatchRecoveryHint({ ...baseBatch, status: 'partial' })).toContain('Partial batch');
    expect(repairBatchRecoveryHint({ ...baseBatch, status: 'processing' })).toContain(
      'Workers still have open work',
    );
    expect(
      repairBatchRecoveryHint({ ...baseBatch, attemptedCount: 10, completedCount: 1 }),
    ).toContain('did not reach');
  });
});
