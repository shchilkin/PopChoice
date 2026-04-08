import type { TMDBMovie } from './tmdb.js';

/**
 * Check if a movie meets the quality thresholds.
 */
export function isWorthy(movie: TMDBMovie, minVoteCount: number, minVoteAverage: number): boolean {
  return (
    movie.vote_count > minVoteCount &&
    movie.vote_average >= minVoteAverage &&
    (movie.overview?.length ?? 0) > 50
  );
}

/**
 * Filter a list of movies to only those meeting quality thresholds.
 */
export function applyQualityFilter(
  movies: TMDBMovie[],
  minVoteCount: number,
  minVoteAverage: number,
): TMDBMovie[] {
  return movies.filter((movie) => isWorthy(movie, minVoteCount, minVoteAverage));
}
