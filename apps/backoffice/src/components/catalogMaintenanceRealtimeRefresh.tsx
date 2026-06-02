'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { formatLiveSyncTime } from './liveRefreshTime';

type RealtimeStatus = 'connecting' | 'connected' | 'error';

const REFRESH_DEBOUNCE_MS = 350;

export function CatalogMaintenanceRealtimeRefresh({
  label = 'Queue updates refresh this view',
}: {
  label?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/catalog-maintenance-queue/events');

    const scheduleRefresh = () => {
      setLastEventAt(new Date().toISOString());
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
    source.addEventListener('queue-event', scheduleRefresh);
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
  }, [router]);

  const copy =
    status === 'connected'
      ? label
      : status === 'connecting'
        ? 'Connecting to queue updates'
        : 'Queue updates unavailable';
  const lastEvent = lastEventAt ? formatLiveSyncTime(lastEventAt) : null;
  const syncLabel = status === 'connected' ? 'Synced' : 'Last sync';

  return (
    <div className={`live-refresh realtime-refresh ${status}`} aria-live="polite">
      <span
        className={`live-refresh-dot ${status === 'connecting' ? 'pending' : status === 'error' ? 'error' : ''}`}
        aria-hidden="true"
      />
      <span>{copy}</span>
      <span className="live-refresh-meta">
        {lastEvent ? `${syncLabel} ${lastEvent}` : 'Waiting'}
      </span>
    </div>
  );
}
