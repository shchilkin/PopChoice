import { z } from 'zod';

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
  return (
    <div className="w-full overflow-x-auto bg-[var(--card)] rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--muted)]">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              Age Rating
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              Score Rating
            </th>
          </tr>
        </thead>
        <tbody className="bg-[var(--card)] divide-y divide-[var(--border)]">
          {movies.map((movie) => (
            <tr key={movie.id} className="hover:bg-[var(--muted)]">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-[var(--foreground)]">{movie.name}</div>
                <div className="text-sm text-[var(--muted-foreground)]">({movie.year})</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <AgeRatingChip rating={movie.age_rating as z.infer<typeof ageRatings>} size="sm" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">
                {formatDuration(movie.duration)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center">
                  <span className="text-sm text-[var(--foreground)]">
                    {movie.score_rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-[var(--muted-foreground)] ml-1">/10</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
