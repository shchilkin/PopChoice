import { formatLiveSyncTime } from '../liveRefreshTime';

import {
  buildQueueHref,
  getQueueHealth,
  queueRealtimeCopy,
  queueRealtimeDetailCopy,
  type QueueRealtimeConnectionState,
  type QueueRealtimeStatus,
} from './helpers';

import type { CatalogMaintenanceQueueJobPage } from '../../catalogMaintenanceQueue';

export interface QueueCommandMetricViewModel {
  className?: string;
  label: string;
  value: number;
}

export interface QueueCommandActionViewModel {
  className: string;
  href: string;
  label: string;
}

export interface QueueCommandStripViewModel {
  actions: QueueCommandActionViewModel[];
  copy: string;
  dotClassName: string;
  metrics: QueueCommandMetricViewModel[];
  state: ReturnType<typeof getQueueHealth>['state'];
  title: string;
}

export interface QueueRealtimeStatusViewModel {
  copy: string;
  detailCopy: string | null;
  dotState: string;
  lastEventLabel: string;
  refreshButton: { disabled: boolean; label: string } | null;
}

export type QueueSnapshotRefreshResult =
  | { jobPage: CatalogMaintenanceQueueJobPage; kind: 'success'; nowMs: number }
  | { kind: 'error'; nowMs: number };

export function buildQueueCommandStripViewModel({
  bullBoardUrl,
  jobPage,
}: {
  bullBoardUrl?: string;
  jobPage: CatalogMaintenanceQueueJobPage;
}): QueueCommandStripViewModel {
  const health = getQueueHealth(jobPage);

  return {
    actions: buildQueueCommandActions(jobPage, bullBoardUrl),
    copy: health.copy,
    dotClassName: getQueueHealthDotClassName(health.state),
    metrics: [
      { label: 'open', value: jobPage.openJobs },
      {
        className: jobPage.counts.failed > 0 ? 'warn' : undefined,
        label: 'failed',
        value: jobPage.counts.failed,
      },
      { label: 'waiting', value: jobPage.counts.waiting },
      { label: 'scheduled', value: jobPage.counts.delayed },
    ],
    state: health.state,
    title: health.title,
  };
}

export function buildQueueRealtimeStatusViewModel({
  isRefreshing = false,
  lastEventAt,
  onRefreshAvailable,
  status,
}: {
  isRefreshing?: boolean;
  lastEventAt: string | null;
  onRefreshAvailable: boolean;
  status: QueueRealtimeStatus;
}): QueueRealtimeStatusViewModel {
  const showFallbackControls = status !== 'connected' && status !== 'connecting';

  return {
    copy: queueRealtimeCopy(status),
    detailCopy: queueRealtimeDetailCopy(status),
    dotState: getQueueRealtimeDotState(status, isRefreshing),
    lastEventLabel: lastEventAt
      ? `Updated ${formatLiveSyncTime(lastEventAt)}`
      : 'Waiting for the first update',
    refreshButton:
      showFallbackControls && onRefreshAvailable
        ? { disabled: isRefreshing, label: isRefreshing ? 'Refreshing' : 'Refresh' }
        : null,
  };
}

export function buildQueueFingerprint(jobPage: CatalogMaintenanceQueueJobPage): string {
  return `${jobPage.state}:${jobPage.offset}:${jobPage.limit}:${jobPage.updatedAt}`;
}

export function getConnectionStateAfterSnapshotRefresh(
  current: QueueRealtimeConnectionState,
): QueueRealtimeConnectionState {
  return current === 'connected' ? current : 'fallback';
}

export async function loadQueueSnapshotRefresh({
  fetchQueue,
  now = Date.now,
  search,
}: {
  fetchQueue: (search: string) => Promise<CatalogMaintenanceQueueJobPage>;
  now?: () => number;
  search: string;
}): Promise<QueueSnapshotRefreshResult> {
  try {
    const jobPage = await fetchQueue(search);
    return { jobPage, kind: 'success', nowMs: now() };
  } catch {
    return { kind: 'error', nowMs: now() };
  }
}

function buildQueueCommandActions(
  jobPage: CatalogMaintenanceQueueJobPage,
  bullBoardUrl?: string,
): QueueCommandActionViewModel[] {
  const actions: QueueCommandActionViewModel[] = [];

  if (jobPage.counts.failed > 0 && jobPage.state !== 'failed') {
    actions.push({
      className: 'button secondary small',
      href: buildQueueHref({ page: 1, pageSize: jobPage.limit, state: 'failed' }),
      label: 'Review failed',
    });
  }
  if (bullBoardUrl) {
    actions.push({
      className: 'button small',
      href: bullBoardUrl,
      label: 'Open Bull Board',
    });
  }

  return actions;
}

function getQueueHealthDotClassName(state: QueueCommandStripViewModel['state']): string {
  if (state === 'healthy') return 'queue-dot';
  if (state === 'active') return 'queue-dot neutral';
  return 'queue-dot warning';
}

function getQueueRealtimeDotState(status: QueueRealtimeStatus, isRefreshing: boolean): string {
  if (status === 'connecting' || isRefreshing) return 'pending';
  return status === 'connected' ? '' : 'error';
}
