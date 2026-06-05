'use client';

import { AlertCircle, ArrowLeft, Eye, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { palette } from '@/styles/designTokens';

import {
  CompletionPanel,
  ManualSearchPanel,
  MovieTrainingCard,
} from './movieMemoryTrainingComponents';
import { getDeckKeyboardAction } from './movieMemoryViewModel';

type UserMovieInteractionKind = 'watched' | 'not_seen';

type MovieMemoryCandidate = {
  id: number;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
  duration: number | null;
  description: string | null;
  localizedOverview: string | null;
};

type CandidateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; movies: MovieMemoryCandidate[]; reviewed: number; total: number }
  | { status: 'error' };

type LoadedCandidateState = Extract<CandidateState, { status: 'loaded' }>;

type ActionState =
  | { status: 'idle' }
  | { status: 'saving'; movieId: number; kind: UserMovieInteractionKind }
  | { status: 'error' };

type CatalogSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; movies: MovieMemoryCandidate[] }
  | { status: 'error' };

type PendingMovieMemoryItem = {
  movieId: number;
  kind: UserMovieInteractionKind;
};

type DeckExitAction = UserMovieInteractionKind | 'unsure';

type DeckSessionStats = {
  watched: number;
  notSeen: number;
  unsure: number;
};

type PosterLookupResult = {
  id: number;
  posterURL: string | null;
  localizedName?: string | null;
  localizedOverview?: string | null;
};

type MergedPosterFields = Pick<
  MovieMemoryCandidate,
  'posterURL' | 'localizedName' | 'localizedOverview'
>;

type MovieMemoryLabels = ReturnType<typeof useLanguage>['t']['account'];

type CandidateRemovalEvent = 'missing' | 'empty' | 'removed';

type MovieMemoryDeckView = 'loading' | 'error' | 'completion' | 'deck';

type MovieMemoryDeckStateProps = {
  action: ActionState;
  candidates: CandidateState;
  deckExit: { movieId: number; action: DeckExitAction } | null;
  deckSessionStats: DeckSessionStats;
  isSubmittingAnswer: boolean;
  labels: MovieMemoryLabels;
  locale: string;
  onAnswerDeckMovie: (movieId: number, kind: UserMovieInteractionKind) => void;
  onLoadCandidates: () => void;
  onOpenManualSearch: () => void;
  onSkipActiveDeckMovie: (movieId: number) => void;
};

const MOVIE_MEMORY_FETCH_TIMEOUT_MS = 10000;
const ANSWER_EXIT_MS = 280;
const EMPTY_DECK_STATS: DeckSessionStats = { watched: 0, notSeen: 0, unsure: 0 };
const MOVIE_MEMORY_DECK_VIEW_BY_STATUS = {
  idle: 'completion',
  loading: 'loading',
  error: 'error',
} satisfies Record<Exclude<CandidateState['status'], 'loaded'>, MovieMemoryDeckView>;

function preferExistingMetadata(
  current: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  return current ?? fallback ?? null;
}

function getMergedPosterFields(
  movie: MovieMemoryCandidate,
  result: PosterLookupResult,
): MergedPosterFields {
  return {
    posterURL: preferExistingMetadata(movie.posterURL, result.posterURL),
    localizedName: preferExistingMetadata(movie.localizedName, result.localizedName),
    localizedOverview: preferExistingMetadata(movie.localizedOverview, result.localizedOverview),
  };
}

function hasMatchingPosterFields(movie: MovieMemoryCandidate, fields: MergedPosterFields): boolean {
  return [
    fields.posterURL === movie.posterURL,
    fields.localizedName === movie.localizedName,
    fields.localizedOverview === movie.localizedOverview,
  ].every(Boolean);
}

function mergePosterLookupMovie(
  movie: MovieMemoryCandidate,
  result: PosterLookupResult | undefined,
): { movie: MovieMemoryCandidate; changed: boolean } {
  if (!result) return { movie, changed: false };

  const fields = getMergedPosterFields(movie, result);
  return hasMatchingPosterFields(movie, fields)
    ? { movie, changed: false }
    : { movie: { ...movie, ...fields }, changed: true };
}

function mergePosterLookupResults(
  current: CandidateState,
  resultsByMovieId: Map<number, PosterLookupResult>,
): CandidateState;
function mergePosterLookupResults(
  current: CatalogSearchState,
  resultsByMovieId: Map<number, PosterLookupResult>,
): CatalogSearchState;
function mergePosterLookupResults(
  current: CandidateState | CatalogSearchState,
  resultsByMovieId: Map<number, PosterLookupResult>,
): CandidateState | CatalogSearchState {
  if (current.status !== 'loaded') return current;

  const mergedMovies = current.movies.map((movie) =>
    mergePosterLookupMovie(movie, resultsByMovieId.get(movie.id)),
  );
  const changed = mergedMovies.some((result) => result.changed);
  return changed ? { ...current, movies: mergedMovies.map((result) => result.movie) } : current;
}

function getCandidateRemoval(current: LoadedCandidateState, movieId: number) {
  const movies = current.movies.filter((movie) => movie.id !== movieId);
  return {
    movies,
    isEmpty: movies.length === 0,
    isMissing: movies.length === current.movies.length,
  };
}

function getCandidateRemovalEvent(removal: {
  isEmpty: boolean;
  isMissing: boolean;
}): CandidateRemovalEvent {
  if (removal.isMissing) return 'missing';
  return removal.isEmpty ? 'empty' : 'removed';
}

function notifyCandidateRemoval(
  removal: { isEmpty: boolean; isMissing: boolean },
  callbacks: { onEmpty?: () => void; onMissing?: () => void },
) {
  const callbackByEvent: Record<CandidateRemovalEvent, (() => void) | undefined> = {
    missing: callbacks.onMissing,
    empty: callbacks.onEmpty,
    removed: undefined,
  };
  callbackByEvent[getCandidateRemovalEvent(removal)]?.();
}

function removeMovieFromCandidates(
  current: CandidateState,
  movieId: number,
  callbacks: { onEmpty?: () => void; onMissing?: () => void } = {},
): CandidateState {
  if (current.status !== 'loaded') return current;

  const removal = getCandidateRemoval(current, movieId);
  notifyCandidateRemoval(removal, callbacks);
  if (removal.isMissing) {
    return current;
  }

  return {
    ...current,
    movies: removal.movies,
    reviewed: current.reviewed + 1,
  };
}

function removeMovieFromCatalogSearch(
  current: CatalogSearchState,
  movieId: number,
): CatalogSearchState {
  return current.status === 'loaded'
    ? { ...current, movies: current.movies.filter((movie) => movie.id !== movieId) }
    : current;
}

function shouldRequestPosterLookup(
  movie: MovieMemoryCandidate,
  locale: string,
  requestedMoviePosters: Set<number>,
): boolean {
  const needsLocalizedName = locale !== 'en' && !movie.localizedName;
  return (!movie.posterURL || needsLocalizedName) && !requestedMoviePosters.has(movie.id);
}

function addMissingPosterCandidates(
  movies: MovieMemoryCandidate[],
  locale: string,
  requestedMoviePosters: Set<number>,
  missingPosters: Map<number, MovieMemoryCandidate>,
) {
  for (const movie of movies) {
    if (shouldRequestPosterLookup(movie, locale, requestedMoviePosters)) {
      missingPosters.set(movie.id, movie);
    }
  }
}

function collectMissingPosterCandidates(
  candidates: CandidateState,
  catalogSearch: CatalogSearchState,
  locale: string,
  requestedMoviePosters: Set<number>,
): Map<number, MovieMemoryCandidate> {
  const missingPosters = new Map<number, MovieMemoryCandidate>();
  if (candidates.status === 'loaded') {
    addMissingPosterCandidates(candidates.movies, locale, requestedMoviePosters, missingPosters);
  }
  if (catalogSearch.status === 'loaded') {
    addMissingPosterCandidates(catalogSearch.movies, locale, requestedMoviePosters, missingPosters);
  }
  return missingPosters;
}

async function fetchPosterLookupResults(
  locale: string,
  movies: MovieMemoryCandidate[],
): Promise<Map<number, PosterLookupResult>> {
  const response = await fetch('/api/movie-posters', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      locale,
      movies: movies.map((movie) => ({
        id: movie.id,
        name: movie.movieName,
        year: movie.movieYear ?? undefined,
        tmdbId: movie.tmdbId ?? undefined,
      })),
    }),
  });

  if (!response.ok) return new Map();

  const data = (await response.json()) as { results?: PosterLookupResult[] };
  const results = Array.isArray(data.results) ? data.results : [];
  return new Map(results.map((result) => [result.id, result]));
}

function noopDeckFlushAction(_: ActionState) {}

function getDeckFlushActionUpdater(
  updateState: boolean,
  setAction: (state: ActionState) => void,
): (state: ActionState) => void {
  return updateState ? setAction : noopDeckFlushAction;
}

function getCatalogSearchQuery(query: string): string | null {
  const trimmedQuery = query.trim();
  return trimmedQuery.length < 2 ? null : trimmedQuery;
}

async function fetchCatalogSearchMovies(query: string): Promise<MovieMemoryCandidate[]> {
  const response = await fetch(`/api/account/movie-memory?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error('Failed to search movie catalog');
  }

  const data = (await response.json()) as { movies?: MovieMemoryCandidate[] };
  return Array.isArray(data.movies) ? data.movies : [];
}

export default function MovieMemoryPage() {
  const { auth } = useAuth();
  const { locale, t } = useLanguage();
  const a = t.account;
  const [candidates, setCandidates] = useState<CandidateState>({ status: 'idle' });
  const [action, setAction] = useState<ActionState>({ status: 'idle' });
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState<CatalogSearchState>({ status: 'idle' });
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [deckExit, setDeckExit] = useState<{ movieId: number; action: DeckExitAction } | null>(
    null,
  );
  const [deckSessionStats, setDeckSessionStats] = useState<DeckSessionStats>(EMPTY_DECK_STATS);
  const pendingDeckItems = useRef<PendingMovieMemoryItem[]>([]);
  const handledDeckMovieIds = useRef<Set<number>>(new Set());
  const requestedMoviePosters = useRef<Set<number>>(new Set());
  const answerLocked = useRef(false);
  const answerUnlockTimer = useRef<number | null>(null);

  const loadCandidates = useCallback(async () => {
    setCandidates({ status: 'loading' });
    setAction({ status: 'idle' });
    setDeckExit(null);
    answerLocked.current = false;
    setIsSubmittingAnswer(false);
    setDeckSessionStats(EMPTY_DECK_STATS);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), MOVIE_MEMORY_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/account/movie-memory?mode=candidates&locale=${locale}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to load movie memory candidates');
      }

      const data = (await response.json()) as { movies?: MovieMemoryCandidate[] };
      const movies = Array.isArray(data.movies) ? data.movies : [];
      handledDeckMovieIds.current.clear();
      setCandidates({ status: 'loaded', movies, reviewed: 0, total: movies.length });
    } catch {
      setCandidates({ status: 'error' });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [locale]);

  useEffect(() => {
    if (auth.status === 'authenticated' && candidates.status === 'idle') {
      const loadTimer = window.setTimeout(() => {
        void loadCandidates();
      }, 0);

      return () => window.clearTimeout(loadTimer);
    }
  }, [auth.status, candidates.status, loadCandidates]);

  const flushPendingDeckItems = useCallback(
    async ({ keepalive = false, updateState = true } = {}) => {
      const items = pendingDeckItems.current;
      if (items.length === 0) return;

      pendingDeckItems.current = [];
      const applyFlushAction = getDeckFlushActionUpdater(updateState, setAction);

      try {
        const response = await fetch('/api/account/movie-memory', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          keepalive,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ items, locale }),
        });

        if (!response.ok) {
          throw new Error('Failed to save movie memory batch');
        }

        applyFlushAction({ status: 'idle' });
      } catch {
        pendingDeckItems.current = [...items, ...pendingDeckItems.current];
        applyFlushAction({ status: 'error' });
      }
    },
    [locale],
  );

  useEffect(() => {
    const flushOnLeave = () => {
      void flushPendingDeckItems({ keepalive: true, updateState: false });
    };
    const flushOnHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushOnLeave();
      }
    };

    window.addEventListener('pagehide', flushOnLeave);
    document.addEventListener('visibilitychange', flushOnHidden);

    return () => {
      flushOnLeave();
      window.removeEventListener('pagehide', flushOnLeave);
      document.removeEventListener('visibilitychange', flushOnHidden);
    };
  }, [flushPendingDeckItems]);

  useEffect(() => {
    requestedMoviePosters.current.clear();
  }, [locale]);

  useEffect(
    () => () => {
      if (answerUnlockTimer.current) {
        window.clearTimeout(answerUnlockTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    const missingPosters = collectMissingPosterCandidates(
      candidates,
      catalogSearch,
      locale,
      requestedMoviePosters.current,
    );

    if (missingPosters.size === 0) return;

    for (const id of missingPosters.keys()) {
      requestedMoviePosters.current.add(id);
    }

    let cancelled = false;

    async function loadMissingPosters() {
      try {
        const resultsByMovieId = await fetchPosterLookupResults(
          locale,
          Array.from(missingPosters.values()),
        );
        if (cancelled || resultsByMovieId.size === 0) return;

        setCandidates((current) => mergePosterLookupResults(current, resultsByMovieId));
        setCatalogSearch((current) => mergePosterLookupResults(current, resultsByMovieId));
      } catch {
        // Missing posters should not block the movie-memory trainer.
      }
    }

    void loadMissingPosters();

    return () => {
      cancelled = true;
    };
  }, [candidates, catalogSearch, locale]);

  const saveDeckMovieMemory = useCallback(
    (movieId: number, kind: UserMovieInteractionKind) => {
      if (handledDeckMovieIds.current.has(movieId)) return;
      handledDeckMovieIds.current.add(movieId);
      pendingDeckItems.current = [
        ...pendingDeckItems.current.filter((item) => item.movieId !== movieId),
        { movieId, kind },
      ];
      setAction({ status: 'idle' });
      setCandidates((current) =>
        removeMovieFromCandidates(current, movieId, {
          onEmpty: () => queueMicrotask(() => void flushPendingDeckItems()),
          onMissing: () => {
            handledDeckMovieIds.current.delete(movieId);
            pendingDeckItems.current = pendingDeckItems.current.filter(
              (item) => item.movieId !== movieId,
            );
          },
        }),
      );
      setCatalogSearch((current) => removeMovieFromCatalogSearch(current, movieId));
    },
    [flushPendingDeckItems],
  );

  const skipDeckMovie = useCallback((movieId: number) => {
    if (handledDeckMovieIds.current.has(movieId)) return;
    handledDeckMovieIds.current.add(movieId);
    setAction({ status: 'idle' });
    setCandidates((current) =>
      removeMovieFromCandidates(current, movieId, {
        onMissing: () => handledDeckMovieIds.current.delete(movieId),
      }),
    );
    setCatalogSearch((current) => removeMovieFromCatalogSearch(current, movieId));
  }, []);

  const startDeckExit = useCallback(
    (movieId: number, exitAction: DeckExitAction) => {
      if (answerLocked.current || deckExit) return;

      answerLocked.current = true;
      setIsSubmittingAnswer(true);
      setDeckExit({ movieId, action: exitAction });

      if (answerUnlockTimer.current) {
        window.clearTimeout(answerUnlockTimer.current);
      }

      answerUnlockTimer.current = window.setTimeout(() => {
        setDeckSessionStats((current) => ({
          watched: current.watched + (exitAction === 'watched' ? 1 : 0),
          notSeen: current.notSeen + (exitAction === 'not_seen' ? 1 : 0),
          unsure: current.unsure + (exitAction === 'unsure' ? 1 : 0),
        }));

        if (exitAction === 'unsure') {
          skipDeckMovie(movieId);
        } else {
          saveDeckMovieMemory(movieId, exitAction);
        }

        answerLocked.current = false;
        setIsSubmittingAnswer(false);
        setDeckExit(null);
        answerUnlockTimer.current = null;
      }, ANSWER_EXIT_MS);
    },
    [deckExit, saveDeckMovieMemory, skipDeckMovie],
  );

  const answerDeckMovie = useCallback(
    (movieId: number, kind: UserMovieInteractionKind) => {
      startDeckExit(movieId, kind);
    },
    [startDeckExit],
  );

  const skipActiveDeckMovie = useCallback(
    (movieId: number) => {
      startDeckExit(movieId, 'unsure');
    },
    [startDeckExit],
  );

  useEffect(() => {
    if (auth.status !== 'authenticated' || candidates.status !== 'loaded') return;
    const activeDeckMovie = candidates.movies[0];
    if (!activeDeckMovie) return;

    function handleKeyDown(event: KeyboardEvent) {
      const action = getDeckKeyboardAction(event);
      if (!action) return;

      event.preventDefault();
      if (action === 'unsure') {
        skipActiveDeckMovie(activeDeckMovie.id);
      } else {
        answerDeckMovie(activeDeckMovie.id, action);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answerDeckMovie, auth.status, candidates, skipActiveDeckMovie]);

  async function saveMovieMemory(movieId: number, kind: UserMovieInteractionKind) {
    setAction({ status: 'saving', movieId, kind });

    try {
      const response = await fetch('/api/account/movie-memory', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ movieId, kind, locale }),
      });

      if (!response.ok) {
        throw new Error('Failed to save movie memory');
      }

      setCandidates((current) =>
        current.status === 'loaded'
          ? {
              ...current,
              movies: current.movies.filter((movie) => movie.id !== movieId),
              reviewed: current.reviewed + 1,
            }
          : current,
      );
      setCatalogSearch((current) =>
        current.status === 'loaded'
          ? { ...current, movies: current.movies.filter((movie) => movie.id !== movieId) }
          : current,
      );
      setAction({ status: 'idle' });
    } catch {
      setAction({ status: 'error' });
    }
  }

  async function handleCatalogSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = getCatalogSearchQuery(catalogQuery);
    if (!query) return;

    setCatalogSearch({ status: 'loading' });

    try {
      setCatalogSearch({ status: 'loaded', movies: await fetchCatalogSearchMovies(query) });
    } catch {
      setCatalogSearch({ status: 'error' });
    }
  }

  if (auth.status === 'unknown' || candidates.status === 'idle') {
    return (
      <MovieMemoryShell>
        <LoadingState label={a.loading} />
      </MovieMemoryShell>
    );
  }

  if (auth.status !== 'authenticated') {
    return (
      <MovieMemoryShell>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
          >
            <Eye size={26} />
          </div>
          <div>
            <h1
              className="mb-3 uppercase"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontSize: 'clamp(2rem, 8vw, 3.4rem)',
                fontWeight: 600,
                color: 'var(--pc-t1)',
              }}
            >
              {a.signedOutTitle}
            </h1>
            <p style={{ color: 'var(--pc-t2)' }}>{a.signedOutBody}</p>
          </div>
          <Link
            href="/login"
            className="rounded-xl px-5 py-3 text-sm font-semibold"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            {t.nav.logIn}
          </Link>
        </motion.section>
      </MovieMemoryShell>
    );
  }

  return (
    <AuthenticatedMovieMemoryContent
      action={action}
      candidates={candidates}
      catalogQuery={catalogQuery}
      catalogSearch={catalogSearch}
      deckExit={deckExit}
      deckSessionStats={deckSessionStats}
      isManualSearchOpen={isManualSearchOpen}
      isSubmittingAnswer={isSubmittingAnswer}
      labels={a}
      locale={locale}
      onAnswerDeckMovie={answerDeckMovie}
      onCatalogQueryChange={setCatalogQuery}
      onCatalogSearch={handleCatalogSearch}
      onLoadCandidates={loadCandidates}
      onOpenManualSearch={() => setIsManualSearchOpen(true)}
      onSaveMovieMemory={saveMovieMemory}
      onSkipActiveDeckMovie={skipActiveDeckMovie}
      onToggleManualSearch={() => setIsManualSearchOpen((current) => !current)}
    />
  );
}

function AuthenticatedMovieMemoryContent({
  action,
  candidates,
  catalogQuery,
  catalogSearch,
  deckExit,
  deckSessionStats,
  isManualSearchOpen,
  isSubmittingAnswer,
  labels,
  locale,
  onAnswerDeckMovie,
  onCatalogQueryChange,
  onCatalogSearch,
  onLoadCandidates,
  onOpenManualSearch,
  onSaveMovieMemory,
  onSkipActiveDeckMovie,
  onToggleManualSearch,
}: {
  action: ActionState;
  candidates: CandidateState;
  catalogQuery: string;
  catalogSearch: CatalogSearchState;
  deckExit: { movieId: number; action: DeckExitAction } | null;
  deckSessionStats: DeckSessionStats;
  isManualSearchOpen: boolean;
  isSubmittingAnswer: boolean;
  labels: MovieMemoryLabels;
  locale: string;
  onAnswerDeckMovie: (movieId: number, kind: UserMovieInteractionKind) => void;
  onCatalogQueryChange: (query: string) => void;
  onCatalogSearch: (event: FormEvent<HTMLFormElement>) => void;
  onLoadCandidates: () => void;
  onOpenManualSearch: () => void;
  onSaveMovieMemory: (movieId: number, kind: UserMovieInteractionKind) => void;
  onSkipActiveDeckMovie: (movieId: number) => void;
  onToggleManualSearch: () => void;
}) {
  const shouldShowManualSearch =
    isManualSearchOpen || (candidates.status === 'loaded' && candidates.total === 0);

  return (
    <MovieMemoryShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <MovieMemoryHeader labels={labels} />
        <MovieMemoryTrainingSection
          action={action}
          candidates={candidates}
          deckExit={deckExit}
          deckSessionStats={deckSessionStats}
          isSubmittingAnswer={isSubmittingAnswer}
          labels={labels}
          locale={locale}
          onAnswerDeckMovie={onAnswerDeckMovie}
          onLoadCandidates={onLoadCandidates}
          onOpenManualSearch={onOpenManualSearch}
          onSkipActiveDeckMovie={onSkipActiveDeckMovie}
        />
        {shouldShowManualSearch ? (
          <ManualSearchPanel
            query={catalogQuery}
            search={catalogSearch}
            labels={labels}
            locale={locale}
            action={action}
            isOpen={isManualSearchOpen}
            onToggle={onToggleManualSearch}
            onQueryChange={onCatalogQueryChange}
            onSearch={onCatalogSearch}
            onSave={onSaveMovieMemory}
          />
        ) : null}
      </motion.section>
    </MovieMemoryShell>
  );
}

function MovieMemoryHeader({ labels }: { labels: MovieMemoryLabels }) {
  return (
    <>
      <Link
        href="/account"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'var(--pc-t2)' }}
      >
        <ArrowLeft size={16} />
        {labels.backToAccount}
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div
            className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
            style={{
              background: 'var(--pc-gold-subtle)',
              border: '1px solid var(--pc-gold-bd)',
              color: 'var(--pc-gold-text)',
            }}
          >
            <Sparkles size={14} />
            {labels.memoryTrainerBadge}
          </div>
          <h1
            className="uppercase"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontSize: 'clamp(1.9rem, 4vw, 3rem)',
              fontWeight: 600,
              lineHeight: 1,
              color: 'var(--pc-t1)',
            }}
          >
            {labels.memoryTrainerTitle}
          </h1>
        </div>
        <p className="max-w-xl text-sm sm:text-right" style={{ color: 'var(--pc-t2)' }}>
          {labels.memoryTrainerBody}
        </p>
      </div>
    </>
  );
}

function MovieMemoryTrainingSection(props: MovieMemoryDeckStateProps) {
  return (
    <section className="mx-auto max-w-4xl">
      <MovieMemoryDeckState {...props} />
      {props.action.status === 'error' ? (
        <MovieMemoryActionError message={props.labels.candidateLoadError} />
      ) : null}
    </section>
  );
}

function getMovieMemoryDeckView(candidates: CandidateState): MovieMemoryDeckView {
  if (candidates.status !== 'loaded') return MOVIE_MEMORY_DECK_VIEW_BY_STATUS[candidates.status];
  return candidates.movies.length === 0 ? 'completion' : 'deck';
}

function getCompletionPanelVariant(candidates: CandidateState): 'empty' | 'complete' {
  return candidates.status === 'loaded' && candidates.total === 0 ? 'empty' : 'complete';
}

function MovieMemoryDeckState({
  action,
  candidates,
  deckExit,
  deckSessionStats,
  isSubmittingAnswer,
  labels,
  locale,
  onAnswerDeckMovie,
  onLoadCandidates,
  onOpenManualSearch,
  onSkipActiveDeckMovie,
}: MovieMemoryDeckStateProps) {
  const view = getMovieMemoryDeckView(candidates);
  if (view === 'loading') return <LoadingState label={labels.loading} compact />;
  if (view === 'error') {
    return (
      <ErrorPanel
        message={labels.candidateLoadError}
        retryLabel={labels.candidateRetry}
        onRetry={onLoadCandidates}
      />
    );
  }

  if (view === 'completion') {
    return (
      <CompletionPanel
        labels={labels}
        onLoadMore={onLoadCandidates}
        onOpenManualSearch={onOpenManualSearch}
        stats={deckSessionStats}
        variant={getCompletionPanelVariant(candidates)}
      />
    );
  }

  return (
    <LoadedMovieMemoryDeckState
      action={action}
      candidates={candidates as LoadedCandidateState}
      deckExit={deckExit}
      isSubmittingAnswer={isSubmittingAnswer}
      labels={labels}
      locale={locale}
      onAnswerDeckMovie={onAnswerDeckMovie}
      onSkipActiveDeckMovie={onSkipActiveDeckMovie}
    />
  );
}

function getDeckExitAction(
  deckExit: { movieId: number; action: DeckExitAction } | null,
  movieId: number,
): DeckExitAction | null {
  return deckExit?.movieId === movieId ? deckExit.action : null;
}

function LoadedMovieMemoryDeckState({
  action,
  candidates,
  deckExit,
  isSubmittingAnswer,
  labels,
  locale,
  onAnswerDeckMovie,
  onSkipActiveDeckMovie,
}: Omit<
  MovieMemoryDeckStateProps,
  'candidates' | 'deckSessionStats' | 'onLoadCandidates' | 'onOpenManualSearch'
> & {
  candidates: LoadedCandidateState;
}) {
  const activeMovie = candidates.movies[0];

  return (
    <MovieTrainingCard
      movie={activeMovie}
      locale={locale}
      labels={labels}
      exitAction={getDeckExitAction(deckExit, activeMovie.id)}
      counter={labels.memoryDeckCounter
        .replace('{current}', String(candidates.reviewed + 1))
        .replace('{total}', String(candidates.total))}
      progressPercent={((candidates.reviewed + 1) / Math.max(candidates.total, 1)) * 100}
      action={action}
      isSubmitting={isSubmittingAnswer}
      onSave={onAnswerDeckMovie}
      onSkip={onSkipActiveDeckMovie}
    />
  );
}

function MovieMemoryActionError({ message }: { message: string }) {
  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm"
      style={{
        background: `${palette.red}14`,
        border: `1px solid ${palette.red}35`,
        color: 'var(--pc-t2)',
      }}
    >
      <AlertCircle size={18} style={{ color: palette.red }} />
      <span>{message}</span>
    </div>
  );
}

function MovieMemoryShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 py-7 md:px-8 md:py-10">{children}</div>;
}

function LoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div
      className={`mx-auto flex max-w-xl flex-col items-center justify-center px-5 text-center ${
        compact ? 'min-h-[420px]' : 'min-h-[70vh]'
      }`}
    >
      <motion.div
        aria-hidden="true"
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: 'var(--pc-gold-subtle)',
          border: '1px solid var(--pc-gold-bd)',
          color: 'var(--pc-gold-text)',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Loader2 className="animate-spin" size={30} />
      </motion.div>

      <p className="text-lg font-medium" style={{ color: 'var(--pc-t1)' }}>
        {label}
      </p>
    </div>
  );
}

function ErrorPanel({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
      style={{
        background: 'var(--pc-surface)',
        border: `1px solid ${palette.red}45`,
        color: 'var(--pc-t2)',
      }}
    >
      <AlertCircle size={28} style={{ color: palette.red }} />
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl px-5 py-3 text-sm font-semibold"
        style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
      >
        {retryLabel}
      </button>
    </div>
  );
}
