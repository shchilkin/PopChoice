import { formatLiveSyncTime } from './liveRefreshTime';

import type { CatalogMaintenanceQueueSnapshot } from '../catalogMaintenanceQueue';
import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';

type CatalogStatState = 'healthy' | 'warning';
type QueueState = 'healthy' | 'neutral' | 'warning';

export interface CatalogQueueStatusViewModel {
  bullBoardAction: 'link' | 'disabled';
  counts: Array<{ label: string; value: number }>;
  diagnosticCopy: string | null;
  dotClassName: string;
  statusCopy: string;
}

export interface CatalogNextActionViewModel {
  className: string;
  copy: string;
  href: string;
  label: string;
  title: string;
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
  nextAction: CatalogNextActionViewModel;
  queueSnapshot: CatalogMaintenanceQueueSnapshot;
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
    nextAction: buildCatalogNextActionViewModel(data),
    queueSnapshot: data.queueSnapshot,
    queue: buildCatalogQueueStatusViewModel(data.queueSnapshot, bullBoardUrl),
    summary: buildCatalogSummaryStats(data),
  };
}

function buildCatalogNextActionViewModel(data: CatalogHealthLiveData): CatalogNextActionViewModel {
  const missingTMDBCount = data.report.issueCounts.missing_tmdb_id ?? 0;
  if (missingTMDBCount > 0) {
    return {
      className: 'next-action warning',
      copy: `${missingTMDBCount} movies still need identity before poster, runtime, localized name, or metadata repairs can finish.`,
      href: '/catalog-health?issue=missing_tmdb_id#issue-missing_tmdb_id',
      label: 'Open identity queue',
      title: 'Resolve TMDB identity first',
    };
  }

  if (data.queueSnapshot.available && data.queueSnapshot.openJobs > 0) {
    return {
      className: 'next-action neutral',
      copy: `${data.queueSnapshot.openJobs} catalog maintenance jobs are still open. Review failed or unresolved items before starting more bulk work.`,
      href: '/repair-batches?sort=needs_review',
      label: 'Review batches',
      title: 'Monitor open repair work',
    };
  }

  if (data.report.activeIssues > 0) {
    const topIssue = getTopIssue(data.report.issueCounts);
    return {
      className: 'next-action warning',
      copy: `Next highest-count panel is ${humanizeIssueKey(topIssue.key)} with ${topIssue.count} affected movies. Use movie detail manual fields for rows that need operator-confirmed metadata.`,
      href: `/catalog-health#issue-${encodeURIComponent(topIssue.key)}`,
      label: 'Go to repair panels',
      title: 'Continue catalog repair',
    };
  }

  if (data.report.duplicateGroups > 0) {
    return {
      className: 'next-action warning',
      copy: 'No repair panels are active. Review duplicate groups before manual merges.',
      href: '/catalog-health#duplicate-tmdb-ids',
      label: 'Review duplicates',
      title: 'Review duplicate identities',
    };
  }

  return {
    className: 'next-action healthy',
    copy: 'No active catalog issue categories, duplicate groups, or open catalog queue work are currently reported.',
    href: '/repair-batches',
    label: 'Repair history',
    title: 'Catalog is clear',
  };
}

function getTopIssue(issueCounts: Record<string, number>): { count: number; key: string } {
  return (
    Object.entries(issueCounts)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
      .map(([key, count]) => ({ count, key }))[0] ?? { count: 0, key: 'missing_poster_url' }
  );
}

function humanizeIssueKey(issueKey: string): string {
  return issueKey.replace(/_/g, ' ');
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
    diagnosticCopy: bullBoardUrl ? null : 'Bull Board URL is not configured.',
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

function queueState(snapshot: CatalogMaintenanceQueueSnapshot): QueueState {
  if (!snapshot.available) return 'warning';
  return snapshot.openJobs > 0 ? 'neutral' : 'healthy';
}

function statState(count: number): CatalogStatState {
  return count === 0 ? 'healthy' : 'warning';
}
