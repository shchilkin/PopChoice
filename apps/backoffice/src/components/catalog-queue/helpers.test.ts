import { describe, expect, it } from 'vitest';
import type { CatalogMaintenanceQueueJobPage } from '../../catalogMaintenanceQueue';

import {
  buildQueueHref,
  getLastQueueEvent,
  getQueueHealth,
  getQueueJobLinks,
  getQueueStateClass,
  getQueueStateCount,
  queueRealtimeCopy,
} from './helpers';

const page: CatalogMaintenanceQueueJobPage = {
  available: true,
  counts: {
    active: 0,
    completed: 10,
    delayed: 0,
    failed: 0,
    prioritized: 0,
    waiting: 0,
    waitingChildren: 0,
  },
  jobs: [],
  limit: 25,
  offset: 0,
  openJobs: 0,
  queueName: 'catalog-maintenance',
  state: 'waiting',
  totalCount: 0,
  updatedAt: '2026-06-02T12:00:00Z',
};

describe('catalog queue helpers', () => {
  it('builds queue state links and state labels', () => {
    expect(buildQueueHref({ page: 2, pageSize: 50, state: 'failed' })).toBe(
      '/queue?state=failed&page=2&pageSize=50',
    );
    expect(getQueueStateClass('failed')).toBe('failed');
    expect(getQueueStateClass('completed')).toBe('completed');
    expect(getQueueStateClass('active')).toBe('active');
    expect(getQueueStateClass('waiting')).toBe('queued');
  });

  it('reads queue counts by active state', () => {
    expect(getQueueStateCount({ ...page, counts: { ...page.counts, waiting: 7 } }, 'waiting')).toBe(
      7,
    );
    expect(getQueueStateCount({ ...page, counts: { ...page.counts, failed: 2 } }, 'failed')).toBe(
      2,
    );
  });

  it('classifies queue health from availability, failures, and open work', () => {
    expect(getQueueHealth({ ...page, available: false }).state).toBe('unavailable');
    expect(getQueueHealth({ ...page, counts: { ...page.counts, failed: 1 } }).state).toBe(
      'warning',
    );
    expect(getQueueHealth({ ...page, openJobs: 1 }).state).toBe('active');
    expect(getQueueHealth(page).state).toBe('healthy');
  });

  it('builds operator links for movie and repair batch context', () => {
    expect(getQueueJobLinks({ movieId: '101', repairBatchId: 'batch:7' })).toEqual([
      { href: '/movies/101', label: 'Movie 101' },
      { href: '/repair-batches/batch%3A7', label: 'Batch batch:7' },
    ]);
    expect(getQueueJobLinks({ movieId: null, repairBatchId: null })).toEqual([]);
  });

  it('describes the last known job event and realtime status copy', () => {
    expect(
      getLastQueueEvent({
        createdAt: '2026-06-02T10:00:00Z',
        finishedAt: '2026-06-02T10:05:00Z',
        processedAt: '2026-06-02T10:01:00Z',
      }),
    ).toContain('Finished');
    expect(getLastQueueEvent({ createdAt: null, finishedAt: null, processedAt: null })).toBe(
      'Created unknown',
    );
    expect(queueRealtimeCopy('connected')).toBe('Queue updates are live');
    expect(queueRealtimeCopy('connecting')).toBe('Connecting to live updates');
    expect(queueRealtimeCopy('error')).toBe('Live updates are reconnecting');
  });
});
