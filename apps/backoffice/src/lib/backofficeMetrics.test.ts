import { afterEach, describe, expect, it } from 'vitest';

import {
  normalizeBackofficeRepairEnqueueStatus,
  readBackofficeCounterSnapshot,
  recordBackofficeRepairEnqueue,
  recordBackofficeSseLifecycle,
  resetBackofficeMetricsForTest,
} from './backofficeMetrics';

describe('backoffice metrics', () => {
  afterEach(() => {
    resetBackofficeMetricsForTest();
  });

  it('records low-cardinality repair enqueue counters', () => {
    recordBackofficeRepairEnqueue({ mode: 'single', status: 'queued' });
    recordBackofficeRepairEnqueue({ mode: 'single', status: 'queued' });
    recordBackofficeRepairEnqueue({ mode: 'bulk', status: 'queue_unavailable' });
    recordBackofficeRepairEnqueue({ count: 3, mode: 'bulk', status: 'failed' });

    expect(readBackofficeCounterSnapshot()).toEqual(
      expect.arrayContaining([
        {
          labels: { mode: 'single', status: 'queued' },
          name: 'backoffice_repair_enqueue_total',
          value: 2,
        },
        {
          labels: { mode: 'bulk', status: 'unavailable' },
          name: 'backoffice_repair_enqueue_total',
          value: 1,
        },
        {
          labels: { mode: 'bulk', status: 'failed' },
          name: 'backoffice_repair_enqueue_total',
          value: 3,
        },
      ]),
    );
  });

  it('normalizes repair statuses for metrics', () => {
    expect(normalizeBackofficeRepairEnqueueStatus('queued')).toBe('queued');
    expect(normalizeBackofficeRepairEnqueueStatus('orchestration_queued')).toBe('queued');
    expect(normalizeBackofficeRepairEnqueueStatus('unavailable')).toBe('unavailable');
    expect(normalizeBackofficeRepairEnqueueStatus('queue_unavailable')).toBe('unavailable');
    expect(normalizeBackofficeRepairEnqueueStatus('enqueue_failed')).toBe('failed');
  });

  it('records SSE lifecycle counters without payload data', () => {
    recordBackofficeSseLifecycle({
      event: 'connected_snapshot_only',
      queueName: 'catalog-maintenance',
    });
    recordBackofficeSseLifecycle({
      event: 'redis_error',
      queueName: 'catalog-maintenance',
    });

    expect(readBackofficeCounterSnapshot()).toEqual(
      expect.arrayContaining([
        {
          labels: { event: 'connected_snapshot_only', queue: 'catalog-maintenance' },
          name: 'backoffice_sse_lifecycle_total',
          value: 1,
        },
        {
          labels: { event: 'redis_error', queue: 'catalog-maintenance' },
          name: 'backoffice_sse_lifecycle_total',
          value: 1,
        },
      ]),
    );
  });
});
