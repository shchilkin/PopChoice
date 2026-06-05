import { describe, expect, it } from 'vitest';

import { buildLiveRefreshStatusViewModel } from './catalogHealthLiveRefreshViewModel';
import { buildCatalogHealthOverviewViewModel } from './catalogHealthRealtimeViewModel';

import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';

const liveData: CatalogHealthLiveData = {
  auditPage: {
    limit: 25,
    offset: 0,
    totalCount: 3,
  },
  issueMoviePage: {
    issueKey: 'missing_poster_url',
    limit: 25,
    offset: 0,
    totalCount: 12,
  },
  queueSnapshot: {
    available: true,
    counts: {
      active: 1,
      completed: 10,
      delayed: 2,
      failed: 0,
      prioritized: 1,
      waiting: 2,
      waitingChildren: 0,
    },
    openJobs: 6,
    queueName: 'catalog-maintenance',
    updatedAt: '2026-06-02T12:00:00.000Z',
  },
  report: {
    activeIssues: 2,
    duplicateGroups: 1,
    generatedAt: '2026-06-02T12:00:00.000Z',
    issueCounts: {
      missing_poster_url: 12,
      missing_runtime: 4,
    },
    staleAfterDays: 180,
    totalMovies: 351,
  },
};

describe('buildCatalogHealthOverviewViewModel', () => {
  it('builds warning status, queue action, counts, and summary stats', () => {
    const view = buildCatalogHealthOverviewViewModel(liveData, 'https://bull.example.test');

    expect(view.status.className).toBe('catalog-status needs-work');
    expect(view.status.heading).toBe('Catalog needs operator attention');
    expect(view.status.metrics.map((metric) => metric.label)).toEqual([
      '2 active issue categories',
      '1 duplicate groups',
      '6 catalog queue open',
    ]);
    expect(view.queue.bullBoardAction).toBe('link');
    expect(view.queue.dotClassName).toBe('queue-dot neutral');
    expect(view.queue.counts.find((count) => count.label === 'scheduled')?.value).toBe(3);
    expect(view.summary.map((stat) => stat.label)).toEqual([
      'Movies',
      'Issue categories',
      'Duplicate groups',
      'Stale threshold',
    ]);
  });

  it('builds healthy and unavailable queue states', () => {
    const view = buildCatalogHealthOverviewViewModel({
      ...liveData,
      queueSnapshot: {
        ...liveData.queueSnapshot,
        available: false,
        openJobs: 0,
      },
      report: {
        ...liveData.report,
        activeIssues: 0,
        duplicateGroups: 0,
      },
    });

    expect(view.status.className).toBe('catalog-status healthy');
    expect(view.status.heading).toBe('Catalog is clear');
    expect(view.queue.bullBoardAction).toBe('disabled');
    expect(view.queue.dotClassName).toBe('queue-dot warning');
  });
});

describe('buildLiveRefreshStatusViewModel', () => {
  it('formats busy, fallback, and queue-event status copy', () => {
    const status = buildLiveRefreshStatusViewModel({
      connectionState: 'fallback',
      isBusy: true,
      isStreamError: true,
      lastSnapshotAt: '2026-06-02T12:00:00.000Z',
      lastSnapshotTrigger: 'queue-event',
    });

    expect(status.statusCopy).toBe('Updating catalog status');
    expect(status.dotClassName).toContain('pending');
    expect(status.errorText).toBe('Live updates are recovering');
    expect(status.metaCopy).toContain('Queue changed');
  });
});
