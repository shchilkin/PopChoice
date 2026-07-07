import { describe, expect, it } from 'vitest';

import { catalogMaintenanceQueueJobPage } from '../../test/backofficeFixtures';

import {
  buildQueueCommandStripViewModel,
  buildQueueFingerprint,
  buildQueueRealtimeStatusViewModel,
  getConnectionStateAfterSnapshotRefresh,
  loadQueueSnapshotRefresh,
} from './realtimeViewModel';

describe('catalog queue realtime view models', () => {
  it('builds command strip metrics and actions for failed queue work', () => {
    const view = buildQueueCommandStripViewModel({
      bullBoardUrl: 'https://bull.example.test',
      jobPage: catalogMaintenanceQueueJobPage({
        counts: {
          active: 0,
          completed: 10,
          delayed: 2,
          failed: 3,
          prioritized: 0,
          waiting: 4,
          waitingChildren: 0,
        },
        openJobs: 6,
      }),
    });

    expect(view.state).toBe('warning');
    expect(view.dotClassName).toBe('queue-dot warning');
    expect(view.metrics).toEqual([
      { label: 'open', value: 6 },
      { className: 'warn', label: 'failed', value: 3 },
      { label: 'waiting', value: 4 },
      { label: 'scheduled', value: 2 },
    ]);
    expect(view.actions).toEqual([
      {
        className: 'button secondary small',
        href: '/queue?state=failed&page=1&pageSize=25',
        label: 'Review failed',
      },
      { className: 'button small', href: 'https://bull.example.test', label: 'Open Bull Board' },
    ]);
  });

  it('hides failed review action while already filtering failed jobs', () => {
    const view = buildQueueCommandStripViewModel({
      jobPage: catalogMaintenanceQueueJobPage({
        counts: {
          active: 0,
          completed: 0,
          delayed: 0,
          failed: 1,
          prioritized: 0,
          waiting: 0,
          waitingChildren: 0,
        },
        state: 'failed',
      }),
    });

    expect(view.actions).toEqual([]);
  });

  it('builds realtime status copy and fallback refresh controls', () => {
    expect(
      buildQueueRealtimeStatusViewModel({
        lastEventAt: '2026-06-02T12:00:00.000Z',
        onRefreshAvailable: true,
        status: 'connected',
      }),
    ).toMatchObject({
      copy: 'Queue updates are live',
      dotState: '',
      refreshButton: null,
    });

    expect(
      buildQueueRealtimeStatusViewModel({
        isRefreshing: true,
        lastEventAt: null,
        onRefreshAvailable: true,
        status: 'stale',
      }),
    ).toMatchObject({
      dotState: 'pending',
      lastEventLabel: 'Waiting for the first update',
      refreshButton: { disabled: true, label: 'Refreshing' },
    });
  });

  it('keeps stable fingerprints and refresh connection transitions', async () => {
    const page = catalogMaintenanceQueueJobPage();

    expect(buildQueueFingerprint(page)).toBe('waiting:0:25:2026-06-02T12:00:00.000Z');
    expect(getConnectionStateAfterSnapshotRefresh('connected')).toBe('connected');
    expect(getConnectionStateAfterSnapshotRefresh('reconnecting')).toBe('fallback');

    await expect(
      loadQueueSnapshotRefresh({
        fetchQueue: async () => page,
        now: () => 123,
        search: '?state=waiting',
      }),
    ).resolves.toEqual({ jobPage: page, kind: 'success', nowMs: 123 });
    await expect(
      loadQueueSnapshotRefresh({
        fetchQueue: async () => {
          throw new Error('network');
        },
        now: () => 456,
        search: '',
      }),
    ).resolves.toEqual({ kind: 'error', nowMs: 456 });
  });
});
