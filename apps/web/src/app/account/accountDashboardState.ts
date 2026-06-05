import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { getCsrfToken } from '@/lib/csrfClient';

import {
  deleteMovieMemory,
  fetchAccount,
  fetchMovieMemoryPage,
  fetchMovieMemoryPosters,
} from './accountDataClient';
import {
  getNextMovieMemoryOffset,
  getMissingPosterItems,
  mergeMovieMemoryPage,
  mergePosterLookups,
  normalizeAccountResponse,
  removeMovieMemoryItem,
} from './accountViewModel';

import type { LoadState, MemoryActionState, MemoryPageState } from './accountTypes';

const ACCOUNT_FETCH_TIMEOUT_MS = 10000;
const MOVIE_MEMORY_PAGE_SIZE = 50;

export function useAccountDashboardState(authStatus: string, locale: string) {
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [memoryAction, setMemoryAction] = useState<MemoryActionState>(null);
  const [memoryPageState, setMemoryPageState] = useState<MemoryPageState>({ status: 'idle' });
  const requestedMemoryPosters = useRef<Set<string>>(new Set());

  useInitialAccountLoad(authStatus, setState);
  useResetRequestedPosters(locale, requestedMemoryPosters);
  useMemoryPosterEnrichment(state, locale, requestedMemoryPosters, setState);

  const loadMoreMovieMemory = useCallback(async () => {
    const nextOffset = getNextMovieMemoryOffset(state, memoryPageState);
    if (nextOffset == null) return;

    setMemoryPageState({ status: 'loading' });

    try {
      const page = await fetchMovieMemoryPage(nextOffset, MOVIE_MEMORY_PAGE_SIZE);
      setState((current) =>
        current.status === 'loaded'
          ? { status: 'loaded', data: mergeMovieMemoryPage(current.data, page) }
          : current,
      );
      setMemoryPageState({ status: 'idle' });
    } catch {
      setMemoryPageState({ status: 'error' });
    }
  }, [memoryPageState, state]);

  const forgetMovie = useCallback(async (movieKey: string) => {
    setMemoryAction({ status: 'forgetting', movieKey });

    try {
      await deleteMovieMemory(movieKey, getCsrfToken());
      setState((current) =>
        current.status === 'loaded'
          ? { status: 'loaded', data: removeMovieMemoryItem(current.data, movieKey) }
          : current,
      );
      setMemoryAction(null);
    } catch {
      setMemoryAction({ status: 'error', movieKey });
    }
  }, []);

  return {
    forgetMovie,
    loadMoreMovieMemory,
    memoryAction,
    memoryPageState,
    setMemoryPageState,
    state,
  };
}

function useInitialAccountLoad(authStatus: string, setState: Dispatch<SetStateAction<LoadState>>) {
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ACCOUNT_FETCH_TIMEOUT_MS);

    async function loadAccount() {
      try {
        const data = await fetchAccount(controller.signal);
        window.clearTimeout(timeoutId);
        setState((current) =>
          cancelled ? current : { status: 'loaded', data: normalizeAccountResponse(data) },
        );
      } catch {
        setState((current) => (cancelled && !timedOut ? current : { status: 'error' }));
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [authStatus, setState]);
}

function useResetRequestedPosters(
  locale: string,
  requestedMemoryPosters: MutableRefObject<Set<string>>,
) {
  useEffect(() => {
    requestedMemoryPosters.current.clear();
  }, [locale, requestedMemoryPosters]);
}

function useMemoryPosterEnrichment(
  state: LoadState,
  locale: string,
  requestedMemoryPosters: MutableRefObject<Set<string>>,
  setState: Dispatch<SetStateAction<LoadState>>,
) {
  useEffect(() => {
    if (state.status !== 'loaded') return;

    const missingPosterItems = getMissingPosterItems(
      state.data.movieMemory,
      locale,
      requestedMemoryPosters.current,
    );

    if (missingPosterItems.length === 0) return;

    for (const { item } of missingPosterItems) {
      requestedMemoryPosters.current.add(item.movieKey);
    }

    let cancelled = false;

    async function loadMemoryPosters() {
      try {
        const results = await fetchMovieMemoryPosters(locale, missingPosterItems);
        if (cancelled || results.length === 0) return;

        setState((current) => {
          if (current.status !== 'loaded') return current;

          const movieMemory = mergePosterLookups(current.data.movieMemory, results);
          if (movieMemory === current.data.movieMemory) return current;

          return { status: 'loaded', data: { ...current.data, movieMemory } };
        });
      } catch {
        // Missing posters should not make the account page fail to load.
      }
    }

    void loadMemoryPosters();

    return () => {
      cancelled = true;
    };
  }, [state, locale, requestedMemoryPosters, setState]);
}
