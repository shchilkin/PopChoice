'use client';

import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { getCsrfToken } from '@/lib/csrfClient';

import type { RecommendationWithMovies } from '@/lib/db/recommendations';

/** Stop polling for more-picks after 2 minutes — prevents an infinite spinner when workers are down. */
export const MORE_PICKS_POLL_TIMEOUT_MS = 2 * 60 * 1000;

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
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json() as Promise<RecommendationWithMovies>;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const morePicksStatus = query.state.data?.morePicksStatus;
      if (status === 'failed') return false;
      if (status !== 'completed') return 2000;
      // Keep polling while the more-picks job is in flight, but stop after timeout
      if (morePicksStatus === 'pending' || morePicksStatus === 'processing') {
        if (morePicksPendingSince.current === null) {
          morePicksPendingSince.current = Date.now();
        }
        if (Date.now() - morePicksPendingSince.current > MORE_PICKS_POLL_TIMEOUT_MS) {
          setMorePicksTimedOut(true);
          return false;
        }
        return 2000;
      }
      // Job resolved (completed / failed / null) — reset timeout tracking
      morePicksPendingSince.current = null;
      setMorePicksTimedOut(false);
      return false;
    },
    staleTime: Infinity,
    retry: 3,
  });

  return { ...query, morePicksTimedOut };
}
