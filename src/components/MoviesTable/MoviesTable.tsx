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

// Utility function to get age rating colors
function getAgeRatingColors(rating: string): {
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
} {
  const normalizedRating = rating.toUpperCase().trim();

  switch (normalizedRating) {
    // Mature/Adult content - Red
    case 'R':
    case '15':
    case '16+':
    case '18+':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        darkBg: 'dark:bg-red-900',
        darkText: 'dark:text-red-200',
      };

    // No Rating - Gray
    case 'NR':
    case 'NOT RATED':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        darkBg: 'dark:bg-gray-700',
        darkText: 'dark:text-gray-300',
      };

    // General Audiences - Green
    case 'G':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        darkBg: 'dark:bg-green-900',
        darkText: 'dark:text-green-200',
      };

    // Parental Guidance - Blue
    case 'PG':
    case '12+':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        darkBg: 'dark:bg-blue-900',
        darkText: 'dark:text-blue-200',
      };

    // Teen content - Orange
    case 'PG-13':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        darkBg: 'dark:bg-orange-900',
        darkText: 'dark:text-orange-200',
      };

    // Default fallback - Gray
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        darkBg: 'dark:bg-gray-700',
        darkText: 'dark:text-gray-300',
      };
  }
}

export interface MoviesTableProps {
  movies: Movie[];
}

export function MoviesTable({ movies }: MoviesTableProps) {
  return (
    <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Age Rating
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Score Rating
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {movies.map((movie) => (
            <tr key={movie.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {movie.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">({movie.year})</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {(() => {
                  const colors = getAgeRatingColors(movie.age_rating);
                  return (
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
                    >
                      {movie.age_rating}
                    </span>
                  );
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {formatDuration(movie.duration)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {movie.score_rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/10</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
