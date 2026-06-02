'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatLiveSyncTime } from './liveRefreshTime';

type RealtimeStatus = 'connecting' | 'connected' | 'error';
type QueueSnapshotMessage = {
  receivedAt?: unknown;
  trigger?: unknown;
};

const REFRESH_DEBOUNCE_MS = 350;

function parseQueueSnapshotMessage(event: MessageEvent<string>): QueueSnapshotMessage {
  try {
    return JSON.parse(event.data) as QueueSnapshotMessage;
  } catch {
    return {};
  }
}

function getReceivedAt(message: QueueSnapshotMessage): string {
  if (typeof message.receivedAt === 'string') {
    const receivedAt = new Date(message.receivedAt);
    if (!Number.isNaN(receivedAt.getTime())) return message.receivedAt;
  }

  return new Date().toISOString();
}

export function CatalogMaintenanceRealtimeRefresh({
  label = 'Queue updates automatically',
}: {
  label?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const search = useMemo(() => {
    const serialized = searchParams.toString();
    return serialized ? `?${serialized}` : '';
  }, [searchParams]);

  useEffect(() => {
    setStatus('connecting');
    setLastEventAt(null);

    const source = new EventSource(`/api/catalog-maintenance-queue/events${search}`);

    const scheduleRefresh = (event: MessageEvent<string>) => {
      const message = parseQueueSnapshotMessage(event);
      setStatus('connected');
      setLastEventAt(getReceivedAt(message));
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    source.addEventListener('connected', () => {
      setStatus('connected');
    });
    source.addEventListener('snapshot', scheduleRefresh);
    source.addEventListener('heartbeat', () => {
      setStatus((current) => (current === 'error' ? current : 'connected'));
    });
    source.addEventListener('queue-error', () => {
      setStatus('error');
    });
    source.onerror = () => {
      setStatus('error');
    };

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
      source.close();
    };
  }, [router, search]);

  const copy =
    status === 'connected'
      ? label
      : status === 'connecting'
        ? 'Connecting to automatic updates'
        : 'Automatic updates are reconnecting';
  const lastEvent = lastEventAt ? formatLiveSyncTime(lastEventAt) : null;

  return (
    <div className={`live-refresh realtime-refresh ${status}`} aria-live="polite">
      <span
        className={`live-refresh-dot ${status === 'connecting' ? 'pending' : status === 'error' ? 'error' : ''}`}
        aria-hidden="true"
      />
      <span>{copy}</span>
      <span className="live-refresh-meta">
        {lastEvent ? `Updated ${lastEvent}` : 'Waiting for the first update'}
      </span>
    </div>
  );
}
