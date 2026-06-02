'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useTransition } from 'react';

import {
  CATALOG_HEALTH_LIVE_QUERY_KEY,
  catalogHealthLiveFingerprint,
  type CatalogHealthLiveData,
} from '../lib/catalogHealthLive';
import { CATALOG_HEALTH_REFRESH_EVENT } from './catalogHealthRefreshEvent';

const CLIENT_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

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

export function CatalogHealthLiveRefresh({
  initialData,
  intervalSeconds,
}: {
  initialData: CatalogHealthLiveData;
  intervalSeconds: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialFingerprint = useMemo(
    () => catalogHealthLiveFingerprint(initialData),
    [initialData],
  );
  const lastFingerprint = useRef(initialFingerprint);
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const refreshSeconds = Math.max(intervalSeconds, 5);
  const query = useQuery({
    initialData,
    queryFn: () => fetchCatalogHealthLive(search),
    queryKey: [...CATALOG_HEALTH_LIVE_QUERY_KEY, search],
    refetchInterval: refreshSeconds * 1000,
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
    if (!data) return;

    const nextFingerprint = catalogHealthLiveFingerprint(data);
    if (nextFingerprint === lastFingerprint.current) return;

    lastFingerprint.current = nextFingerprint;
    startTransition(() => {
      router.refresh();
    });
  }, [data, router]);

  const lastChecked = dataUpdatedAt ? CLIENT_TIME_FORMATTER.format(new Date(dataUpdatedAt)) : null;

  return (
    <div className="live-refresh" aria-live="polite">
      <span
        className={`live-refresh-dot ${isPending || isFetching ? 'pending' : ''}`}
        aria-hidden="true"
      />
      <span>
        {isPending || isFetching
          ? 'Refreshing catalog snapshot'
          : `Catalog status refreshes automatically every ${refreshSeconds}s`}
      </span>
      <span className="live-refresh-meta">
        {lastChecked ? `Last checked ${lastChecked}` : 'Waiting'}
      </span>
      {isError ? <span className="live-refresh-error">Auto-refresh failed</span> : null}
    </div>
  );
}
