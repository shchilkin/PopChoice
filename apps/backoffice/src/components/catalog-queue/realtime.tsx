'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogMaintenanceQueueJobPage } from '../../catalogMaintenanceQueue';
import {
  isCatalogMaintenanceQueueJobPage,
  parseCatalogMaintenanceQueueConnectedMode,
  parseCatalogMaintenanceQueueSnapshotMessage,
} from '../../lib/catalogMaintenanceQueueLive';
import {
  getQueueRealtimeStatus,
  isQueueRealtimeFallbackStatus,
  QUEUE_REALTIME_FALLBACK_INTERVAL_SECONDS,
  type QueueRealtimeConnectionState,
} from './helpers';
import { QueueCommandStrip, QueueJobsPanel, QueueRealtimeStatus } from './realtimeSections';

async function fetchCatalogMaintenanceQueue(
  search: string,
): Promise<CatalogMaintenanceQueueJobPage> {
  const response = await fetch(`/api/catalog-maintenance-queue${search}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch catalog maintenance queue.');
  }

  const payload = (await response.json()) as unknown;
  if (!isCatalogMaintenanceQueueJobPage(payload)) {
    throw new Error('Catalog maintenance queue response was malformed.');
  }

  return payload;
}

export function CatalogMaintenanceQueueRealtime({
  fallbackIntervalSeconds = QUEUE_REALTIME_FALLBACK_INTERVAL_SECONDS,
  bullBoardUrl,
  initialJobPage,
}: {
  fallbackIntervalSeconds?: number;
  bullBoardUrl?: string;
  initialJobPage: CatalogMaintenanceQueueJobPage;
}) {
  const searchParams = useSearchParams();
  const [jobPage, setJobPage] = useState(initialJobPage);
  const [connectionState, setConnectionState] =
    useState<QueueRealtimeConnectionState>('connecting');
  const [isFallbackFetching, setIsFallbackFetching] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<string | null>(initialJobPage.updatedAt);
  const [nowMs, setNowMs] = useState(Date.now());
  const refreshRequestId = useRef(0);
  const initialFingerprint = useRef(
    `${initialJobPage.state}:${initialJobPage.offset}:${initialJobPage.limit}:${initialJobPage.updatedAt}`,
  );
  const search = useMemo(() => {
    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : '';
  }, [searchParams]);

  useEffect(() => {
    const nextFingerprint = `${initialJobPage.state}:${initialJobPage.offset}:${initialJobPage.limit}:${initialJobPage.updatedAt}`;
    if (initialFingerprint.current === nextFingerprint) return;

    initialFingerprint.current = nextFingerprint;
    setJobPage(initialJobPage);
    setLastEventAt(initialJobPage.updatedAt);
    setConnectionState('connecting');
    setNowMs(Date.now());
  }, [initialJobPage]);

  const refreshQueueSnapshot = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    setIsFallbackFetching(true);

    try {
      const nextJobPage = await fetchCatalogMaintenanceQueue(search);
      if (requestId !== refreshRequestId.current) return;

      setJobPage(nextJobPage);
      setLastEventAt(nextJobPage.updatedAt);
      setNowMs(Date.now());
      setConnectionState((current) => (current === 'connected' ? current : 'fallback'));
    } catch {
      if (requestId === refreshRequestId.current) {
        setConnectionState('reconnecting');
        setNowMs(Date.now());
      }
    } finally {
      if (requestId === refreshRequestId.current) setIsFallbackFetching(false);
    }
  }, [search]);

  useEffect(() => {
    setConnectionState('connecting');
    const source = new EventSource(`/api/catalog-maintenance-queue/events${search}`);

    source.addEventListener('connected', (event: MessageEvent<string>) => {
      const mode = parseCatalogMaintenanceQueueConnectedMode(event.data);
      setConnectionState(mode === 'snapshot-only' ? 'fallback' : 'connected');
      setNowMs(Date.now());
    });
    source.addEventListener('snapshot', (event: MessageEvent<string>) => {
      const message = parseCatalogMaintenanceQueueSnapshotMessage(event.data);
      if (!message) {
        setConnectionState('reconnecting');
        return;
      }

      setJobPage(message.jobPage);
      setLastEventAt(message.receivedAt);
      setNowMs(Date.now());
      setConnectionState(
        message.trigger === 'redis-unavailable' || !message.jobPage.available
          ? 'fallback'
          : 'connected',
      );
    });
    source.addEventListener('heartbeat', () => {
      setNowMs(Date.now());
      setConnectionState((current) =>
        current === 'fallback' || current === 'reconnecting' ? current : 'connected',
      );
    });
    source.addEventListener('queue-error', () => {
      setConnectionState('reconnecting');
      setNowMs(Date.now());
    });
    source.onerror = () => {
      setConnectionState('reconnecting');
      setNowMs(Date.now());
    };

    return () => {
      refreshRequestId.current += 1;
      source.close();
    };
  }, [search]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const status = getQueueRealtimeStatus({
    connectionState,
    jobPage,
    lastEventAt,
    nowMs,
  });

  useEffect(() => {
    if (!isQueueRealtimeFallbackStatus(status)) return;

    void refreshQueueSnapshot();
    const interval = window.setInterval(
      () => {
        void refreshQueueSnapshot();
      },
      Math.max(fallbackIntervalSeconds, 10) * 1000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [fallbackIntervalSeconds, refreshQueueSnapshot, status]);

  return (
    <>
      <QueueRealtimeStatus
        isRefreshing={isFallbackFetching}
        lastEventAt={lastEventAt}
        onRefresh={() => {
          void refreshQueueSnapshot();
        }}
        status={status}
      />
      <QueueCommandStrip bullBoardUrl={bullBoardUrl} jobPage={jobPage} />
      <QueueJobsPanel jobPage={jobPage} />
    </>
  );
}
