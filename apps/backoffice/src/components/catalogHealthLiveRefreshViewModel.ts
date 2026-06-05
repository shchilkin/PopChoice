import { formatLiveSyncTime } from './liveRefreshTime';

import type { CatalogHealthLiveData } from '../lib/catalogHealthLive';

export type LiveConnectionState = 'connecting' | 'connected' | 'fallback';
export type LiveSnapshotTrigger = 'connected' | 'queue-event' | 'redis-unavailable';

export interface LiveRefreshStatusViewModel {
  dotClassName: string;
  errorText: string | null;
  metaCopy: string;
  statusCopy: string;
}

export interface RefreshCatalogHealthOptions {
  applyData: (data: CatalogHealthLiveData) => void;
  isCurrent: () => boolean;
  onError: () => void;
  onFetchingChange: (isFetching: boolean) => void;
  search: string;
}

const STATUS_COPY: Record<LiveConnectionState, string> = {
  connected: 'Catalog and queue updates are live',
  connecting: 'Connecting to live updates',
  fallback: 'Live updates are reconnecting',
};

export function buildLiveRefreshStatusViewModel({
  connectionState,
  isBusy,
  isStreamError,
  lastSnapshotAt,
  lastSnapshotTrigger,
}: {
  connectionState: LiveConnectionState;
  isBusy: boolean;
  isStreamError: boolean;
  lastSnapshotAt: string;
  lastSnapshotTrigger: LiveSnapshotTrigger;
}): LiveRefreshStatusViewModel {
  const lastSnapshot = formatLiveSyncTime(lastSnapshotAt);

  return {
    dotClassName: `live-refresh-dot ${liveRefreshDotState(connectionState, isBusy)}`,
    errorText: isStreamError ? 'Live updates are recovering' : null,
    metaCopy:
      lastSnapshotTrigger === 'queue-event'
        ? `Queue changed ${lastSnapshot}`
        : `Updated ${lastSnapshot}`,
    statusCopy: isBusy ? 'Updating catalog status' : STATUS_COPY[connectionState],
  };
}

export async function refreshCatalogHealthSnapshot({
  applyData,
  isCurrent,
  onError,
  onFetchingChange,
  search,
}: RefreshCatalogHealthOptions): Promise<void> {
  onFetchingChange(true);
  try {
    const nextData = await fetchCatalogHealthLive(search);
    if (isCurrent()) applyData(nextData);
  } catch {
    if (isCurrent()) onError();
  } finally {
    if (isCurrent()) onFetchingChange(false);
  }
}

async function fetchCatalogHealthLive(search: string): Promise<CatalogHealthLiveData> {
  const response = await fetch(`/api/catalog-health${search}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch live catalog health state.');
  }

  return (await response.json()) as CatalogHealthLiveData;
}

function liveRefreshDotState(connectionState: LiveConnectionState, isBusy: boolean): string {
  if (isBusy || connectionState === 'connecting') return 'pending';
  return connectionState === 'fallback' ? 'error' : '';
}
