import { describe, expect, it } from 'vitest';

import {
  catalogMaintenanceQueueJobPage,
  catalogMaintenanceQueueJobSummary,
} from '../test/backofficeFixtures';
import {
  parseCatalogMaintenanceQueueConnectedMode,
  parseCatalogMaintenanceQueueSnapshotMessage,
} from './catalogMaintenanceQueueLive';

const jobPage = catalogMaintenanceQueueJobPage({
  counts: {
    active: 1,
    completed: 8,
    delayed: 0,
    failed: 0,
    prioritized: 0,
    waiting: 2,
    waitingChildren: 0,
  },
  jobs: [catalogMaintenanceQueueJobSummary({ id: 'backfill-331', movieId: '331' })],
  openJobs: 3,
  state: 'active',
  totalCount: 1,
  updatedAt: '2026-06-02T12:02:00.000Z',
});

describe('catalog maintenance queue live snapshots', () => {
  it('parses streamed job pages for client-side queue updates', () => {
    const message = parseCatalogMaintenanceQueueSnapshotMessage(
      JSON.stringify({
        jobPage,
        queueEvent: { type: 'active' },
        receivedAt: '2026-06-02T12:03:00.000Z',
        trigger: 'queue-event',
      }),
    );

    expect(message).toEqual({
      jobPage,
      queueEvent: { type: 'active' },
      receivedAt: '2026-06-02T12:03:00.000Z',
      trigger: 'queue-event',
    });
  });

  it('falls back to the job page timestamp when receivedAt is missing', () => {
    const message = parseCatalogMaintenanceQueueSnapshotMessage(JSON.stringify({ jobPage }));

    expect(message?.receivedAt).toBe(jobPage.updatedAt);
    expect(message?.trigger).toBe('queue-event');
  });

  it('preserves Redis-unavailable snapshot triggers', () => {
    const message = parseCatalogMaintenanceQueueSnapshotMessage(
      JSON.stringify({
        jobPage: { ...jobPage, available: false },
        receivedAt: '2026-06-02T12:04:00.000Z',
        trigger: 'redis-unavailable',
      }),
    );

    expect(message?.trigger).toBe('redis-unavailable');
    expect(message?.jobPage.available).toBe(false);
  });

  it('parses connected stream modes for snapshot-only fallbacks', () => {
    expect(
      parseCatalogMaintenanceQueueConnectedMode(JSON.stringify({ mode: 'snapshot-only' })),
    ).toBe('snapshot-only');
    expect(parseCatalogMaintenanceQueueConnectedMode(JSON.stringify({ mode: 'live' }))).toBe(
      'live',
    );
    expect(parseCatalogMaintenanceQueueConnectedMode('not-json')).toBe('live');
  });

  it('rejects malformed queue pages', () => {
    expect(
      parseCatalogMaintenanceQueueSnapshotMessage(
        JSON.stringify({
          jobPage: {
            ...jobPage,
            counts: { active: '1' },
          },
        }),
      ),
    ).toBeNull();
    expect(parseCatalogMaintenanceQueueSnapshotMessage('not-json')).toBeNull();
  });
});
