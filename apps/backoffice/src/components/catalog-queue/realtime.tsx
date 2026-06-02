'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogMaintenanceQueueJobPage } from '../../catalogMaintenanceQueue';
import { parseCatalogMaintenanceQueueSnapshotMessage } from '../../lib/catalogMaintenanceQueueLive';
import {
  QueueCommandStrip,
  QueueJobsPanel,
  QueueRealtimeStatus,
  type RealtimeStatus,
} from './realtimeSections';

export function CatalogMaintenanceQueueRealtime({
  bullBoardUrl,
  initialJobPage,
}: {
  bullBoardUrl?: string;
  initialJobPage: CatalogMaintenanceQueueJobPage;
}) {
  const searchParams = useSearchParams();
  const [jobPage, setJobPage] = useState(initialJobPage);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(initialJobPage.updatedAt);
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
    setStatus('connecting');
  }, [initialJobPage]);

  useEffect(() => {
    setStatus('connecting');
    const source = new EventSource(`/api/catalog-maintenance-queue/events${search}`);

    source.addEventListener('connected', () => {
      setStatus('connected');
    });
    source.addEventListener('snapshot', (event: MessageEvent<string>) => {
      const message = parseCatalogMaintenanceQueueSnapshotMessage(event.data);
      if (!message) {
        setStatus('error');
        return;
      }

      setJobPage(message.jobPage);
      setLastEventAt(message.receivedAt);
      setStatus('connected');
    });
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
      source.close();
    };
  }, [search]);

  return (
    <>
      <QueueRealtimeStatus lastEventAt={lastEventAt} status={status} />
      <QueueCommandStrip bullBoardUrl={bullBoardUrl} jobPage={jobPage} />
      <QueueJobsPanel jobPage={jobPage} />
    </>
  );
}
