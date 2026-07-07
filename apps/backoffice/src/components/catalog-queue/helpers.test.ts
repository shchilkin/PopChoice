import { describe, expect, it } from 'vitest';

import { catalogMaintenanceQueueJobPage } from '../../test/backofficeFixtures';

import {
  buildQueueHref,
  getLastQueueEvent,
  getQueueHealth,
  getQueueJobLinks,
  getQueueRealtimeStatus,
  getQueueStateClass,
  getQueueStateCount,
  isQueueRealtimeFallbackStatus,
  queueRealtimeDetailCopy,
  queueRealtimeCopy,
} from './helpers';

const page = catalogMaintenanceQueueJobPage();

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
    expect(queueRealtimeCopy('reconnecting')).toBe('Live updates are reconnecting');
    expect(queueRealtimeCopy('fallback')).toBe('Queue updates are in polling fallback');
    expect(queueRealtimeCopy('stale')).toBe('Queue snapshot is stale');
    expect(queueRealtimeDetailCopy('unavailable')).toContain('snapshot-only data');
  });

  it('derives realtime fallback, stale, and unavailable statuses', () => {
    expect(
      getQueueRealtimeStatus({
        connectionState: 'connected',
        jobPage: page,
        lastEventAt: '2026-06-02T12:00:00.000Z',
        nowMs: Date.parse('2026-06-02T12:01:00.000Z'),
      }),
    ).toBe('connected');
    expect(
      getQueueRealtimeStatus({
        connectionState: 'connected',
        jobPage: page,
        lastEventAt: '2026-06-02T12:00:00.000Z',
        nowMs: Date.parse('2026-06-02T12:03:00.000Z'),
      }),
    ).toBe('stale');
    expect(
      getQueueRealtimeStatus({
        connectionState: 'fallback',
        jobPage: { ...page, available: false },
        lastEventAt: page.updatedAt,
      }),
    ).toBe('unavailable');
    expect(
      isQueueRealtimeFallbackStatus(
        getQueueRealtimeStatus({
          connectionState: 'reconnecting',
          jobPage: page,
          lastEventAt: page.updatedAt,
        }),
      ),
    ).toBe(true);
    expect(isQueueRealtimeFallbackStatus('connected')).toBe(false);
  });
});
