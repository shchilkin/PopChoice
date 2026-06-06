'use client';

import { SearchX, X } from 'lucide-react';
import { z } from 'zod';

import { useIsMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/i18n';
import { ageRatings } from '@/utils/schemas/movieSchemas';

import { AgeRatingChip } from '../AgeRatingChip';

import type { Movie } from '@/features/movies/catalog';

/**
 * Animated table skeleton shown while movie data is loading or while the
 * responsive breakpoint is being measured.  Marked aria-hidden so screen
 * readers skip the decorative placeholder structure.
 */
export function MoviesTableSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="w-full overflow-x-auto rounded-2xl"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--pc-bd2)' }}>
            {['40%', '12%', '12%', '12%'].map((w, i) => (
              <th key={i} className="px-5 py-3">
                <div
                  className="h-3 rounded animate-pulse"
                  style={{ width: w, background: 'var(--pc-bd2)' }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--pc-bd1)' }}>
              <td className="px-5 py-3.5">
                <div
                  className="h-3.5 rounded animate-pulse mb-1.5"
                  style={{ width: '55%', background: 'var(--pc-bd2)' }}
                />
                <div
                  className="h-2.5 rounded animate-pulse"
                  style={{ width: '20%', background: 'var(--pc-bd1)' }}
                />
              </td>
              {[1, 2, 3].map((j) => (
                <td key={j} className="px-5 py-3.5">
                  <div
                    className="h-3.5 rounded animate-pulse mx-auto"
                    style={{ width: '60%', background: 'var(--pc-bd2)' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Utility function to convert minutes to short hours and minutes format
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  } else if (remainingMinutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}

export interface MoviesTableProps {
  movies: Movie[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

interface MoviesTableEmptyStateProps {
  compact?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

function MoviesTableEmptyState({
  compact = false,
  hasActiveFilters = false,
  onClearFilters,
}: MoviesTableEmptyStateProps) {
  const { t } = useLanguage();
  const copy = getEmptyStateCopy(t, hasActiveFilters);
  const canClearFilters = Boolean(hasActiveFilters && onClearFilters);

  return (
    <div
      className={`mx-auto flex max-w-lg flex-col items-center text-center ${
        compact ? 'px-5 py-10' : 'px-6 py-14'
      }`}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: 'var(--pc-gold-subtle)',
          color: 'var(--pc-gold-text)',
        }}
        aria-hidden="true"
      >
        <SearchX size={22} strokeWidth={1.8} />
      </div>
      <h2 className="text-base font-semibold" style={{ color: 'var(--pc-t1)' }}>
        {copy.title}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6" style={{ color: 'var(--pc-t3)' }}>
        {copy.body}
      </p>
      {canClearFilters && (
        <ClearFiltersButton label={t.moviesPage.clearFilters} onClearFilters={onClearFilters} />
      )}
    </div>
  );
}

export function MoviesTable({
  movies,
  hasActiveFilters = false,
  onClearFilters,
}: MoviesTableProps) {
  const isMobile = useIsMobile();

  // Show the skeleton while the breakpoint is being measured to avoid a brief
  // blank section between the loading skeleton disappearing and the correct
  // layout being rendered.
  if (isMobile === null) return <MoviesTableSkeleton />;

  if (isMobile) {
    return (
      <MobileMoviesTable
        movies={movies}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <DesktopMoviesTable
      movies={movies}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
    />
  );
}

type MoviesPageCopy = ReturnType<typeof useLanguage>['t'];

function getEmptyStateCopy(t: MoviesPageCopy, hasActiveFilters: boolean) {
  return hasActiveFilters
    ? { body: t.moviesPage.emptyFilteredBody, title: t.moviesPage.emptyFilteredTitle }
    : { body: t.moviesPage.emptyCatalogBody, title: t.moviesPage.emptyCatalogTitle };
}

function ClearFiltersButton({
  label,
  onClearFilters,
}: {
  label: string;
  onClearFilters?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClearFilters}
      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-200"
      style={{
        background: 'var(--pc-surface-hover)',
        border: '1px solid var(--pc-bd2)',
        color: 'var(--pc-t2)',
      }}
    >
      <X size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function MobileMoviesTable({ movies, hasActiveFilters, onClearFilters }: MoviesTableProps) {
  if (movies.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <MobileEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={onClearFilters} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {movies.map((movie) => (
        <MobileMovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}

function MobileEmptyState({
  hasActiveFilters,
  onClearFilters,
}: Pick<MoviesTableProps, 'hasActiveFilters' | 'onClearFilters'>) {
  return (
    <div
      className="rounded-2xl"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <MoviesTableEmptyState
        compact
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    </div>
  );
}

function MobileMovieCard({ movie }: { movie: Movie }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--pc-t1)' }}>
            {movie.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--pc-t4)' }}>
            {movie.year}
          </div>
        </div>
        <AgeRatingChip rating={movie.age_rating as z.infer<typeof ageRatings>} size="sm" />
      </div>
      <div className="flex items-center gap-4 mt-2">
        <span className="text-xs" style={{ color: 'var(--pc-t3)' }}>
          {formatDuration(movie.duration)}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--pc-gold-text)' }}>
          ★ {movie.score_rating.toFixed(1)}
          <span style={{ color: 'var(--pc-t4)', fontWeight: 400 }}>/10</span>
        </span>
      </div>
    </div>
  );
}

function DesktopMoviesTable({ movies, hasActiveFilters, onClearFilters }: MoviesTableProps) {
  const { t } = useLanguage();

  return (
    <div
      className="w-full overflow-x-auto rounded-2xl"
      style={{
        background: 'var(--pc-surface)',
        border: '1px solid var(--pc-bd2)',
      }}
    >
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--pc-bd2)' }}>
            <th
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--pc-t4)' }}
            >
              {t.moviesPage.columns.name}
            </th>
            <th
              className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--pc-t4)' }}
            >
              {t.moviesPage.columns.ageRating}
            </th>
            <th
              className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--pc-t4)' }}
            >
              {t.moviesPage.columns.duration}
            </th>
            <th
              className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--pc-t4)' }}
            >
              {t.moviesPage.columns.score}
            </th>
          </tr>
        </thead>
        <tbody>
          {movies.length === 0 ? (
            <DesktopEmptyRow hasActiveFilters={hasActiveFilters} onClearFilters={onClearFilters} />
          ) : (
            movies.map((movie, i) => (
              <tr
                key={movie.id}
                className="transition-colors duration-150 hover:bg-[var(--pc-surface-hover)]"
                style={{
                  borderBottom: i < movies.length - 1 ? '1px solid var(--pc-bd1)' : undefined,
                }}
              >
                <td className="px-5 py-3.5">
                  <div className="text-sm font-medium" style={{ color: 'var(--pc-t1)' }}>
                    {movie.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--pc-t4)' }}>
                    {movie.year}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <AgeRatingChip
                    rating={movie.age_rating as z.infer<typeof ageRatings>}
                    size="sm"
                  />
                </td>
                <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--pc-t2)' }}>
                  {formatDuration(movie.duration)}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="text-sm font-semibold" style={{ color: 'var(--pc-gold-text)' }}>
                    {movie.score_rating.toFixed(1)}
                  </span>
                  <span className="text-xs ml-0.5" style={{ color: 'var(--pc-t4)' }}>
                    /10
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DesktopEmptyRow({
  hasActiveFilters,
  onClearFilters,
}: Pick<MoviesTableProps, 'hasActiveFilters' | 'onClearFilters'>) {
  return (
    <tr>
      <td colSpan={4} className="px-0 py-0">
        <MoviesTableEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
        />
      </td>
    </tr>
  );
}
