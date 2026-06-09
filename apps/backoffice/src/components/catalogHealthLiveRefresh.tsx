'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  catalogHealthLiveFingerprint,
  parseCatalogHealthSnapshotMessage,
  type CatalogHealthLiveData,
} from '../lib/catalogHealthLive';
import { CATALOG_HEALTH_REFRESH_EVENT } from './catalogHealthRefreshEvent';
import {
  buildLiveRefreshStatusViewModel,
  refreshCatalogHealthSnapshot,
  type LiveConnectionState,
  type LiveSnapshotTrigger,
} from './catalogHealthLiveRefreshViewModel';

type StreamConnectionMessage = {
  mode?: unknown;
};

const FALLBACK_REFRESH_SECONDS = 60;

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
  const [hasMounted, setHasMounted] = useState(false);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('connecting');
  const [data, setData] = useState(initialData);
  const [isFallbackFetching, setIsFallbackFetching] = useState(false);
  const [isStreamError, setIsStreamError] = useState(false);
  const [lastSnapshotAt, setLastSnapshotAt] = useState(initialData.report.generatedAt);
  const [lastSnapshotTrigger, setLastSnapshotTrigger] = useState<LiveSnapshotTrigger>('connected');
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
  const refreshRequestId = useRef(0);
  const refreshSeconds = Math.max(fallbackIntervalSeconds, 30);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (lastSearch.current === search) return;

    lastSearch.current = search;
    lastFingerprint.current = initialFingerprint;
    setData(initialData);
    onSnapshot?.(initialData);
    setLastSnapshotAt(initialData.report.generatedAt);
    setLastSnapshotTrigger('connected');
    setConnectionState('connecting');
    setIsFallbackFetching(false);
    setIsStreamError(false);
  }, [initialData, initialFingerprint, onSnapshot, search]);

  useEffect(() => {
    const applyData = (nextData: CatalogHealthLiveData) => {
      setData(nextData);
      onSnapshot?.(nextData);
      setLastSnapshotAt(nextData.report.generatedAt);
      setIsStreamError(false);
    };
    const refresh = () => {
      const requestId = ++refreshRequestId.current;
      void refreshCatalogHealthSnapshot({
        applyData,
        isCurrent: () => requestId === refreshRequestId.current,
        onError: () => setIsStreamError(true),
        onFetchingChange: setIsFallbackFetching,
        search,
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener(CATALOG_HEALTH_REFRESH_EVENT, refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      refreshRequestId.current += 1;
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
    const applyData = (nextData: CatalogHealthLiveData) => {
      setData(nextData);
      onSnapshot?.(nextData);
      setLastSnapshotAt(nextData.report.generatedAt);
    };
    const refresh = () => {
      void refreshCatalogHealthSnapshot({
        applyData,
        isCurrent: () => !cancelled,
        onError: () => setIsStreamError(true),
        onFetchingChange: setIsFallbackFetching,
        search,
      });
    };

    refresh();
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

  const isBusy = isPending || isFallbackFetching;
  const status = buildLiveRefreshStatusViewModel({
    connectionState,
    isBusy,
    isStreamError,
    lastSnapshotAt,
    lastSnapshotTrigger,
  });
  const shouldShowStatus =
    hasMounted && (connectionState === 'fallback' || isBusy || Boolean(status.errorText));

  if (!shouldShowStatus) {
    return (
      <div className="sr-only" aria-live="polite">
        {status.statusCopy}. {hasMounted ? status.metaCopy : 'Waiting'}.
      </div>
    );
  }

  return (
    <div className={`live-refresh ${connectionState}`} aria-live="polite">
      <span className={status.dotClassName} aria-hidden="true" />
      <span>{status.statusCopy}</span>
      <span className="live-refresh-meta">{hasMounted ? status.metaCopy : 'Waiting'}</span>
      <LiveRefreshError text={status.errorText} />
    </div>
  );
}

function LiveRefreshError({ text }: { text: string | null }) {
  if (!text) return null;
  return <span className="live-refresh-error">{text}</span>;
}
