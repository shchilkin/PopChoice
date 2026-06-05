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
  Loader2,
  Search,
  Sparkles,
  Trash2,
  X,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/i18n';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';
import { palette } from '@/styles/designTokens';

import { useAccountDashboardState } from './accountDashboardState';
import {
  filterMovieMemory,
  filterRecommendations,
  getAccountRenderState,
  isSearchActive,
  shouldLoadMoreMovieMemory,
  type AccountRenderState,
} from './accountViewModel';

import type {
  AccountResponse,
  MemoryActionState,
  MemoryPageState,
  MovieMemoryFilter,
  MovieMemorySummary,
  RecommendationFilter,
  RecommendationSummary,
  UserMovieInteractionKind,
} from './accountTypes';

const MEMORY_ROW_HEIGHT_PX = 142;
const MEMORY_GRID_GAP_PX = 12;
const MEMORY_GRID_OVERSCAN_ROWS = 3;
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
  const { forgetMovie, loadMoreMovieMemory, memoryAction, memoryPageState, state } =
    useAccountDashboardState(auth.status, locale);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>('all');
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryFilter, setMemoryFilter] = useState<MovieMemoryFilter>('all');
  const renderState = getAccountRenderState(auth.status, state.status);

  const renderers: Record<AccountRenderState, () => ReactNode> = {
    empty: () => null,
    error: () => <AccountErrorState labels={a} />,
    loaded: () =>
      state.status === 'loaded' ? (
        <AccountDashboard
          data={state.data}
          labels={a}
          locale={locale}
          memoryAction={memoryAction}
          memoryFilter={memoryFilter}
          memoryPageState={memoryPageState}
          memoryQuery={memoryQuery}
          recommendationFilter={recommendationFilter}
          recommendationQuery={recommendationQuery}
          onClearMemoryFilters={() => {
            setMemoryQuery('');
            setMemoryFilter('all');
          }}
          onClearRecommendationFilters={() => {
            setRecommendationQuery('');
            setRecommendationFilter('all');
          }}
          onForgetMovie={forgetMovie}
          onLoadMoreMovieMemory={loadMoreMovieMemory}
          onMemoryFilterChange={(value) => setMemoryFilter(value as MovieMemoryFilter)}
          onMemoryQueryChange={setMemoryQuery}
          onRecommendationFilterChange={(value) =>
            setRecommendationFilter(value as RecommendationFilter)
          }
          onRecommendationQueryChange={setRecommendationQuery}
        />
      ) : null,
    loading: () => (
      <AccountShell>
        <AccountLoadingState label={a.loading} />
      </AccountShell>
    ),
    'signed-out': () => (
      <SignedOutAccountState labels={a} loginLabel={t.nav.logIn} signUpLabel={t.nav.signUp} />
    ),
  };

  return renderers[renderState]();
}

function AccountDashboard({
  data,
  labels,
  locale,
  memoryAction,
  memoryFilter,
  memoryPageState,
  memoryQuery,
  recommendationFilter,
  recommendationQuery,
  onClearMemoryFilters,
  onClearRecommendationFilters,
  onForgetMovie,
  onLoadMoreMovieMemory,
  onMemoryFilterChange,
  onMemoryQueryChange,
  onRecommendationFilterChange,
  onRecommendationQueryChange,
}: {
  data: AccountResponse;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  memoryAction: MemoryActionState;
  memoryFilter: MovieMemoryFilter;
  memoryPageState: MemoryPageState;
  memoryQuery: string;
  recommendationFilter: RecommendationFilter;
  recommendationQuery: string;
  onClearMemoryFilters: () => void;
  onClearRecommendationFilters: () => void;
  onForgetMovie: (movieKey: string) => void;
  onLoadMoreMovieMemory: () => void;
  onMemoryFilterChange: (value: string) => void;
  onMemoryQueryChange: (value: string) => void;
  onRecommendationFilterChange: (value: string) => void;
  onRecommendationQueryChange: (value: string) => void;
}) {
  const { user, recommendations, movieMemory } = data;
  const filteredRecommendations = filterRecommendations(
    recommendations,
    recommendationQuery,
    recommendationFilter,
    labels,
  );
  const filteredMovieMemory = filterMovieMemory(movieMemory, memoryQuery, memoryFilter, labels);
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
              {labels.badge}
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
              {labels.title}
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
              {labels.newRecommendation}
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
              {labels.deleteAccount}
            </Link>
          </div>
        </div>

        <RecommendationsSection
          recommendations={recommendations}
          visibleRecommendations={filteredRecommendations}
          labels={labels}
          locale={locale}
          searchValue={recommendationQuery}
          selectedFilter={recommendationFilter}
          hasActiveFilters={recommendationFiltersActive}
          onSearchChange={onRecommendationQueryChange}
          onFilterChange={onRecommendationFilterChange}
          onClearFilters={onClearRecommendationFilters}
        />

        <MovieMemorySection
          items={movieMemory}
          visibleItems={filteredMovieMemory}
          totalItems={data.movieMemoryTotal ?? movieMemory.length}
          hasMoreItems={data.movieMemoryNextOffset != null}
          pageState={memoryPageState}
          labels={labels}
          locale={locale}
          action={memoryAction}
          searchValue={memoryQuery}
          selectedFilter={memoryFilter}
          hasActiveFilters={memoryFiltersActive}
          onSearchChange={onMemoryQueryChange}
          onFilterChange={onMemoryFilterChange}
          onClearFilters={onClearMemoryFilters}
          onLoadMore={onLoadMoreMovieMemory}
          onForget={onForgetMovie}
        />
      </motion.section>
    </AccountShell>
  );
}

type RecommendationsResultsProps = {
  recommendations: RecommendationSummary[];
  visibleRecommendations: RecommendationSummary[];
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  searchValue: string;
  selectedFilter: RecommendationFilter;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onClearFilters: () => void;
};

function RecommendationsSection(props: RecommendationsResultsProps) {
  const { labels, recommendations } = props;

  return (
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
          {labels.savedTitle}
        </h2>
      </div>

      {recommendations.length === 0 ? (
        <RecommendationsEmptyState labels={labels} />
      ) : (
        <RecommendationsResults {...props} />
      )}
    </section>
  );
}

function RecommendationsEmptyState({
  labels,
}: {
  labels: ReturnType<typeof useLanguage>['t']['account'];
}) {
  return (
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
        {labels.emptyTitle}
      </h3>
      <p className="mx-auto max-w-md" style={{ color: 'var(--pc-t2)' }}>
        {labels.emptyBody}
      </p>
    </div>
  );
}

function RecommendationsResults({
  recommendations,
  visibleRecommendations,
  labels,
  locale,
  searchValue,
  selectedFilter,
  hasActiveFilters,
  onSearchChange,
  onFilterChange,
  onClearFilters,
}: RecommendationsResultsProps) {
  return (
    <>
      <AccountFilterControls
        searchLabel={labels.searchRecommendations}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        selectedFilter={selectedFilter}
        onFilterChange={onFilterChange}
        filters={RECOMMENDATION_FILTERS.map((filter) => ({
          value: filter,
          label: labels.recommendationFilters[filter],
        }))}
        visibleCount={visibleRecommendations.length}
        totalCount={recommendations.length}
        countLabel={labels.showingCount}
        clearLabel={labels.clearFilters}
        clearSearchLabel={labels.clearSearch}
        hasActiveFilters={hasActiveFilters}
        onClear={onClearFilters}
      />

      <VisibleRecommendations
        recommendations={visibleRecommendations}
        labels={labels}
        locale={locale}
      />
    </>
  );
}

function VisibleRecommendations({
  recommendations,
  labels,
  locale,
}: {
  recommendations: RecommendationSummary[];
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
}) {
  if (recommendations.length === 0) {
    return (
      <FilteredEmptyState
        title={labels.noFilteredRecommendationsTitle}
        body={labels.noFilteredRecommendationsBody}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {recommendations.map((recommendation) => (
        <RecommendationRow
          key={recommendation.slug}
          recommendation={recommendation}
          locale={locale}
          labels={labels}
        />
      ))}
    </div>
  );
}

function SignedOutAccountState({
  labels,
  loginLabel,
  signUpLabel,
}: {
  labels: ReturnType<typeof useLanguage>['t']['account'];
  loginLabel: string;
  signUpLabel: string;
}) {
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
            {labels.signedOutTitle}
          </h1>
          <p style={{ color: 'var(--pc-t2)' }}>{labels.signedOutBody}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-5 py-3 text-sm font-semibold"
            style={{ background: 'var(--pc-cta)', color: 'var(--pc-cta-text)' }}
          >
            {loginLabel}
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
            {signUpLabel}
          </Link>
        </div>
      </motion.section>
    </AccountShell>
  );
}

function AccountErrorState({ labels }: { labels: ReturnType<typeof useLanguage>['t']['account'] }) {
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
            {labels.errorTitle}
          </h1>
          <p>{labels.errorBody}</p>
        </div>
      </div>
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
  const title = getRecommendationTitle(recommendation, labels);

  return (
    <Link
      href={`/results/${recommendation.slug}`}
      className="grid gap-4 rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 md:grid-cols-[88px_1fr]"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <RecommendationPoster posterURL={recommendation.posterURL} />

      <div className="min-w-0">
        <RecommendationMeta date={date} labels={labels} recommendation={recommendation} />
        <RecommendationTitle title={title} year={recommendation.movieYear} />
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

function RecommendationPoster({ posterURL }: { posterURL: string | null }) {
  return (
    <div
      className="flex aspect-[2/3] w-20 items-center justify-center overflow-hidden rounded-xl md:w-[88px]"
      style={{ background: 'var(--pc-ghost)' }}
    >
      {posterURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterURL} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Film size={22} style={{ color: 'var(--pc-t3)' }} />
      )}
    </div>
  );
}

function RecommendationMeta({
  date,
  labels,
  recommendation,
}: {
  date: string;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  recommendation: RecommendationSummary;
}) {
  const statusLabel = labels.status[recommendation.status] ?? recommendation.status;
  const feedbackLabel = recommendation.feedbackKind
    ? labels.feedback[recommendation.feedbackKind]
    : null;

  return (
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
      <RecommendationFeedbackBadge feedbackLabel={feedbackLabel} label={labels.feedbackLabel} />
    </div>
  );
}

function RecommendationFeedbackBadge({
  feedbackLabel,
  label,
}: {
  feedbackLabel: string | null;
  label: string;
}) {
  if (!feedbackLabel) return null;

  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        background: 'var(--pc-gold-subtle)',
        border: '1px solid var(--pc-gold-bd)',
        color: 'var(--pc-gold-text)',
      }}
    >
      {label}: {feedbackLabel}
    </span>
  );
}

function RecommendationTitle({ title, year }: { title: string; year: number | null }) {
  return (
    <h3 className="truncate text-lg font-semibold" style={{ color: 'var(--pc-t1)' }}>
      {title}
      {year ? ` (${year})` : ''}
    </h3>
  );
}

function getRecommendationTitle(
  recommendation: RecommendationSummary,
  labels: ReturnType<typeof useLanguage>['t']['account'],
) {
  if (recommendation.movieName) return recommendation.movieName;
  return recommendation.status === 'completed' ? labels.untitledCompleted : labels.pendingTitle;
}

type MovieMemoryContentProps = {
  items: MovieMemorySummary[];
  visibleItems: MovieMemorySummary[];
  totalItems: number;
  hasMoreItems: boolean;
  pageState: MemoryPageState;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: MemoryActionState;
  searchValue: string;
  selectedFilter: MovieMemoryFilter;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  onForget: (movieKey: string) => void;
};

function MovieMemorySection(props: MovieMemoryContentProps) {
  const { action, labels } = props;

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

      <MovieMemoryActionError action={action} label={labels.memoryForgetError} />

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

      <MovieMemoryContent {...props} />
    </section>
  );
}

function MovieMemoryActionError({ action, label }: { action: MemoryActionState; label: string }) {
  if (action?.status !== 'error') return null;

  return (
    <div
      className="mb-3 rounded-2xl px-4 py-3 text-sm"
      style={{
        background: `${palette.red}12`,
        border: `1px solid ${palette.red}35`,
        color: palette.red,
      }}
    >
      {label}
    </div>
  );
}

function MovieMemoryContent({
  items,
  visibleItems,
  totalItems,
  hasMoreItems,
  pageState,
  labels,
  locale,
  action,
  searchValue,
  selectedFilter,
  hasActiveFilters,
  onSearchChange,
  onFilterChange,
  onClearFilters,
  onLoadMore,
  onForget,
}: MovieMemoryContentProps) {
  if (items.length === 0) return <MovieMemoryEmptyState labels={labels} />;

  return (
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
        totalCount={totalItems}
        countLabel={labels.showingCount}
        clearLabel={labels.clearFilters}
        clearSearchLabel={labels.clearSearch}
        hasActiveFilters={hasActiveFilters}
        onClear={onClearFilters}
      />

      <MovieMemoryResults
        items={items}
        visibleItems={visibleItems}
        totalItems={totalItems}
        hasMoreItems={hasMoreItems}
        pageState={pageState}
        labels={labels}
        locale={locale}
        action={action}
        onLoadMore={onLoadMore}
        onForget={onForget}
      />
    </>
  );
}

function MovieMemoryEmptyState({
  labels,
}: {
  labels: ReturnType<typeof useLanguage>['t']['account'];
}) {
  return (
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
  );
}

function MovieMemoryResults({
  items,
  visibleItems,
  totalItems,
  hasMoreItems,
  pageState,
  labels,
  locale,
  action,
  onLoadMore,
  onForget,
}: {
  items: MovieMemorySummary[];
  visibleItems: MovieMemorySummary[];
  totalItems: number;
  hasMoreItems: boolean;
  pageState: MemoryPageState;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: MemoryActionState;
  onLoadMore: () => void;
  onForget: (movieKey: string) => void;
}) {
  if (visibleItems.length === 0) {
    return (
      <FilteredEmptyState title={labels.noFilteredMemoryTitle} body={labels.noFilteredMemoryBody} />
    );
  }

  return (
    <VirtualMovieMemoryGrid
      items={visibleItems}
      labels={labels}
      locale={locale}
      action={action}
      loadedCount={items.length}
      totalCount={totalItems}
      hasMoreItems={hasMoreItems}
      pageState={pageState}
      onLoadMore={onLoadMore}
      onForget={onForget}
    />
  );
}

function VirtualMovieMemoryGrid({
  items,
  labels,
  locale,
  action,
  loadedCount,
  totalCount,
  hasMoreItems,
  pageState,
  onLoadMore,
  onForget,
}: {
  items: MovieMemorySummary[];
  labels: ReturnType<typeof useLanguage>['t']['account'];
  locale: string;
  action: MemoryActionState;
  loadedCount: number;
  totalCount: number;
  hasMoreItems: boolean;
  pageState: MemoryPageState;
  onLoadMore: () => void;
  onForget: (movieKey: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(2);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(620);
  const isLoadingMore = pageState.status === 'loading';
  const rowCount = Math.ceil(items.length / columns);
  const startRow = Math.max(
    Math.floor(scrollTop / (MEMORY_ROW_HEIGHT_PX + MEMORY_GRID_GAP_PX)) - MEMORY_GRID_OVERSCAN_ROWS,
    0,
  );
  const visibleRowCount =
    Math.ceil(viewportHeight / (MEMORY_ROW_HEIGHT_PX + MEMORY_GRID_GAP_PX)) +
    MEMORY_GRID_OVERSCAN_ROWS * 2;
  const endRow = Math.min(startRow + visibleRowCount, rowCount);
  const virtualRows = useMemo(
    () =>
      Array.from({ length: Math.max(endRow - startRow, 0) }, (_, index) => {
        const rowIndex = startRow + index;
        const startIndex = rowIndex * columns;
        return {
          rowIndex,
          items: items.slice(startIndex, startIndex + columns),
        };
      }),
    [columns, endRow, items, startRow],
  );
  const topSpacer = startRow * (MEMORY_ROW_HEIGHT_PX + MEMORY_GRID_GAP_PX);
  const bottomSpacer = Math.max(rowCount - endRow, 0) * (MEMORY_ROW_HEIGHT_PX + MEMORY_GRID_GAP_PX);

  const updateViewport = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    setViewportHeight(node.clientHeight);
    setScrollTop(node.scrollTop);
    setColumns(window.matchMedia('(min-width: 768px)').matches ? 2 : 1);
  }, []);

  const maybeLoadMore = useCallback(() => {
    if (shouldLoadMoreMovieMemory(scrollerRef.current, hasMoreItems, isLoadingMore, pageState)) {
      onLoadMore();
    }
  }, [hasMoreItems, isLoadingMore, onLoadMore, pageState]);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updateViewport]);

  useEffect(() => {
    maybeLoadMore();
  }, [items.length, maybeLoadMore, viewportHeight]);

  return (
    <div>
      <MovieMemoryGridStatus
        loadedCount={loadedCount}
        totalCount={totalCount}
        pageState={pageState}
        labels={labels}
        onLoadMore={onLoadMore}
      />
      <div
        ref={scrollerRef}
        onScroll={() => {
          updateViewport();
          maybeLoadMore();
        }}
        className="max-h-[72vh] min-h-[360px] overflow-y-auto pr-1"
        aria-label={labels.memoryTitle}
      >
        <div style={{ height: topSpacer }} aria-hidden="true" />
        <div className="grid gap-3">
          {virtualRows.map((row) => (
            <div
              key={row.rowIndex}
              className="grid gap-3 md:grid-cols-2"
              style={{ minHeight: MEMORY_ROW_HEIGHT_PX }}
            >
              {row.items.map((item) => (
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
          ))}
        </div>
        <div style={{ height: bottomSpacer }} aria-hidden="true" />
        <MovieMemoryLoadMoreButton
          hasMoreItems={hasMoreItems}
          isLoadingMore={isLoadingMore}
          labels={labels}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  );
}

function MovieMemoryGridStatus({
  loadedCount,
  totalCount,
  pageState,
  labels,
  onLoadMore,
}: {
  loadedCount: number;
  totalCount: number;
  pageState: MemoryPageState;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  onLoadMore: () => void;
}) {
  return (
    <div
      className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"
      style={{ color: 'var(--pc-t4)' }}
    >
      <span>
        {labels.memoryLoadedCount
          .replace('{loaded}', String(loadedCount))
          .replace('{total}', String(totalCount))}
      </span>
      <MovieMemoryRetryButton
        isVisible={pageState.status === 'error'}
        label={labels.loadMoreMemoryRetry}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}

function MovieMemoryRetryButton({
  isVisible,
  label,
  onLoadMore,
}: {
  isVisible: boolean;
  label: string;
  onLoadMore: () => void;
}) {
  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={onLoadMore}
      className="rounded-full px-3 py-1.5 font-semibold transition hover:bg-[var(--pc-ghost)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
      style={{
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      }}
    >
      {label}
    </button>
  );
}

function MovieMemoryLoadMoreButton({
  hasMoreItems,
  isLoadingMore,
  labels,
  onLoadMore,
}: {
  hasMoreItems: boolean;
  isLoadingMore: boolean;
  labels: ReturnType<typeof useLanguage>['t']['account'];
  onLoadMore: () => void;
}) {
  if (!hasMoreItems) return null;

  return (
    <div className="flex justify-center py-4">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={isLoadingMore}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
        style={{
          background: 'var(--pc-ghost)',
          border: '1px solid var(--pc-bd2)',
          color: 'var(--pc-t2)',
        }}
      >
        <MovieMemoryLoadMoreSpinner isVisible={isLoadingMore} />
        {isLoadingMore ? labels.loadingMoreMemory : labels.loadMoreMemory}
      </button>
    </div>
  );
}

function MovieMemoryLoadMoreSpinner({ isVisible }: { isVisible: boolean }) {
  return isVisible ? <Loader2 className="animate-spin" size={16} /> : null;
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
  const Icon = MEMORY_KIND_ICON_BY_KIND[kind];
  return <Icon size={12} />;
}

const MEMORY_KIND_ICON_BY_KIND = {
  liked: Heart,
  not_interested: Ban,
  not_seen: Film,
  watched: Eye,
  wrong_mood: Frown,
} satisfies Record<UserMovieInteractionKind, typeof Eye>;

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
