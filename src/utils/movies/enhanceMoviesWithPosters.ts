import logger from '@/lib/logger';

import { MovieService } from '../../services';

const movieService = new MovieService();

export interface EnhancedMovieRecommendation {
  id: number;
  name: string;
  year: number;
  similarity: number;
  age_rating?: string;
  duration?: number;
  score_rating?: number;
  posterURL?: string;
}

/**
 * Enhances movie recommendations with poster URLs
 * @param movies Array of movie recommendations from the API
 * @returns Promise of movies with poster URLs
 */
export async function enhanceMoviesWithPosters(
  movies: EnhancedMovieRecommendation[],
): Promise<EnhancedMovieRecommendation[]> {
  const enhancedMovies = await Promise.all(
    movies.map(async (movie) => {
      try {
        // Try to get movie details by title
        const movieDetails = await movieService.getMovieByTitle(movie.name);

        if (movieDetails?.poster_path) {
          const posterURL = movieService.getPosterURL(movieDetails.poster_path, 'w500');
          return { ...movie, posterURL };
        }

        return movie;
      } catch (error) {
        logger.warn({ err: error }, `Failed to fetch poster for movie: ${movie.name}`);
        return movie;
      }
    }),
  );

  return enhancedMovies;
}
