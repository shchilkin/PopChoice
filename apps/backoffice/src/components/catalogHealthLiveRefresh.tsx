'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  catalogHealthLiveFingerprint,
  parseCatalogHealthSnapshotMessage,
  type CatalogHealthLiveData,
} from '../lib/catalogHealthLive';
import { CATALOG_HEALTH_REFRESH_EVENT } from './catalogHealthRefreshEvent';
import { formatLiveSyncTime } from './liveRefreshTime';

type LiveConnectionState = 'connecting' | 'connected' | 'fallback';
type StreamConnectionMessage = {
  mode?: unknown;
};

const FALLBACK_REFRESH_SECONDS = 60;

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

function parseStreamConnectionMessage(event: MessageEvent<string>): StreamConnectionMessage {
  try {
    return JSON.parse(event.data) as StreamConnectionMessage;
  } catch {
    return {};
  }
}

export function CatalogHealthLiveRefresh({
  initialData,
  fallbackIntervalSeconds = FALLBACK_REFRESH_SECONDS,
  onSnapshot,
}: {
  initialData: CatalogHealthLiveData;
  fallbackIntervalSeconds?: number;
  onSnapshot?: (data: CatalogHealthLiveData) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('connecting');
  const [data, setData] = useState(initialData);
  const [isFallbackFetching, setIsFallbackFetching] = useState(false);
  const [isStreamError, setIsStreamError] = useState(false);
  const [lastSnapshotAt, setLastSnapshotAt] = useState(initialData.report.generatedAt);
  const [lastSnapshotTrigger, setLastSnapshotTrigger] = useState<
    'connected' | 'queue-event' | 'redis-unavailable'
  >('connected');
  const initialFingerprint = useMemo(
    () => catalogHealthLiveFingerprint(initialData),
    [initialData],
  );
  const lastFingerprint = useRef(initialFingerprint);
  const search = useMemo(() => {
    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : '';
  }, [searchParams]);
  const lastSearch = useRef(search);
  const refreshSeconds = Math.max(fallbackIntervalSeconds, 30);

  useEffect(() => {
    if (lastSearch.current === search) return;

    lastSearch.current = search;
    lastFingerprint.current = initialFingerprint;
    setData(initialData);
    setLastSnapshotAt(initialData.report.generatedAt);
    setLastSnapshotTrigger('connected');
    setConnectionState('connecting');
    setIsFallbackFetching(false);
    setIsStreamError(false);
  }, [initialData, initialFingerprint, search]);

  useEffect(() => {
    const refresh = async () => {
      setIsFallbackFetching(true);
      try {
        const nextData = await fetchCatalogHealthLive(search);
        setData(nextData);
        onSnapshot?.(nextData);
        setLastSnapshotAt(nextData.report.generatedAt);
        setIsStreamError(false);
      } catch {
        setIsStreamError(true);
      } finally {
        setIsFallbackFetching(false);
      }
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
  }, [onSnapshot, search]);

  useEffect(() => {
    const source = new EventSource(`/api/catalog-health/events${search}`);

    const applySnapshot = (event: MessageEvent<string>) => {
      const message = parseCatalogHealthSnapshotMessage(event.data);
      if (!message) {
        setIsStreamError(true);
        return;
      }
      const isDegradedSnapshot = message.trigger === 'redis-unavailable';
      setConnectionState(isDegradedSnapshot ? 'fallback' : 'connected');
      setIsStreamError(isDegradedSnapshot);
      setData(message.data);
      onSnapshot?.(message.data);
      setLastSnapshotAt(message.receivedAt);
      setLastSnapshotTrigger(message.trigger);
    };

    source.addEventListener('connected', (event: MessageEvent<string>) => {
      const { mode } = parseStreamConnectionMessage(event);
      const isSnapshotOnly = mode === 'snapshot-only';
      setConnectionState(isSnapshotOnly ? 'fallback' : 'connected');
      setIsStreamError(isSnapshotOnly);
    });
    source.addEventListener('snapshot', applySnapshot);
    source.addEventListener('heartbeat', () => {
      setConnectionState((current) => (current === 'fallback' ? current : 'connected'));
    });
    source.addEventListener('stream-error', () => {
      setConnectionState('fallback');
      setIsStreamError(true);
    });
    source.onerror = () => {
      setConnectionState('fallback');
      setIsStreamError(true);
    };

    return () => {
      source.close();
    };
  }, [onSnapshot, search]);

  useEffect(() => {
    if (connectionState !== 'fallback') return;

    let cancelled = false;
    const refresh = async () => {
      setIsFallbackFetching(true);
      try {
        const nextData = await fetchCatalogHealthLive(search);
        if (cancelled) return;
        setData(nextData);
        onSnapshot?.(nextData);
        setLastSnapshotAt(nextData.report.generatedAt);
      } catch {
        if (!cancelled) setIsStreamError(true);
      } finally {
        if (!cancelled) setIsFallbackFetching(false);
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, refreshSeconds * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connectionState, onSnapshot, refreshSeconds, search]);

  useEffect(() => {
    if (!data) return;

    const nextFingerprint = catalogHealthLiveFingerprint(data);
    if (nextFingerprint === lastFingerprint.current) return;

    lastFingerprint.current = nextFingerprint;
    startTransition(() => {
      router.refresh();
    });
  }, [data, router]);

  const lastSnapshot = formatLiveSyncTime(lastSnapshotAt);
  const isBusy = isPending || isFallbackFetching;
  const statusCopy = isBusy
    ? 'Updating catalog status'
    : connectionState === 'connected'
      ? 'Catalog and queue updates are live'
      : connectionState === 'connecting'
        ? 'Connecting to live updates'
        : 'Live updates are reconnecting';
  const metaCopy =
    lastSnapshotTrigger === 'queue-event'
      ? `Queue changed ${lastSnapshot}`
      : `Updated ${lastSnapshot}`;

  return (
    <div className={`live-refresh ${connectionState}`} aria-live="polite">
      <span
        className={`live-refresh-dot ${isBusy || connectionState === 'connecting' ? 'pending' : connectionState === 'fallback' ? 'error' : ''}`}
        aria-hidden="true"
      />
      <span>{statusCopy}</span>
      <span className="live-refresh-meta">{metaCopy}</span>
      {isStreamError ? (
        <span className="live-refresh-error">Automatic updates are recovering</span>
      ) : null}
    </div>
  );
}
