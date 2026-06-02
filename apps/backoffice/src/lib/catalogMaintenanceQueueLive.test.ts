import { describe, expect, it } from 'vitest';

import type { CatalogMaintenanceQueueJobPage } from '../catalogMaintenanceQueue';
import { parseCatalogMaintenanceQueueSnapshotMessage } from './catalogMaintenanceQueueLive';

const jobPage: CatalogMaintenanceQueueJobPage = {
  available: true,
  counts: {
    active: 1,
    completed: 8,
    delayed: 0,
    failed: 0,
    prioritized: 0,
    waiting: 2,
    waitingChildren: 0,
  },
  jobs: [
    {
      attemptsConfigured: 4,
      attemptsMade: 1,
      createdAt: '2026-06-02T12:00:00.000Z',
      failedReason: null,
      finishedAt: null,
      id: 'backfill-331',
      movieId: '331',
      name: 'backfill-movie',
      payload: [{ label: 'Movie', value: '331' }],
      processedAt: '2026-06-02T12:01:00.000Z',
      repairBatchId: null,
      repairBatchItemId: null,
      state: 'active',
    },
  ],
  limit: 25,
  offset: 0,
  openJobs: 3,
  queueName: 'catalog-maintenance',
  state: 'active',
  totalCount: 1,
  updatedAt: '2026-06-02T12:02:00.000Z',
};

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
