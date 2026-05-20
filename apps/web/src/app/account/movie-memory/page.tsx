'use client';

import {
  AlertCircle,
  ArrowLeft,
  Check,
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

const MOVIE_MEMORY_FETCH_TIMEOUT_MS = 10000;

export default function MovieMemoryPage() {
  const { auth } = useAuth();
  const { locale, t } = useLanguage();
  const a = t.account;
  const [candidates, setCandidates] = useState<CandidateState>({ status: 'idle' });
  const [action, setAction] = useState<ActionState>({ status: 'idle' });
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSearch, setCatalogSearch] = useState<CatalogSearchState>({ status: 'idle' });
  const pendingDeckItems = useRef<PendingMovieMemoryItem[]>([]);

  const loadCandidates = useCallback(async () => {
    setCandidates({ status: 'loading' });
    setAction({ status: 'idle' });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), MOVIE_MEMORY_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch('/api/account/movie-memory?mode=candidates', {
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
      setCandidates({ status: 'loaded', movies, reviewed: 0, total: movies.length });
    } catch {
      setCandidates({ status: 'error' });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

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
          body: JSON.stringify({ items }),
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
    [],
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

  function saveDeckMovieMemory(movieId: number, kind: UserMovieInteractionKind) {
    pendingDeckItems.current = [
      ...pendingDeckItems.current.filter((item) => item.movieId !== movieId),
      { movieId, kind },
    ];
    setAction({ status: 'idle' });
    setCandidates((current) => {
      if (current.status !== 'loaded') return current;
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
  }

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
        body: JSON.stringify({ movieId, kind }),
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

  return (
    <MovieMemoryShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <Link
          href="/account"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--pc-t2)' }}
        >
          <ArrowLeft size={16} />
          {a.backToAccount}
        </Link>

        <div className="mb-9 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
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
            className="mx-auto max-w-3xl uppercase"
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontSize: 'clamp(2.4rem, 8vw, 5rem)',
              fontWeight: 600,
              lineHeight: 0.95,
              color: 'var(--pc-t1)',
            }}
          >
            {a.memoryTrainerTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--pc-t2)' }}>
            {a.memoryTrainerBody}
          </p>
        </div>

        <section className="mx-auto max-w-3xl">
          {candidates.status === 'loading' ? (
            <LoadingState label={a.loading} compact />
          ) : candidates.status === 'error' ? (
            <ErrorPanel
              message={a.candidateLoadError}
              retryLabel={a.candidateRetry}
              onRetry={loadCandidates}
            />
          ) : activeMovie ? (
            <MovieTrainingCard
              movie={activeMovie}
              locale={locale}
              labels={a}
              action={action}
              counter={a.memoryDeckCounter
                .replace('{current}', String(candidates.reviewed + 1))
                .replace('{total}', String(candidates.total))}
              onSave={saveDeckMovieMemory}
            />
          ) : (
            <CompletionPanel labels={a} onLoadMore={loadCandidates} />
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

        <ManualSearchPanel
          query={catalogQuery}
          search={catalogSearch}
          labels={a}
          locale={locale}
          action={action}
          onQueryChange={setCatalogQuery}
          onSearch={handleCatalogSearch}
          onSave={saveMovieMemory}
        />
      </motion.section>
    </MovieMemoryShell>
  );
}

function MovieMemoryShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-16">{children}</div>;
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
}: {
  labels: ReturnType<typeof useLanguage>['t']['account'];
  onLoadMore: () => void;
}) {
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
        style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
      >
        <Check size={30} />
      </div>
      <div>
        <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {labels.memoryDeckCompleteTitle}
        </h2>
        <p>{labels.memoryDeckCompleteBody}</p>
      </div>
      <button
        type="button"
        onClick={onLoadMore}
        className="rounded-xl px-5 py-3 text-sm font-semibold"
        style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
      >
        {labels.loadMoreMovies}
      </button>
    </div>
  );
}

function MovieTrainingCard({
  movie,
  labels,
  locale,
  action,
  counter,
  onSave,
}: {
  movie: MovieMemoryCandidate;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: ActionState;
  counter: string;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  const title = getMovieTitle(movie, locale);
  const savingSeen =
    action.status === 'saving' && action.movieId === movie.id && action.kind === 'watched';
  const savingUnseen =
    action.status === 'saving' && action.movieId === movie.id && action.kind === 'not_seen';
  const isSaving = action.status === 'saving';

  return (
    <motion.article
      key={movie.id}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      className="overflow-hidden rounded-[2rem]"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
        boxShadow: '0 26px 80px rgba(0,0,0,0.32)',
      }}
    >
      <div className="relative min-h-[520px] overflow-hidden">
        {movie.posterURL ? (
          <Image
            src={movie.posterURL}
            alt={title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(160deg, var(--pc-surface), #090910)' }}
          >
            <Film size={96} style={{ color: 'var(--pc-t3)' }} />
          </div>
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,6,10,0.08), rgba(6,6,10,0.48) 42%, rgba(6,6,10,0.96))',
          }}
        />

        <div
          className="absolute left-5 top-5 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.48)', color: 'var(--pc-t1)' }}
        >
          {counter}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
          <h2 className="mb-2 text-3xl font-semibold" style={{ color: 'var(--pc-t1)' }}>
            {formatMovieName(title, movie.movieYear)}
          </h2>
          <p className="mb-6 text-sm uppercase tracking-[0.14em]" style={{ color: 'var(--pc-t2)' }}>
            {movie.tmdbId ? `TMDB #${movie.tmdbId}` : labels.memoryKind.watched}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSave(movie.id, 'not_seen')}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition disabled:opacity-60"
              style={{
                background: 'rgba(20,20,28,0.86)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t1)',
              }}
            >
              {savingUnseen ? <Loader2 className="animate-spin" size={18} /> : <X size={18} />}
              {labels.notSeenMovie}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSave(movie.id, 'watched')}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition disabled:opacity-60"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {savingSeen ? <Loader2 className="animate-spin" size={18} /> : <Eye size={18} />}
              {labels.seenMovie}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ManualSearchPanel({
  query,
  search,
  labels,
  locale,
  action,
  onQueryChange,
  onSearch,
  onSave,
}: {
  query: string;
  search: CatalogSearchState;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: ActionState;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSave: (movieId: number, kind: UserMovieInteractionKind) => void;
}) {
  const searchInputId = useId();

  return (
    <section className="mx-auto mt-10 max-w-3xl">
      <div className="mb-4 text-center">
        <h2
          className="uppercase"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            letterSpacing: '0.12em',
            color: 'var(--pc-gold-text)',
          }}
        >
          {labels.manualSearchTitle}
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--pc-t2)' }}>
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
          className="inline-flex min-h-14 items-center justify-center rounded-2xl px-6 text-sm font-semibold disabled:opacity-60"
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

function formatMovieName(name: string, year: number | null): string {
  return year ? `${name} (${year})` : name;
}
