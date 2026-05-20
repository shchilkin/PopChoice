'use client';

import {
  AlertCircle,
  ArrowRight,
  Ban,
  Clapperboard,
  Eye,
  Film,
  Frown,
  Heart,
  Search,
  Sparkles,
  Trash2,
  X,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';
import { getCsrfToken } from '@/lib/csrfClient';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';
import { palette } from '@/styles/designTokens';

type RecommendationFeedbackKind =
  | 'useful'
  | 'already_watched'
  | 'wrong_mood'
  | 'too_obvious'
  | 'too_obscure'
  | 'close';

type RecommendationSummary = {
  slug: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: string;
  createdAt: string;
  completedAt: string | null;
  peopleCount: number;
  movieName: string | null;
  movieYear: number | null;
  posterURL: string | null;
  feedbackKind: RecommendationFeedbackKind | null;
};

type UserMovieInteractionKind = 'watched' | 'liked' | 'not_interested' | 'wrong_mood' | 'not_seen';

type MovieMemorySummary = {
  movieKey: string;
  tmdbId: number | null;
  movieName: string;
  movieYear: number | null;
  posterURL: string | null;
  localizedName: string | null;
  kind: UserMovieInteractionKind;
  updatedAt: string;
};

type AccountResponse = {
  user: { email: string };
  recommendations: RecommendationSummary[];
  movieMemory: MovieMemorySummary[];
};

type PosterLookupResult = {
  id: number;
  posterURL: string | null;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loaded'; data: AccountResponse }
  | { status: 'error' };

type MemoryActionState =
  | { status: 'forgetting'; movieKey: string }
  | { status: 'error'; movieKey: string }
  | null;

type RecommendationFilter =
  | 'all'
  | 'rated'
  | 'useful'
  | 'already_watched'
  | 'wrong_mood'
  | 'not_interested';

type MovieMemoryFilter = 'all' | UserMovieInteractionKind;

const ACCOUNT_FETCH_TIMEOUT_MS = 10000;
const RECOMMENDATION_FILTERS: RecommendationFilter[] = [
  'all',
  'rated',
  'useful',
  'already_watched',
  'wrong_mood',
  'not_interested',
];
const MOVIE_MEMORY_FILTERS: MovieMemoryFilter[] = [
  'all',
  'watched',
  'liked',
  'not_seen',
  'not_interested',
  'wrong_mood',
];

export default function AccountPage() {
  const { auth } = useAuth();
  const { locale, t } = useLanguage();
  const a = t.account;
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [memoryAction, setMemoryAction] = useState<MemoryActionState>(null);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>('all');
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryFilter, setMemoryFilter] = useState<MovieMemoryFilter>('all');
  const requestedMemoryPosters = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ACCOUNT_FETCH_TIMEOUT_MS);

    async function loadAccount() {
      try {
        const response = await fetch('/api/account', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to load account');
        }

        const data = (await response.json()) as AccountResponse;
        if (!cancelled) {
          setState({
            status: 'loaded',
            data: {
              ...data,
              movieMemory: Array.isArray(data.movieMemory) ? data.movieMemory : [],
            },
          });
        }
      } catch {
        if (!cancelled || timedOut) {
          setState({ status: 'error' });
        }
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
  }, [auth.status]);

  useEffect(() => {
    if (state.status !== 'loaded') return;

    const missingPosterItems = state.data.movieMemory
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.posterURL && !requestedMemoryPosters.current.has(item.movieKey));

    if (missingPosterItems.length === 0) return;

    for (const { item } of missingPosterItems) {
      requestedMemoryPosters.current.add(item.movieKey);
    }

    let cancelled = false;

    async function loadMemoryPosters() {
      try {
        const response = await fetch('/api/movie-posters', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            movies: missingPosterItems.map(({ item, index }) => ({
              id: index,
              name: item.movieName,
              year: item.movieYear ?? undefined,
              tmdbId: item.tmdbId ?? undefined,
            })),
          }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as { results?: PosterLookupResult[] };
        const postersByIndex = new Map(
          (Array.isArray(data.results) ? data.results : [])
            .filter((result) => result.posterURL)
            .map((result) => [result.id, result.posterURL as string]),
        );

        if (cancelled || postersByIndex.size === 0) return;

        setState((current) => {
          if (current.status !== 'loaded') return current;

          let changed = false;
          const movieMemory = current.data.movieMemory.map((item, index) => {
            const posterURL = postersByIndex.get(index);
            if (item.posterURL || !posterURL) return item;

            changed = true;
            return { ...item, posterURL };
          });

          return changed
            ? {
                status: 'loaded',
                data: {
                  ...current.data,
                  movieMemory,
                },
              }
            : current;
        });
      } catch {
        // Missing posters should not make the account page fail to load.
      }
    }

    void loadMemoryPosters();

    return () => {
      cancelled = true;
    };
  }, [state]);

  if (auth.status === 'unknown' || (auth.status === 'authenticated' && state.status === 'idle')) {
    return (
      <AccountShell>
        <AccountLoadingState label={a.loading} />
      </AccountShell>
    );
  }

  if (auth.status !== 'authenticated') {
    return (
      <AccountShell>
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
          >
            <UserRound size={26} />
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
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {t.nav.logIn}
            </Link>
            <Link
              href="/register"
              className="rounded-xl px-5 py-3 text-sm font-semibold"
              style={{
                background: 'var(--pc-ghost)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              {t.nav.signUp}
            </Link>
          </div>
        </motion.section>
      </AccountShell>
    );
  }

  if (state.status === 'error') {
    return (
      <AccountShell>
        <div
          className="mx-auto flex max-w-xl items-start gap-4 rounded-2xl p-5"
          style={{
            background: `${palette.red}14`,
            border: `1px solid ${palette.red}35`,
            color: 'var(--pc-t2)',
          }}
        >
          <AlertCircle size={22} style={{ color: palette.red }} />
          <div>
            <h1 className="mb-1 font-semibold" style={{ color: 'var(--pc-t1)' }}>
              {a.errorTitle}
            </h1>
            <p>{a.errorBody}</p>
          </div>
        </div>
      </AccountShell>
    );
  }

  if (state.status !== 'loaded') {
    return null;
  }

  async function handleForgetMovie(movieKey: string) {
    setMemoryAction({ status: 'forgetting', movieKey });

    try {
      const response = await fetch('/api/account/movie-memory', {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ movieKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to forget movie memory');
      }

      setState((current) =>
        current.status === 'loaded'
          ? {
              status: 'loaded',
              data: {
                ...current.data,
                movieMemory: current.data.movieMemory.filter((item) => item.movieKey !== movieKey),
              },
            }
          : current,
      );
      setMemoryAction(null);
    } catch {
      setMemoryAction({ status: 'error', movieKey });
    }
  }

  const { user, recommendations, movieMemory } = state.data;
  const filteredRecommendations = filterRecommendations(
    recommendations,
    recommendationQuery,
    recommendationFilter,
    a,
  );
  const filteredMovieMemory = filterMovieMemory(movieMemory, memoryQuery, memoryFilter, a);
  const recommendationFiltersActive =
    isSearchActive(recommendationQuery) || recommendationFilter !== 'all';
  const memoryFiltersActive = isSearchActive(memoryQuery) || memoryFilter !== 'all';

  return (
    <AccountShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="max-w-3xl">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
              style={{
                background: 'var(--pc-gold-subtle)',
                border: '1px solid var(--pc-gold-bd)',
                color: 'var(--pc-gold-text)',
              }}
            >
              <UserRound size={14} />
              {a.badge}
            </div>
            <h1
              className="uppercase"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                fontSize: 'clamp(2.4rem, 8vw, 4.6rem)',
                fontWeight: 600,
                lineHeight: 0.95,
                color: 'var(--pc-t1)',
              }}
            >
              {a.title}
            </h1>
            <p className="mt-4 text-lg" style={{ color: 'var(--pc-t2)' }}>
              {user.email}
            </p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/quiz"
              onClick={(event) => {
                event.preventDefault();
                navigateToFreshQuiz();
              }}
              className="rounded-xl px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
            >
              {a.newRecommendation}
            </Link>
            <Link
              href="/delete-account"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
              style={{
                background: 'var(--pc-ghost)',
                border: '1px solid var(--pc-bd2)',
                color: 'var(--pc-t2)',
              }}
            >
              <Trash2 size={15} />
              {a.deleteAccount}
            </Link>
          </div>
        </div>

        <section className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Sparkles size={18} style={{ color: 'var(--pc-gold-text)' }} />
            <h2
              className="uppercase"
              style={{
                fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
                letterSpacing: '0.12em',
                color: 'var(--pc-gold-text)',
              }}
            >
              {a.savedTitle}
            </h2>
          </div>

          {recommendations.length === 0 ? (
            <div
              className="mx-auto rounded-2xl px-6 py-10 text-center md:px-10 md:py-12"
              style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
            >
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
              >
                <Clapperboard size={32} />
              </div>
              <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--pc-t1)' }}>
                {a.emptyTitle}
              </h3>
              <p className="mx-auto max-w-md" style={{ color: 'var(--pc-t2)' }}>
                {a.emptyBody}
              </p>
            </div>
          ) : (
            <>
              <AccountFilterControls
                searchLabel={a.searchRecommendations}
                searchValue={recommendationQuery}
                onSearchChange={setRecommendationQuery}
                selectedFilter={recommendationFilter}
                onFilterChange={(value) => setRecommendationFilter(value as RecommendationFilter)}
                filters={RECOMMENDATION_FILTERS.map((filter) => ({
                  value: filter,
                  label: a.recommendationFilters[filter],
                }))}
                visibleCount={filteredRecommendations.length}
                totalCount={recommendations.length}
                countLabel={a.showingCount}
                clearLabel={a.clearFilters}
                clearSearchLabel={a.clearSearch}
                hasActiveFilters={recommendationFiltersActive}
                onClear={() => {
                  setRecommendationQuery('');
                  setRecommendationFilter('all');
                }}
              />

              {filteredRecommendations.length === 0 ? (
                <FilteredEmptyState
                  title={a.noFilteredRecommendationsTitle}
                  body={a.noFilteredRecommendationsBody}
                />
              ) : (
                <div className="grid gap-3">
                  {filteredRecommendations.map((recommendation) => (
                    <RecommendationRow
                      key={recommendation.slug}
                      recommendation={recommendation}
                      locale={locale}
                      labels={a}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <MovieMemorySection
          items={movieMemory}
          visibleItems={filteredMovieMemory}
          labels={a}
          locale={locale}
          action={memoryAction}
          searchValue={memoryQuery}
          selectedFilter={memoryFilter}
          hasActiveFilters={memoryFiltersActive}
          onSearchChange={setMemoryQuery}
          onFilterChange={(value) => setMemoryFilter(value as MovieMemoryFilter)}
          onClearFilters={() => {
            setMemoryQuery('');
            setMemoryFilter('all');
          }}
          onForget={handleForgetMovie}
        />
      </motion.section>
    </AccountShell>
  );
}

function AccountShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8 md:py-16">{children}</div>;
}

function AccountLoadingState({ label }: { label: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
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
        <Clapperboard size={30} />
      </motion.div>

      <p className="text-lg font-medium" style={{ color: 'var(--pc-t1)' }}>
        {label}
      </p>

      <div className="mt-8 grid w-full gap-3" aria-hidden="true">
        {[0, 1].map((index) => (
          <motion.div
            key={index}
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
            animate={{ opacity: [0.42, 0.72, 0.42] }}
            transition={{ duration: 1.6, delay: index * 0.18, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="h-16 w-12 rounded-xl" style={{ background: 'var(--pc-gold-subtle)' }} />
            <div className="flex flex-1 flex-col gap-3">
              <div className="h-3 w-24 rounded-full" style={{ background: 'var(--pc-bd2)' }} />
              <div className="h-4 w-3/4 rounded-full" style={{ background: 'var(--pc-bd2)' }} />
              <div className="h-3 w-1/2 rounded-full" style={{ background: 'var(--pc-bd1)' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AccountFilterControls({
  searchLabel,
  searchValue,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  filters,
  visibleCount,
  totalCount,
  countLabel,
  clearLabel,
  clearSearchLabel,
  hasActiveFilters,
  onClear,
}: {
  searchLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedFilter: string;
  onFilterChange: (value: string) => void;
  filters: Array<{ value: string; label: string }>;
  visibleCount: number;
  totalCount: number;
  countLabel: string;
  clearLabel: string;
  clearSearchLabel: string;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  const searchId = useId();

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="relative min-w-0">
        <label className="sr-only" htmlFor={searchId}>
          {searchLabel}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          size={17}
          style={{ color: 'var(--pc-t3)' }}
        />
        <input
          id={searchId}
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder={searchLabel}
          className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-10 text-sm outline-none transition-colors focus:border-[var(--pc-gold-bd)]"
          style={{
            borderColor: 'var(--pc-bd2)',
            color: 'var(--pc-t1)',
          }}
        />
        {searchValue ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg"
            style={{ color: 'var(--pc-t3)' }}
            aria-label={clearSearchLabel}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className="text-xs" style={{ color: 'var(--pc-t4)' }}>
          {countLabel
            .replace('{visible}', String(visibleCount))
            .replace('{total}', String(totalCount))}
        </span>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: 'var(--pc-ghost)',
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
          >
            {clearLabel}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 md:col-span-2" role="group" aria-label={searchLabel}>
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              aria-pressed={isSelected}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: isSelected ? 'var(--pc-gold-subtle)' : 'var(--pc-ghost)',
                border: isSelected ? '1px solid var(--pc-gold-bd)' : '1px solid var(--pc-bd2)',
                color: isSelected ? 'var(--pc-gold-text)' : 'var(--pc-t3)',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilteredEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-2xl px-6 py-8 text-center"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <h3 className="mb-2 text-base font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {title}
      </h3>
      <p className="mx-auto max-w-md text-sm" style={{ color: 'var(--pc-t2)' }}>
        {body}
      </p>
    </div>
  );
}

function RecommendationRow({
  recommendation,
  locale,
  labels,
}: {
  recommendation: RecommendationSummary;
  locale: string;
  labels: ReturnType<typeof useLanguage>['t']['account'];
}) {
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(recommendation.createdAt));
  const title =
    recommendation.movieName ??
    (recommendation.status === 'completed' ? labels.untitledCompleted : labels.pendingTitle);
  const statusLabel = labels.status[recommendation.status] ?? recommendation.status;
  const feedbackLabel = recommendation.feedbackKind
    ? labels.feedback[recommendation.feedbackKind]
    : null;

  return (
    <Link
      href={`/results/${recommendation.slug}`}
      className="grid gap-4 rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 md:grid-cols-[88px_1fr]"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <div
        className="flex aspect-[2/3] w-20 items-center justify-center overflow-hidden rounded-xl md:w-[88px]"
        style={{ background: 'var(--pc-ghost)' }}
      >
        {recommendation.posterURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recommendation.posterURL}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Film size={22} style={{ color: 'var(--pc-t3)' }} />
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: statusBackground(recommendation.status),
              color: statusColor(recommendation.status),
            }}
          >
            {statusLabel}
          </span>
          <span className="text-xs" style={{ color: 'var(--pc-t4)' }}>
            {date}
          </span>
          {feedbackLabel ? (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: 'var(--pc-gold-subtle)',
                border: '1px solid var(--pc-gold-bd)',
                color: 'var(--pc-gold-text)',
              }}
            >
              {labels.feedbackLabel}: {feedbackLabel}
            </span>
          ) : null}
        </div>
        <h3 className="truncate text-lg font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {title}
          {recommendation.movieYear ? ` (${recommendation.movieYear})` : ''}
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--pc-t3)' }}>
          {labels.peopleCount.replace('{count}', String(recommendation.peopleCount))}
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--pc-gold-text)' }}
        >
          {labels.openResult}
          <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  );
}

function MovieMemorySection({
  items,
  visibleItems,
  labels,
  locale,
  action,
  searchValue,
  selectedFilter,
  hasActiveFilters,
  onSearchChange,
  onFilterChange,
  onClearFilters,
  onForget,
}: {
  items: MovieMemorySummary[];
  visibleItems: MovieMemorySummary[];
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: MemoryActionState;
  searchValue: string;
  selectedFilter: MovieMemoryFilter;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onForget: (movieKey: string) => void;
}) {
  return (
    <section className="mx-auto mt-12 max-w-4xl">
      <div className="mb-4 flex items-center justify-center gap-3">
        <Eye size={18} style={{ color: 'var(--pc-gold-text)' }} />
        <h2
          className="uppercase"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            letterSpacing: '0.12em',
            color: 'var(--pc-gold-text)',
          }}
        >
          {labels.memoryTitle}
        </h2>
      </div>
      <p className="mx-auto mb-5 max-w-2xl text-center text-sm" style={{ color: 'var(--pc-t3)' }}>
        {labels.memoryBody}
      </p>

      {action?.status === 'error' ? (
        <div
          className="mb-3 rounded-2xl px-4 py-3 text-sm"
          style={{
            background: `${palette.red}12`,
            border: `1px solid ${palette.red}35`,
            color: palette.red,
          }}
        >
          {labels.memoryForgetError}
        </div>
      ) : null}

      <Link
        href="/account/movie-memory"
        className="mb-5 flex flex-col gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5 md:flex-row md:items-center md:justify-between md:p-5"
        style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
      >
        <span className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--pc-gold-subtle)', color: 'var(--pc-gold-text)' }}
          >
            <Sparkles size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
              {labels.movieMemoryCtaTitle}
            </span>
            <span className="mt-1 block text-sm" style={{ color: 'var(--pc-t3)' }}>
              {labels.movieMemoryCtaBody}
            </span>
          </span>
        </span>
        <span
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
        >
          {labels.updateMovieMemory}
          <ArrowRight size={16} />
        </span>
      </Link>

      {items.length === 0 ? (
        <div
          className="rounded-2xl px-6 py-8 text-center"
          style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
        >
          <h3 className="mb-2 text-base font-semibold" style={{ color: 'var(--pc-t1)' }}>
            {labels.memoryEmptyTitle}
          </h3>
          <p className="mx-auto max-w-md text-sm" style={{ color: 'var(--pc-t2)' }}>
            {labels.memoryEmptyBody}
          </p>
        </div>
      ) : (
        <>
          <AccountFilterControls
            searchLabel={labels.searchMovieMemory}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            selectedFilter={selectedFilter}
            onFilterChange={onFilterChange}
            filters={MOVIE_MEMORY_FILTERS.map((filter) => ({
              value: filter,
              label: labels.memoryFilters[filter],
            }))}
            visibleCount={visibleItems.length}
            totalCount={items.length}
            countLabel={labels.showingCount}
            clearLabel={labels.clearFilters}
            clearSearchLabel={labels.clearSearch}
            hasActiveFilters={hasActiveFilters}
            onClear={onClearFilters}
          />

          {visibleItems.length === 0 ? (
            <FilteredEmptyState
              title={labels.noFilteredMemoryTitle}
              body={labels.noFilteredMemoryBody}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {visibleItems.map((item) => (
                <MovieMemoryCard
                  key={item.movieKey}
                  item={item}
                  labels={labels}
                  locale={locale}
                  isForgetting={
                    action?.status === 'forgetting' && action.movieKey === item.movieKey
                  }
                  onForget={() => onForget(item.movieKey)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function MovieMemoryCard({
  item,
  labels,
  locale,
  isForgetting,
  onForget,
}: {
  item: MovieMemorySummary;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  isForgetting: boolean;
  onForget: () => void;
}) {
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(item.updatedAt));
  const title = item.localizedName ?? item.movieName;

  return (
    <div
      className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-2xl p-3"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <div
        className="flex aspect-[2/3] w-16 items-center justify-center overflow-hidden rounded-xl"
        style={{ background: 'var(--pc-ghost)' }}
      >
        {item.posterURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.posterURL} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Film size={18} style={{ color: 'var(--pc-t3)' }} />
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: 'var(--pc-gold-subtle)',
              border: '1px solid var(--pc-gold-bd)',
              color: 'var(--pc-gold-text)',
            }}
          >
            <MemoryKindIcon kind={item.kind} />
            {labels.memoryKind[item.kind]}
          </span>
          <span className="text-xs" style={{ color: 'var(--pc-t4)' }}>
            {date}
          </span>
        </div>
        <h3 className="truncate text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
          {title}
          {item.movieYear ? ` (${item.movieYear})` : ''}
        </h3>
      </div>

      <button
        type="button"
        onClick={onForget}
        disabled={isForgetting}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl transition-opacity disabled:opacity-60"
        style={{
          background: 'var(--pc-ghost)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t2)',
        }}
        aria-label={labels.forgetMovie}
        title={labels.forgetMovie}
      >
        <X size={17} />
      </button>
    </div>
  );
}

function MemoryKindIcon({ kind }: { kind: UserMovieInteractionKind }) {
  if (kind === 'watched') return <Eye size={12} />;
  if (kind === 'liked') return <Heart size={12} />;
  if (kind === 'not_seen') return <Film size={12} />;
  if (kind === 'wrong_mood') return <Frown size={12} />;
  return <Ban size={12} />;
}

function statusBackground(status: RecommendationSummary['status']) {
  if (status === 'completed') return `${palette.green}18`;
  if (status === 'failed') return `${palette.red}18`;
  return 'var(--pc-gold-subtle)';
}

function statusColor(status: RecommendationSummary['status']) {
  if (status === 'completed') return palette.green;
  if (status === 'failed') return palette.red;
  return 'var(--pc-gold-text)';
}

function filterRecommendations(
  recommendations: RecommendationSummary[],
  query: string,
  filter: RecommendationFilter,
  labels: ReturnType<typeof useLanguage>['t']['account'],
) {
  const normalizedQuery = normalizeSearch(query);
  return recommendations.filter((recommendation) => {
    if (!matchesRecommendationFilter(recommendation, filter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return recommendationSearchText(recommendation, labels).includes(normalizedQuery);
  });
}

function filterMovieMemory(
  items: MovieMemorySummary[],
  query: string,
  filter: MovieMemoryFilter,
  labels: ReturnType<typeof useLanguage>['t']['account'],
) {
  const normalizedQuery = normalizeSearch(query);
  return items.filter((item) => {
    if (filter !== 'all' && item.kind !== filter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return movieMemorySearchText(item, labels).includes(normalizedQuery);
  });
}

function matchesRecommendationFilter(
  recommendation: RecommendationSummary,
  filter: RecommendationFilter,
) {
  if (filter === 'all') return true;
  if (filter === 'rated') return Boolean(recommendation.feedbackKind);
  if (filter === 'not_interested') {
    return (
      recommendation.feedbackKind === 'too_obvious' || recommendation.feedbackKind === 'too_obscure'
    );
  }
  return recommendation.feedbackKind === filter;
}

function recommendationSearchText(
  recommendation: RecommendationSummary,
  labels: ReturnType<typeof useLanguage>['t']['account'],
) {
  return normalizeSearch(
    [
      recommendation.movieName,
      recommendation.movieYear,
      labels.status[recommendation.status],
      recommendation.feedbackKind ? labels.feedback[recommendation.feedbackKind] : null,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function movieMemorySearchText(
  item: MovieMemorySummary,
  labels: ReturnType<typeof useLanguage>['t']['account'],
) {
  return normalizeSearch(
    [item.movieName, item.localizedName, item.movieYear, labels.memoryKind[item.kind]]
      .filter(Boolean)
      .join(' '),
  );
}

function normalizeSearch(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase();
}

function isSearchActive(value: string) {
  return normalizeSearch(value).length > 0;
}
