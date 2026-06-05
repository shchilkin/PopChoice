import { formatLiveSyncTime } from './liveRefreshTime';

import type { CatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';

type CatalogStatState = 'healthy' | 'warning';
type QueueState = 'healthy' | 'neutral' | 'warning';

export interface CatalogMetricPill {
  className: string;
  label: string;
}

export interface CatalogStatusStripViewModel {
  className: string;
  copy: string;
  heading: string;
  metrics: CatalogMetricPill[];
}

export interface CatalogQueueStatusViewModel {
  bullBoardAction: 'link' | 'disabled';
  counts: Array<{ label: string; value: number }>;
  dotClassName: string;
  statusCopy: string;
}

export interface CatalogSummaryStatViewModel {
  label: string;
  meta: string;
  state?: CatalogStatState;
  value: number | string;
}

export interface CatalogHealthOverviewViewModel {
  activeIssues: number;
  duplicateGroups: number;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
  status: CatalogStatusStripViewModel;
  queue: CatalogQueueStatusViewModel;
  summary: CatalogSummaryStatViewModel[];
}

export function buildCatalogHealthOverviewViewModel(
  data: CatalogHealthLiveData,
  bullBoardUrl?: string,
): CatalogHealthOverviewViewModel {
  const { activeIssues, duplicateGroups } = data.report;

  return {
    activeIssues,
    duplicateGroups,
    queueSnapshot: data.queueSnapshot,
    queue: buildCatalogQueueStatusViewModel(data.queueSnapshot, bullBoardUrl),
    status: buildCatalogStatusStripViewModel(activeIssues, duplicateGroups, data.queueSnapshot),
    summary: buildCatalogSummaryStats(data),
  };
}

function buildCatalogStatusStripViewModel(
  activeIssues: number,
  duplicateGroups: number,
  queueSnapshot: CatalogMaintenanceQueueSnapshot,
): CatalogStatusStripViewModel {
  const isHealthy = activeIssues === 0 && duplicateGroups === 0;

  return {
    className: `catalog-status ${isHealthy ? 'healthy' : 'needs-work'}`,
    copy: isHealthy
      ? 'No active issue categories or duplicate groups are currently reported.'
      : 'Work the highest-count repairable panels first, then review duplicates before manual merges.',
    heading: isHealthy ? 'Catalog is clear' : 'Catalog needs operator attention',
    metrics: [
      buildMetricPill(activeIssues, 'active issue categories'),
      buildMetricPill(duplicateGroups, 'duplicate groups'),
      buildQueueMetricPill(queueSnapshot),
    ],
  };
}

function buildCatalogQueueStatusViewModel(
  snapshot: CatalogMaintenanceQueueSnapshot,
  bullBoardUrl?: string,
): CatalogQueueStatusViewModel {
  return {
    bullBoardAction: bullBoardUrl ? 'link' : 'disabled',
    counts: [
      { label: 'waiting', value: snapshot.counts.waiting },
      { label: 'active', value: snapshot.counts.active },
      { label: 'scheduled', value: snapshot.counts.delayed + snapshot.counts.prioritized },
      { label: 'failed', value: snapshot.counts.failed },
      { label: 'completed', value: snapshot.counts.completed },
    ],
    dotClassName: `queue-dot ${queueState(snapshot)}`,
    statusCopy: snapshot.available
      ? `Queue updated ${formatLiveSyncTime(snapshot.updatedAt)}.`
      : 'Queue data is unavailable, so backoffice cannot read repair job state.',
  };
}

function buildCatalogSummaryStats(data: CatalogHealthLiveData): CatalogSummaryStatViewModel[] {
  return [
    { label: 'Movies', value: data.report.totalMovies, meta: 'Catalog rows tracked' },
    {
      label: 'Issue categories',
      value: data.report.activeIssues,
      meta:
        data.report.activeIssues === 0 ? 'No active categories' : 'Categories with affected rows',
      state: statState(data.report.activeIssues),
    },
    {
      label: 'Duplicate groups',
      value: data.report.duplicateGroups,
      meta: data.report.duplicateGroups === 0 ? 'No duplicate groups' : 'Groups awaiting review',
      state: statState(data.report.duplicateGroups),
    },
    {
      label: 'Stale threshold',
      value: `${data.report.staleAfterDays}d`,
      meta: 'TMDB metadata refresh window',
    },
  ];
}

function buildMetricPill(count: number, label: string): CatalogMetricPill {
  return {
    className: `pill ${count > 0 ? 'warning' : 'good'}`,
    label: `${count} ${label}`,
  };
}

function buildQueueMetricPill(queueSnapshot: CatalogMaintenanceQueueSnapshot): CatalogMetricPill {
  return {
    className: `pill ${queueSnapshot.available ? 'good' : 'warning'}`,
    label: queueSnapshot.available
      ? `${queueSnapshot.openJobs} catalog queue open`
      : 'Catalog queue unavailable',
  };
}

function queueState(snapshot: CatalogMaintenanceQueueSnapshot): QueueState {
  if (!snapshot.available) return 'warning';
  return snapshot.openJobs > 0 ? 'neutral' : 'healthy';
}

function statState(count: number): CatalogStatState {
  return count === 0 ? 'healthy' : 'warning';
}
