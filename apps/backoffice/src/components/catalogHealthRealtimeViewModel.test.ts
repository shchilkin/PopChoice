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
  it('builds queue action, counts, and summary stats', () => {
    const view = buildCatalogHealthOverviewViewModel(liveData, 'https://bull.example.test');

    expect(view.nextAction).toMatchObject({
      href: '/repair-batches?sort=needs_review',
      label: 'Review batches',
      title: 'Monitor open repair work',
    });
    expect(view.queue.bullBoardAction).toBe('link');
    expect(view.queue.diagnosticCopy).toBeNull();
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

    expect(view.queue.bullBoardAction).toBe('disabled');
    expect(view.queue.diagnosticCopy).toBe('Bull Board URL is not configured.');
    expect(view.queue.dotClassName).toBe('queue-dot warning');
  });

  it('prioritizes missing TMDB identity before downstream metadata repairs', () => {
    const view = buildCatalogHealthOverviewViewModel({
      ...liveData,
      report: {
        ...liveData.report,
        issueCounts: {
          missing_poster_url: 12,
          missing_tmdb_id: 3,
        },
      },
    });

    expect(view.nextAction).toMatchObject({
      href: '/catalog-health?issue=missing_tmdb_id#issue-missing_tmdb_id',
      label: 'Open identity queue',
      title: 'Resolve TMDB identity first',
    });
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
