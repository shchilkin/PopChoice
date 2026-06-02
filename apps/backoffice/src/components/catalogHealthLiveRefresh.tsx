'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  CATALOG_HEALTH_LIVE_QUERY_KEY,
  catalogHealthLiveFingerprint,
  type CatalogHealthLiveData,
} from '../lib/catalogHealthLive';
import { CATALOG_HEALTH_REFRESH_EVENT } from './catalogHealthRefreshEvent';
import { formatLiveSyncTime } from './liveRefreshTime';

type LiveConnectionState = 'connecting' | 'connected' | 'fallback';
type QueueEventMessage = {
  receivedAt?: unknown;
  type?: unknown;
};

const FALLBACK_REFRESH_SECONDS = 60;
const QUEUE_EVENT_DEBOUNCE_MS = 350;

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

function parseQueueEventMessage(event: MessageEvent<string>): QueueEventMessage {
  try {
    return JSON.parse(event.data) as QueueEventMessage;
  } catch {
    return {};
  }
}

function getQueueEventReceivedAt(message: QueueEventMessage): string {
  if (typeof message.receivedAt === 'string') {
    const receivedAt = new Date(message.receivedAt);
    if (!Number.isNaN(receivedAt.getTime())) return message.receivedAt;
  }

  return new Date().toISOString();
}

function shouldRefreshFromQueueEvent(message: QueueEventMessage): boolean {
  return message.type !== 'progress';
}

export function CatalogHealthLiveRefresh({
  initialData,
  fallbackIntervalSeconds = FALLBACK_REFRESH_SECONDS,
}: {
  initialData: CatalogHealthLiveData;
  fallbackIntervalSeconds?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('connecting');
  const [lastQueueEventAt, setLastQueueEventAt] = useState<string | null>(null);
  const initialFingerprint = useMemo(
    () => catalogHealthLiveFingerprint(initialData),
    [initialData],
  );
  const lastFingerprint = useRef(initialFingerprint);
  const refreshTimer = useRef<number | null>(null);
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const refreshSeconds = Math.max(fallbackIntervalSeconds, 30);
  const query = useQuery({
    initialData,
    queryFn: () => fetchCatalogHealthLive(search),
    queryKey: [...CATALOG_HEALTH_LIVE_QUERY_KEY, search],
    refetchInterval: connectionState === 'fallback' ? refreshSeconds * 1000 : false,
  });
  const { data, dataUpdatedAt, isError, isFetching, refetch } = query;

  useEffect(() => {
    const refresh = () => {
      void refetch();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener(CATALOG_HEALTH_REFRESH_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener(CATALOG_HEALTH_REFRESH_EVENT, refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refetch]);

  useEffect(() => {
    const source = new EventSource('/api/catalog-maintenance-queue/events');

    const refreshFromQueueEvent = (event: MessageEvent<string>) => {
      const message = parseQueueEventMessage(event);
      if (!shouldRefreshFromQueueEvent(message)) return;

      setConnectionState('connected');
      setLastQueueEventAt(getQueueEventReceivedAt(message));

      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = window.setTimeout(() => {
        void refetch();
      }, QUEUE_EVENT_DEBOUNCE_MS);
    };

    source.addEventListener('connected', () => {
      setConnectionState('connected');
    });
    source.addEventListener('queue-event', refreshFromQueueEvent);
    source.addEventListener('heartbeat', () => {
      setConnectionState('connected');
    });
    source.addEventListener('queue-error', () => {
      setConnectionState('fallback');
    });
    source.onerror = () => {
      setConnectionState('fallback');
    };

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
      source.close();
    };
  }, [refetch]);

  useEffect(() => {
    if (!data) return;

    const nextFingerprint = catalogHealthLiveFingerprint(data);
    if (nextFingerprint === lastFingerprint.current) return;

    lastFingerprint.current = nextFingerprint;
    startTransition(() => {
      router.refresh();
    });
  }, [data, router]);

  const lastChecked = dataUpdatedAt ? formatLiveSyncTime(dataUpdatedAt) : null;
  const lastQueueEvent = lastQueueEventAt ? formatLiveSyncTime(lastQueueEventAt) : null;
  const isBusy = isPending || isFetching;
  const statusCopy = isBusy
    ? 'Refreshing catalog status'
    : connectionState === 'connected'
      ? 'Catalog and queue changes update live'
      : connectionState === 'connecting'
        ? 'Connecting to live catalog updates'
        : 'Live updates are reconnecting; background checks continue';
  const metaCopy = lastQueueEvent
    ? `Last queue change ${lastQueueEvent}`
    : lastChecked
      ? `Last checked ${lastChecked}`
      : 'Waiting for first sync';

  return (
    <div className={`live-refresh ${connectionState}`} aria-live="polite">
      <span
        className={`live-refresh-dot ${isBusy || connectionState === 'connecting' ? 'pending' : connectionState === 'fallback' ? 'error' : ''}`}
        aria-hidden="true"
      />
      <span>{statusCopy}</span>
      <span className="live-refresh-meta">{metaCopy}</span>
      {isError ? <span className="live-refresh-error">Latest check failed</span> : null}
    </div>
  );
}
