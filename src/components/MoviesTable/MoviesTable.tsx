'use client';

import { z } from 'zod';

import { useLanguage } from '@/i18n';
import { ageRatings } from '@/utils/schemas/movieSchemas';

import { AgeRatingChip } from '../AgeRatingChip';

import type { Movie } from '@/app/api/movies/route';

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
}

export function MoviesTable({ movies }: MoviesTableProps) {
  const { t } = useLanguage();
  return (
    <div className="w-full">
      {/* Desktop table view */}
      <div
        className="hidden sm:block w-full overflow-x-auto rounded-2xl"
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
            {movies.map((movie, i) => (
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
                  <span className="text-sm font-semibold" style={{ color: 'var(--pc-gold)' }}>
                    {movie.score_rating.toFixed(1)}
                  </span>
                  <span className="text-xs ml-0.5" style={{ color: 'var(--pc-t4)' }}>
                    /10
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden flex flex-col gap-3">
        {movies.map((movie) => (
          <div
            key={movie.id}
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
              <span className="text-xs font-semibold" style={{ color: 'var(--pc-gold)' }}>
                ★ {movie.score_rating.toFixed(1)}
                <span style={{ color: 'var(--pc-t4)', fontWeight: 400 }}>/10</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
