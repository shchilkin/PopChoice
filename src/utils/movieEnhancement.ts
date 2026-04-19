import logger from '@/lib/logger';

/**
 * Client-side movie enhancement utilities
 * These functions work in the browser and provide better movie search/poster experiences
 */

export interface MovieRecommendation {
  id: number;
  name: string;
  year: number;
  similarity: number;
  age_rating?: string;
  duration?: number;
  score_rating?: number;
  posterURL?: string;
  description?: string;
  localizedName?: string;
  isMainRecommendation?: boolean;
  /** True for movies sourced from the TMDB fallback (negative IDs). */
  fromTMDB?: boolean;
}

/**
 * TMDB API configuration
 */
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Enhanced movie search with better matching and poster fetching
 * This function makes direct API calls to TMDB for better performance
 */
export async function enhanceMovieWithPoster(
  movie: MovieRecommendation,
  tmdbApiKey?: string,
): Promise<MovieRecommendation> {
  if (!tmdbApiKey) {
    logger.warn('TMDB API key not provided, skipping poster enhancement');
    return movie;
  }

  try {
    // Search for the movie using title and year for better accuracy
    const searchQuery = encodeURIComponent(`${movie.name} ${movie.year}`);
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbApiKey}&query=${searchQuery}&year=${movie.year}`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const movieData = data.results[0]; // Get the first (most relevant) result

      // Create poster URL if poster_path exists
      const posterURL = movieData.poster_path
        ? `${TMDB_IMAGE_BASE_URL}/w500${movieData.poster_path}`
        : undefined;

      // Enhanced description with TMDB data
      const enhancedDescription = createEnhancedDescription(movie, movieData);

      return {
        ...movie,
        posterURL,
        description: enhancedDescription,
      };
    }

    return movie;
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      `Failed to enhance movie "${movie.name}":`,
    );
    return movie;
  }
}

/**
 * Batch enhance multiple movies with posters
 * Uses rate limiting to avoid hitting API limits
 */
export async function enhanceMoviesWithPosters(
  movies: MovieRecommendation[],
  tmdbApiKey?: string,
  batchSize: number = 5,
  delayMs: number = 200,
): Promise<MovieRecommendation[]> {
  const enhancedMovies: MovieRecommendation[] = [];

  // Process movies in batches to avoid overwhelming the API
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);

    const batchPromises = batch.map((movie) => enhanceMovieWithPoster(movie, tmdbApiKey));

    const batchResults = await Promise.all(batchPromises);
    enhancedMovies.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + batchSize < movies.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return enhancedMovies;
}

/**
 * TMDB Movie Data interface
 */
interface TMDBMovieData {
  id: number;
  title: string;
  poster_path?: string;
  overview?: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
}

/**
 * Create an enhanced description combining our data with TMDB data
 */
function createEnhancedDescription(movie: MovieRecommendation, tmdbData: TMDBMovieData): string {
  const details = [];

  // Add our similarity score
  if (movie.similarity) {
    details.push(`${Math.round(movie.similarity * 100)}% match`);
  }

  // Add release year
  if (movie.year) {
    details.push(`Released: ${movie.year}`);
  }

  // Add age rating
  if (movie.age_rating) {
    details.push(`Rating: ${movie.age_rating}`);
  }

  // Add duration
  if (movie.duration) {
    details.push(`Duration: ${movie.duration} min`);
  }

  // Add our score rating
  if (movie.score_rating) {
    details.push(`Score: ${movie.score_rating}/10`);
  }

  // Add TMDB vote average if available
  if (tmdbData.vote_average && tmdbData.vote_average > 0) {
    details.push(`TMDB: ${tmdbData.vote_average.toFixed(1)}/10`);
  }

  // Add TMDB overview if available (truncated)
  let description = details.join(' • ');

  if (tmdbData.overview) {
    const overview =
      tmdbData.overview.length > 200
        ? `${tmdbData.overview.substring(0, 200)}...`
        : tmdbData.overview;
    description = `${description}\n\n${overview}`;
  }

  return description;
}

/**
 * Alternative poster URL builder for different sizes
 */
export function buildPosterURL(
  posterPath: string,
  size: 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500',
): string {
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

/**
 * Movie search utility that can be used independently
 */
export async function searchMovieByTitle(
  title: string,
  year?: number,
  tmdbApiKey?: string,
): Promise<TMDBMovieData | null> {
  if (!tmdbApiKey) {
    return null;
  }

  try {
    const searchQuery = encodeURIComponent(year ? `${title} ${year}` : title);
    const yearParam = year ? `&year=${year}` : '';
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${tmdbApiKey}&query=${searchQuery}${yearParam}`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      `Failed to search for movie "${title}":`,
    );
    return null;
  }
}
