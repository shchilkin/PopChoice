import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  logger: { info: mocks.loggerInfo },
}));

import { readBackofficeCounterSnapshot, resetBackofficeMetricsForTest } from './backofficeMetrics';
import { logCatalogRepairActionResult } from './catalogRepairActionLog';

describe('catalog repair action logging', () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetBackofficeMetricsForTest();
  });

  it('records bulk repair enqueue counters from item outcome counts', () => {
    logCatalogRepairActionResult({
      action: 'bulk_enqueue_backfill',
      actor: 'operator@example.test',
      durationMs: 25,
      result: {
        issueKey: 'missing_poster_url',
        mode: 'bulk',
        status: 'partial',
        summary: {
          attempted: 6,
          batchId: 'batch-1',
          deduped: 1,
          failed: 2,
          issueKey: 'missing_poster_url',
          jobs: [],
          limit: 6,
          movieIds: [],
          queued: 3,
          totalCandidates: 6,
          unavailable: 1,
        },
      },
    });

    expect(readBackofficeCounterSnapshot()).toEqual(
      expect.arrayContaining([
        {
          labels: { mode: 'bulk', status: 'queued' },
          name: 'backoffice_repair_enqueue_total',
          value: 4,
        },
        {
          labels: { mode: 'bulk', status: 'failed' },
          name: 'backoffice_repair_enqueue_total',
          value: 2,
        },
        {
          labels: { mode: 'bulk', status: 'unavailable' },
          name: 'backoffice_repair_enqueue_total',
          value: 1,
        },
      ]),
    );
    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      'Backoffice operator action',
      expect.objectContaining({
        action: 'bulk_enqueue_backfill',
        mode: 'bulk',
        repairBatchId: 'batch-1',
        resultStatus: 'partial',
      }),
    );
  });
});
