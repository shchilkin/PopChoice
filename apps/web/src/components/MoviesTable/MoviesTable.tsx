'use client';

import { Clock, SearchX, Star, X } from 'lucide-react';
import Image from 'next/image';
import { z } from 'zod';

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
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl"
          style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
        >
          <div className="aspect-[2/3] animate-pulse" style={{ background: 'var(--pc-bd2)' }} />
          <div className="space-y-2 p-4">
            <div className="h-4 w-4/5 rounded animate-pulse bg-[var(--pc-bd2)]" />
            <div className="h-3 w-1/3 rounded animate-pulse bg-[var(--pc-bd1)]" />
            <div className="flex gap-2 pt-2">
              <div className="h-7 w-16 rounded-full animate-pulse bg-[var(--pc-bd1)]" />
              <div className="h-7 w-20 rounded-full animate-pulse bg-[var(--pc-bd1)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDuration(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

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
  if (movies.length === 0) {
    return (
      <MoviesGridEmptyState hasActiveFilters={hasActiveFilters} onClearFilters={onClearFilters} />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {movies.map((movie) => (
        <MovieDiscoveryCard key={movie.id} movie={movie} />
      ))}
    </div>
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
      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-gold)]"
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

function MoviesGridEmptyState({
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

function getMovieInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

const POSTER_PLACEHOLDER_PALETTES = [
  ['#ff9f1c', '#2a88ff', '#f5c518'],
  ['#f97316', '#14b8a6', '#facc15'],
  ['#ef4444', '#22c55e', '#f59e0b'],
  ['#38bdf8', '#f59e0b', '#fb7185'],
  ['#84cc16', '#0ea5e9', '#f97316'],
  ['#f43f5e', '#06b6d4', '#f5c518'],
] as const;

function getPosterPlaceholderPalette(movie: Movie) {
  const seed = `${movie.name}-${movie.year}`;
  const hash = Array.from(seed).reduce((value, char) => value + char.charCodeAt(0), 0);
  return POSTER_PLACEHOLDER_PALETTES[hash % POSTER_PLACEHOLDER_PALETTES.length];
}

function getSafePosterUrl(movie: Movie): string | null {
  const posterUrl = movie.poster_url?.trim();
  if (!posterUrl) return null;
  if (posterUrl.startsWith('/') || posterUrl.startsWith('https://image.tmdb.org/')) {
    return posterUrl;
  }
  return null;
}

function MoviePosterFallback({ movie }: { movie: Movie }) {
  const [toneA, toneB, toneC] = getPosterPlaceholderPalette(movie);
  const initials = getMovieInitials(movie.name) || '?';
  const backgroundStyle = {
    background: `
      radial-gradient(circle at 24% 18%, ${toneA} 0, transparent 29%),
      radial-gradient(circle at 82% 26%, ${toneB} 0, transparent 33%),
      radial-gradient(circle at 48% 78%, ${toneC} 0, transparent 36%),
      linear-gradient(160deg, #151527, #09090f)
    `,
  };

  return (
    <div className="absolute inset-0" style={backgroundStyle} aria-hidden="true">
      <div className="absolute inset-0 backdrop-blur-[18px] backdrop-saturate-125">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(9, 9, 15, 0.05), rgba(9, 9, 15, 0.72))',
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-18deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 11px)',
          }}
        />
      </div>
      <div
        className="absolute inset-0 grid place-items-center text-5xl font-bold text-white/90 sm:text-6xl"
        style={{
          fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
          textShadow: '0 10px 34px rgba(0, 0, 0, 0.55)',
        }}
      >
        {initials}
      </div>
      <div className="absolute inset-x-6 bottom-8 grid gap-2">
        <span className="h-1.5 rounded-full bg-white/45" />
        <span
          className="h-1.5 w-3/4 rounded-full"
          style={{ background: 'color-mix(in srgb, var(--pc-gold-text) 62%, transparent)' }}
        />
      </div>
    </div>
  );
}

function MoviePoster({ movie }: { movie: Movie }) {
  const posterUrl = getSafePosterUrl(movie);

  return (
    <div
      className="relative aspect-[2/3] overflow-hidden rounded-t-2xl"
      style={{
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--pc-gold-subtle) 72%, transparent), var(--pc-bg))',
      }}
    >
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt=""
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
      ) : (
        <MoviePosterFallback movie={movie} />
      )}
      {movie.score_rating > 0 && (
        <div
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur"
          style={{
            background: 'color-mix(in srgb, var(--pc-bg) 82%, transparent)',
            color: 'var(--pc-gold-text)',
            border: '1px solid var(--pc-bd2)',
          }}
        >
          <Star size={13} fill="currentColor" aria-hidden="true" />
          {movie.score_rating.toFixed(1)}
        </div>
      )}
    </div>
  );
}

function MovieDiscoveryCard({ movie }: { movie: Movie }) {
  const title = movie.localized_name?.trim() || movie.name;
  const secondaryTitle = title === movie.name ? null : movie.name;
  const duration = formatDuration(movie.duration);
  const showAgeRating = movie.age_rating && movie.age_rating !== 'NR';

  return (
    <article
      className="group overflow-hidden rounded-2xl transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ background: 'var(--pc-surface)', border: '1px solid var(--pc-bd2)' }}
    >
      <MoviePoster movie={movie} />
      <div className="p-4">
        <div className="flex min-h-14 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--pc-t1)]">
              {title}
            </h2>
            {secondaryTitle && (
              <p className="mt-1 truncate text-xs text-[var(--pc-t4)]">{secondaryTitle}</p>
            )}
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--pc-t4)]">{movie.year}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {showAgeRating && (
            <AgeRatingChip rating={movie.age_rating as z.infer<typeof ageRatings>} size="sm" />
          )}
          {duration && (
            <span
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold"
              style={{
                background: 'var(--pc-surface-hover)',
                border: '1px solid var(--pc-bd1)',
                color: 'var(--pc-t3)',
              }}
            >
              <Clock size={13} aria-hidden="true" />
              {duration}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
