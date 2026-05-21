'use client';

import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Film,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { palette } from '@/styles/designTokens';

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

type PosterLookupResult = {
  id: number;
  posterURL: string | null;
  localizedName?: string | null;
  localizedOverview?: string | null;
};

const MOVIE_MEMORY_FETCH_TIMEOUT_MS = 10000;
const ANSWER_LOCK_MS = 180;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
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
  const pendingDeckItems = useRef<PendingMovieMemoryItem[]>([]);
  const handledDeckMovieIds = useRef<Set<number>>(new Set());
  const requestedMoviePosters = useRef<Set<number>>(new Set());
  const answerLocked = useRef(false);
  const answerUnlockTimer = useRef<number | null>(null);

  const loadCandidates = useCallback(async () => {
    setCandidates({ status: 'loading' });
    setAction({ status: 'idle' });

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

        if (updateState) {
          setAction({ status: 'idle' });
        }
      } catch {
        pendingDeckItems.current = [...items, ...pendingDeckItems.current];
        if (updateState) {
          setAction({ status: 'error' });
        }
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
    const missingPosters = new Map<number, MovieMemoryCandidate>();
    if (candidates.status === 'loaded') {
      for (const movie of candidates.movies) {
        const needsLocalizedName = locale !== 'en' && !movie.localizedName;
        if (
          (!movie.posterURL || needsLocalizedName) &&
          !requestedMoviePosters.current.has(movie.id)
        ) {
          missingPosters.set(movie.id, movie);
        }
      }
    }

    if (catalogSearch.status === 'loaded') {
      for (const movie of catalogSearch.movies) {
        const needsLocalizedName = locale !== 'en' && !movie.localizedName;
        if (
          (!movie.posterURL || needsLocalizedName) &&
          !requestedMoviePosters.current.has(movie.id)
        ) {
          missingPosters.set(movie.id, movie);
        }
      }
    }

    if (missingPosters.size === 0) return;

    for (const id of missingPosters.keys()) {
      requestedMoviePosters.current.add(id);
    }

    let cancelled = false;

    async function loadMissingPosters() {
      try {
        const response = await fetch('/api/movie-posters', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locale,
            movies: Array.from(missingPosters.values()).map((movie) => ({
              id: movie.id,
              name: movie.movieName,
              year: movie.movieYear ?? undefined,
              tmdbId: movie.tmdbId ?? undefined,
            })),
          }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as { results?: PosterLookupResult[] };
        const resultsByMovieId = new Map(
          (Array.isArray(data.results) ? data.results : []).map((result) => [result.id, result]),
        );

        if (cancelled || resultsByMovieId.size === 0) return;

        setCandidates((current) => {
          if (current.status !== 'loaded') return current;

          let changed = false;
          const movies = current.movies.map((movie) => {
            const result = resultsByMovieId.get(movie.id);
            if (!result) return movie;

            const posterURL = movie.posterURL ?? result.posterURL;
            const localizedName = movie.localizedName ?? result.localizedName ?? null;
            const localizedOverview = movie.localizedOverview ?? result.localizedOverview ?? null;
            if (
              posterURL === movie.posterURL &&
              localizedName === movie.localizedName &&
              localizedOverview === movie.localizedOverview
            ) {
              return movie;
            }

            changed = true;
            return { ...movie, posterURL, localizedName, localizedOverview };
          });

          return changed ? { ...current, movies } : current;
        });

        setCatalogSearch((current) => {
          if (current.status !== 'loaded') return current;

          let changed = false;
          const movies = current.movies.map((movie) => {
            const result = resultsByMovieId.get(movie.id);
            if (!result) return movie;

            const posterURL = movie.posterURL ?? result.posterURL;
            const localizedName = movie.localizedName ?? result.localizedName ?? null;
            const localizedOverview = movie.localizedOverview ?? result.localizedOverview ?? null;
            if (
              posterURL === movie.posterURL &&
              localizedName === movie.localizedName &&
              localizedOverview === movie.localizedOverview
            ) {
              return movie;
            }

            changed = true;
            return { ...movie, posterURL, localizedName, localizedOverview };
          });

          return changed ? { ...current, movies } : current;
        });
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
      setCandidates((current) => {
        if (current.status !== 'loaded') return current;
        const hasMovie = current.movies.some((movie) => movie.id === movieId);
        if (!hasMovie) {
          handledDeckMovieIds.current.delete(movieId);
          pendingDeckItems.current = pendingDeckItems.current.filter(
            (item) => item.movieId !== movieId,
          );
          return current;
        }

        const remainingMovies = current.movies.filter((movie) => movie.id !== movieId);
        if (remainingMovies.length === 0) {
          queueMicrotask(() => void flushPendingDeckItems());
        }

        return {
          ...current,
          movies: remainingMovies,
          reviewed: current.reviewed + 1,
        };
      });
      setCatalogSearch((current) =>
        current.status === 'loaded'
          ? { ...current, movies: current.movies.filter((movie) => movie.id !== movieId) }
          : current,
      );
    },
    [flushPendingDeckItems],
  );

  const skipDeckMovie = useCallback((movieId: number) => {
    if (handledDeckMovieIds.current.has(movieId)) return;
    handledDeckMovieIds.current.add(movieId);
    setAction({ status: 'idle' });
    setCandidates((current) => {
      if (current.status !== 'loaded') return current;
      const hasMovie = current.movies.some((movie) => movie.id === movieId);
      if (!hasMovie) {
        handledDeckMovieIds.current.delete(movieId);
        return current;
      }

      return {
        ...current,
        movies: current.movies.filter((movie) => movie.id !== movieId),
        reviewed: current.reviewed + 1,
      };
    });
    setCatalogSearch((current) =>
      current.status === 'loaded'
        ? { ...current, movies: current.movies.filter((movie) => movie.id !== movieId) }
        : current,
    );
  }, []);

  const lockAnswerBriefly = useCallback(() => {
    if (answerLocked.current) return false;

    answerLocked.current = true;
    setIsSubmittingAnswer(true);

    if (answerUnlockTimer.current) {
      window.clearTimeout(answerUnlockTimer.current);
    }

    answerUnlockTimer.current = window.setTimeout(() => {
      answerLocked.current = false;
      setIsSubmittingAnswer(false);
      answerUnlockTimer.current = null;
    }, ANSWER_LOCK_MS);

    return true;
  }, []);

  const answerDeckMovie = useCallback(
    (movieId: number, kind: UserMovieInteractionKind) => {
      if (!lockAnswerBriefly()) return;
      saveDeckMovieMemory(movieId, kind);
    },
    [lockAnswerBriefly, saveDeckMovieMemory],
  );

  const skipActiveDeckMovie = useCallback(
    (movieId: number) => {
      if (!lockAnswerBriefly()) return;
      skipDeckMovie(movieId);
    },
    [lockAnswerBriefly, skipDeckMovie],
  );

  useEffect(() => {
    if (auth.status !== 'authenticated' || candidates.status !== 'loaded') return;
    const activeDeckMovie = candidates.movies[0];
    if (!activeDeckMovie) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isEditableKeyboardTarget(event.target)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        answerDeckMovie(activeDeckMovie.id, 'not_seen');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        answerDeckMovie(activeDeckMovie.id, 'watched');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        skipActiveDeckMovie(activeDeckMovie.id);
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
    const query = catalogQuery.trim();
    if (query.length < 2) return;

    setCatalogSearch({ status: 'loading' });

    try {
      const response = await fetch(`/api/account/movie-memory?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('Failed to search movie catalog');
      }

      const data = (await response.json()) as { movies?: MovieMemoryCandidate[] };
      setCatalogSearch({
        status: 'loaded',
        movies: Array.isArray(data.movies) ? data.movies : [],
      });
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

  const activeMovie = candidates.status === 'loaded' ? candidates.movies[0] : null;
  const shouldShowManualSearch =
    isManualSearchOpen ||
    (candidates.status === 'loaded' && (candidates.total === 0 || candidates.movies.length === 0));

  return (
    <MovieMemoryShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <Link
          href="/account"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--pc-t2)' }}
        >
          <ArrowLeft size={16} />
          {a.backToAccount}
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
              {a.memoryTrainerBadge}
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
              {a.memoryTrainerTitle}
            </h1>
          </div>
          <p className="max-w-xl text-sm sm:text-right" style={{ color: 'var(--pc-t2)' }}>
            {a.memoryTrainerBody}
          </p>
        </div>

        <section className="mx-auto max-w-4xl">
          {candidates.status === 'loading' ? (
            <LoadingState label={a.loading} compact />
          ) : candidates.status === 'error' ? (
            <ErrorPanel
              message={a.candidateLoadError}
              retryLabel={a.candidateRetry}
              onRetry={loadCandidates}
            />
          ) : activeMovie ? (
            <div className="space-y-4">
              <MovieTrainingCard
                movie={activeMovie}
                locale={locale}
                labels={a}
                counter={a.memoryDeckCounter
                  .replace('{current}', String(candidates.reviewed + 1))
                  .replace('{total}', String(candidates.total))}
                progressPercent={((candidates.reviewed + 1) / Math.max(candidates.total, 1)) * 100}
              />
              <MovieTrainingControls
                movie={activeMovie}
                labels={a}
                action={action}
                isSubmitting={isSubmittingAnswer}
                onSave={answerDeckMovie}
                onSkip={skipActiveDeckMovie}
              />
            </div>
          ) : (
            <CompletionPanel
              labels={a}
              onLoadMore={loadCandidates}
              variant={
                candidates.status === 'loaded' && candidates.total === 0 ? 'empty' : 'complete'
              }
            />
          )}

          {action.status === 'error' ? (
            <div
              className="mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm"
              style={{
                background: `${palette.red}14`,
                border: `1px solid ${palette.red}35`,
                color: 'var(--pc-t2)',
              }}
            >
              <AlertCircle size={18} style={{ color: palette.red }} />
              <span>{a.candidateLoadError}</span>
            </div>
          ) : null}
        </section>

        {shouldShowManualSearch ? (
          <ManualSearchPanel
            query={catalogQuery}
            search={catalogSearch}
            labels={a}
            locale={locale}
            action={action}
            isOpen={isManualSearchOpen}
            onToggle={() => setIsManualSearchOpen((current) => !current)}
            onQueryChange={setCatalogQuery}
            onSearch={handleCatalogSearch}
            onSave={saveMovieMemory}
          />
        ) : null}
      </motion.section>
    </MovieMemoryShell>
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

function CompletionPanel({
  labels,
  onLoadMore,
  variant,
}: {
  labels: ReturnType<typeof useLanguage>['t']['account'];
  onLoadMore: () => void;
  variant: 'complete' | 'empty';
}) {
  const isEmpty = variant === 'empty';
  const Icon = isEmpty ? Film : Check;

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-3xl p-8 text-center"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{
          background: isEmpty ? 'var(--pc-surface-hover)' : 'var(--pc-gold-subtle)',
          border: isEmpty ? '1px solid var(--pc-bd2)' : '1px solid var(--pc-gold-bd)',
          color: isEmpty ? 'var(--pc-t2)' : 'var(--pc-gold-text)',
        }}
      >
        <Icon size={30} />
      </div>
      <div>
        <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {isEmpty ? labels.memoryDeckEmptyTitle : labels.memoryDeckCompleteTitle}
        </h2>
        <p>{isEmpty ? labels.memoryDeckEmptyBody : labels.memoryDeckCompleteBody}</p>
      </div>
      <button
        type="button"
        onClick={onLoadMore}
        className="rounded-xl px-5 py-3 text-sm font-semibold"
        style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
      >
        {isEmpty ? labels.memoryDeckEmptyAction : labels.loadMoreMovies}
      </button>
    </div>
  );
}

function MovieTrainingCard({
  movie,
  labels,
  locale,
  counter,
  progressPercent,
}: {
  movie: MovieMemoryCandidate;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  counter: string;
  progressPercent: number;
}) {
  const title = getMovieTitle(movie, locale);
  const summary = getMovieSummary(movie, locale);
  const duration = formatDuration(movie.duration, locale);
  const originalTitle =
    locale !== 'en' && movie.localizedName && movie.localizedName !== movie.movieName
      ? movie.movieName
      : null;

  return (
    <motion.article
      key={movie.id}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      className="overflow-hidden rounded-[1.75rem]"
      style={{
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--pc-surface) 92%, var(--pc-gold) 8%), var(--pc-surface))',
        border: '1px solid var(--pc-bd2)',
        boxShadow: 'var(--pc-card-shadow)',
      }}
    >
      <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-[minmax(220px,320px)_1fr] md:items-stretch md:p-6">
        <PosterFrame
          key={`${movie.id}:${movie.posterURL ?? 'missing'}`}
          movie={movie}
          title={title}
          labels={labels}
        />

        <div className="flex min-w-0 flex-col justify-between gap-6 py-1 md:py-2">
          <div
            className="p-1"
            style={{
              color: 'var(--pc-t2)',
            }}
          >
            <div className="mb-2 flex items-center gap-3">
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: 'var(--pc-gold-subtle)',
                  border: '1px solid var(--pc-gold-bd)',
                  color: 'var(--pc-gold-text)',
                }}
              >
                {counter}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ background: 'var(--pc-ghost)' }}
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${progressPercent}%`, background: 'var(--pc-progress)' }}
              />
            </div>
          </div>

          <div>
            <h2
              className="text-3xl font-semibold leading-tight md:text-5xl"
              style={{ color: 'var(--pc-t1)' }}
            >
              {formatMovieName(title, movie.movieYear)}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium">
              {duration ? (
                <span
                  className="rounded-full px-3 py-1"
                  style={{ background: 'var(--pc-ghost)', color: 'var(--pc-t2)' }}
                >
                  {duration}
                </span>
              ) : null}
              {originalTitle ? (
                <span className="min-w-0 truncate" style={{ color: 'var(--pc-t3)' }}>
                  {originalTitle}
                </span>
              ) : null}
            </div>
            {summary ? (
              <p className="mt-5 max-w-[62ch] text-sm leading-6" style={{ color: 'var(--pc-t2)' }}>
                {summary}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function MovieTrainingControls({
  movie,
  labels,
  action,
  isSubmitting,
  onSave,
  onSkip,
}: {
  movie: MovieMemoryCandidate;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  action: ActionState;
  isSubmitting: boolean;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
  onSkip: (movieId: number) => void;
}) {
  const savingSeen =
    action.status === 'saving' && action.movieId === movie.id && action.kind === 'watched';
  const savingUnseen =
    action.status === 'saving' && action.movieId === movie.id && action.kind === 'not_seen';
  const isSaving = action.status === 'saving' || isSubmitting;

  return (
    <motion.div
      key={`${movie.id}-controls`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-4"
      style={{
        background: 'var(--pc-bg)',
        border: '1px solid var(--pc-bd1)',
      }}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--pc-t2)' }}>
          {labels.memoryCardQuestion}
        </p>
        <p className="text-xs" style={{ color: 'var(--pc-t3)' }}>
          {labels.memoryKeyboardHint}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSave(movie.id, 'not_seen')}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[var(--pc-surface-hover)] active:translate-y-0 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{
            background: 'var(--pc-surface)',
            border: '1px solid var(--pc-bd3)',
            color: 'var(--pc-t1)',
          }}
        >
          {savingUnseen ? <Loader2 className="animate-spin" size={18} /> : <X size={18} />}
          &larr; {labels.notSeenMovie}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => onSave(movie.id, 'watched')}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{
            background: 'var(--pc-cta)',
            border: '1px solid var(--pc-gold-bd)',
            color: 'var(--pc-cta-text)',
          }}
        >
          {savingSeen ? <Loader2 className="animate-spin" size={18} /> : <Eye size={18} />}
          {labels.seenMovie} &rarr;
        </button>
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => onSkip(movie.id)}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-transparent px-5 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[var(--pc-bd3)] hover:bg-[var(--pc-surface-hover)] hover:text-[var(--pc-t1)] active:translate-y-0 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t2)',
        }}
      >
        &darr; {labels.skipMovie}
      </button>
    </motion.div>
  );
}

function PosterFrame({
  movie,
  title,
  labels,
}: {
  movie: MovieMemoryCandidate;
  title: string;
  labels: ReturnType<typeof useLanguage>['t']['account'];
}) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'failed'>(() =>
    movie.posterURL ? 'loading' : 'failed',
  );
  const shouldShowPoster = movie.posterURL && imageState !== 'failed';

  return (
    <div
      className="relative mx-auto aspect-[2/3] w-full max-w-[320px] overflow-hidden rounded-[1.25rem] md:max-w-none"
      style={{
        background: 'var(--pc-surface-deep)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: '0 18px 42px rgba(9,9,15,0.16)',
      }}
    >
      {shouldShowPoster ? (
        <>
          {imageState === 'loading' ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 animate-pulse"
              style={{
                background:
                  'linear-gradient(110deg, var(--pc-surface-deep), var(--pc-surface-hover), var(--pc-surface-deep))',
              }}
            />
          ) : null}
          <Image
            src={movie.posterURL as string}
            alt={title}
            fill
            priority
            sizes="(min-width: 768px) 320px, min(320px, 100vw)"
            className={`object-contain transition-opacity duration-200 ${
              imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageState('loaded')}
            onError={() => setImageState('failed')}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
          style={{
            background: 'linear-gradient(160deg, var(--pc-surface-hover), var(--pc-surface-deep))',
          }}
        >
          <Film size={58} style={{ color: 'var(--pc-t3)' }} />
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--pc-t1)' }}>
              {formatMovieName(title, movie.movieYear)}
            </p>
            <p
              className="mt-2 text-xs font-medium uppercase tracking-[0.12em]"
              style={{ color: 'var(--pc-t3)' }}
            >
              {labels.posterUnavailable}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualSearchPanel({
  query,
  search,
  labels,
  locale,
  action,
  isOpen,
  onToggle,
  onQueryChange,
  onSearch,
  onSave,
}: {
  query: string;
  search: CatalogSearchState;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: ActionState;
  isOpen: boolean;
  onToggle: () => void;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  const searchInputId = useId();

  return (
    <section className="mx-auto mt-8 max-w-3xl">
      <button
        type="button"
        onClick={onToggle}
        className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-transparent transition hover:-translate-y-0.5 hover:bg-[var(--pc-ghost)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
        style={{
          border: '1px solid var(--pc-bd1)',
          color: 'var(--pc-t3)',
        }}
        aria-expanded={isOpen}
        aria-label={labels.manualSearchTitle}
        title={labels.manualSearchTitle}
      >
        <Search size={18} />
        <ChevronDown
          size={14}
          className={`absolute translate-x-3 translate-y-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <div className="mb-4 text-center">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
              {labels.manualSearchTitle}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--pc-t2)' }}>
              {labels.manualSearchBody}
            </p>
          </div>

          <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor={searchInputId} className="sr-only">
              {labels.searchMovieMemory}
            </label>
            <div
              className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl px-4"
              style={{ background: 'var(--pc-bg)', border: '1px solid var(--pc-bd2)' }}
            >
              <Search size={20} style={{ color: 'var(--pc-t2)' }} />
              <input
                id={searchInputId}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={labels.catalogSearchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-base outline-none"
                style={{ color: 'var(--pc-t1)' }}
              />
            </div>
            <button
              type="submit"
              disabled={query.trim().length < 2 || search.status === 'loading'}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl px-6 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)] disabled:opacity-60"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {search.status === 'loading' ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                labels.searchCatalog
              )}
            </button>
          </form>

          <div className="mt-4 grid gap-3">
            {search.status === 'error' ? (
              <div
                className="rounded-2xl p-4 text-sm"
                style={{ background: `${palette.red}14`, color: 'var(--pc-t2)' }}
              >
                {labels.catalogSearchError}
              </div>
            ) : null}
            {search.status === 'loaded' && search.movies.length === 0 ? (
              <div
                className="rounded-2xl p-4 text-sm"
                style={{ background: 'var(--pc-surface)', color: 'var(--pc-t2)' }}
              >
                {labels.catalogSearchEmpty}
              </div>
            ) : null}
            {search.status === 'loaded'
              ? search.movies.map((movie) => (
                  <MovieSearchResultRow
                    key={movie.id}
                    movie={movie}
                    labels={labels}
                    locale={locale}
                    action={action}
                    onSave={onSave}
                  />
                ))
              : null}
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}

function MovieSearchResultRow({
  movie,
  labels,
  locale,
  action,
  onSave,
}: {
  movie: MovieMemoryCandidate;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: ActionState;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  const title = getMovieTitle(movie, locale);
  const saving = action.status === 'saving' && action.movieId === movie.id;

  return (
    <div
      className="flex items-center gap-4 rounded-2xl p-3"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      {movie.posterURL ? (
        <Image
          src={movie.posterURL}
          alt={title}
          width={56}
          height={80}
          sizes="56px"
          className="h-20 w-14 rounded-xl object-cover"
        />
      ) : (
        <div
          className="flex h-20 w-14 items-center justify-center rounded-xl"
          style={{ background: 'var(--pc-ghost)', color: 'var(--pc-t3)' }}
        >
          <Film size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {formatMovieName(title, movie.movieYear)}
        </p>
        {movie.localizedName && movie.localizedName !== movie.movieName ? (
          <p className="truncate text-sm" style={{ color: 'var(--pc-t2)' }}>
            {movie.movieName}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(movie.id, 'watched')}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
      >
        {saving ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
        {labels.seenMovie}
      </button>
    </div>
  );
}

function getMovieTitle(movie: MovieMemoryCandidate, locale: string): string {
  if (locale !== 'en' && movie.localizedName) return movie.localizedName;
  return movie.movieName;
}

function getMovieSummary(movie: MovieMemoryCandidate, locale: string): string | null {
  const summary =
    locale !== 'en' ? movie.localizedOverview || movie.description : movie.description;
  const trimmed = summary?.trim();
  if (!trimmed) return null;
  return trimmed.length > 260 ? `${trimmed.slice(0, 257).trimEnd()}...` : trimmed;
}

function formatMovieName(name: string, year: number | null): string {
  return year ? `${name} (${year})` : name;
}

function formatDuration(duration: number | null, locale: string): string | null {
  if (!duration || duration <= 0) return null;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  if (hours === 0) return locale === 'ru' ? `${minutes} мин` : `${minutes} min`;

  if (locale === 'ru') {
    return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }

  if (locale === 'fi') {
    return minutes ? `${hours} t ${minutes} min` : `${hours} t`;
  }

  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
