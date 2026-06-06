'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { getCsrfToken } from '@/lib/csrfClient';

import type { RecommendationWithMovies } from '@/lib/db/recommendations';
import type { MutableRefObject } from 'react';

/** Stop polling for more-picks after 2 minutes — prevents an infinite spinner when workers are down. */
const MORE_PICKS_POLL_TIMEOUT_MS = 2 * 60 * 1000;

export class RecommendationFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'RecommendationFetchError';
  }
}

export function shouldRetryRecommendationFetch(failureCount: number, error: Error): boolean {
  if (
    error instanceof RecommendationFetchError &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  ) {
    return false;
  }

  return failureCount < 3;
}

export function useRecommendation(id: string) {
  const morePicksPendingSince = useRef<number | null>(null);
  const [morePicksTimedOut, setMorePicksTimedOut] = useState(false);

  const query = useQuery<RecommendationWithMovies>({
    queryKey: ['recommendation', id],
    queryFn: async () => {
      const res = await fetch(`/api/recommendations/${id}`, {
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });
      if (!res.ok) {
        throw new RecommendationFetchError(`HTTP ${res.status}`, res.status);
      }
      return res.json() as Promise<RecommendationWithMovies>;
    },
    refetchInterval: (query) => {
      return getRecommendationRefetchInterval({
        data: query.state.data,
        error: query.state.error,
        morePicksPendingSince,
        setMorePicksTimedOut,
      });
    },
    staleTime: Infinity,
    retry: shouldRetryRecommendationFetch,
  });

  return { ...query, morePicksTimedOut };
}

function getRecommendationRefetchInterval({
  data,
  error,
  morePicksPendingSince,
  setMorePicksTimedOut,
}: {
  data: RecommendationWithMovies | undefined;
  error: Error | null;
  morePicksPendingSince: MutableRefObject<number | null>;
  setMorePicksTimedOut: (timedOut: boolean) => void;
}) {
  if (error || data?.status === 'failed') return false;
  if (data?.status !== 'completed') return 2000;

  return getMorePicksRefetchInterval(
    data.morePicksStatus,
    morePicksPendingSince,
    setMorePicksTimedOut,
  );
}

function getMorePicksRefetchInterval(
  morePicksStatus: RecommendationWithMovies['morePicksStatus'],
  morePicksPendingSince: MutableRefObject<number | null>,
  setMorePicksTimedOut: (timedOut: boolean) => void,
) {
  if (morePicksStatus === 'pending' || morePicksStatus === 'processing') {
    return getPendingMorePicksRefetchInterval(morePicksPendingSince, setMorePicksTimedOut);
  }

  morePicksPendingSince.current = null;
  setMorePicksTimedOut(false);
  return false;
}

function getPendingMorePicksRefetchInterval(
  morePicksPendingSince: MutableRefObject<number | null>,
  setMorePicksTimedOut: (timedOut: boolean) => void,
) {
  morePicksPendingSince.current ??= Date.now();

  if (Date.now() - morePicksPendingSince.current > MORE_PICKS_POLL_TIMEOUT_MS) {
    setMorePicksTimedOut(true);
    return false;
  }

  return 2000;
}
