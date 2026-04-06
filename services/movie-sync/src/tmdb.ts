/**
 * TMDB API client for fetching popular/discover movies.
 * Uses the TMDB v4 read access token (Bearer auth).
 */

import { logger } from './logger.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

/**
 * Fetch movies from TMDB /discover/movie endpoint.
 * Returns up to `maxPages` pages of results.
 */
export async function fetchTMDBMovies(apiKey: string, maxPages: number = 3): Promise<TMDBMovie[]> {
  const allMovies: TMDBMovie[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('sort_by', 'popularity.desc');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('page', String(page));

    logger.info('Fetching TMDB movies', { page, maxPages });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TMDBDiscoverResponse;
    allMovies.push(...data.results);

    logger.info('Fetched TMDB page', {
      page,
      moviesOnPage: data.results.length,
      totalPages: data.total_pages,
    });

    // Stop if we've reached the last page
    if (page >= data.total_pages) break;
  }

  logger.info('TMDB fetch complete', { totalFetched: allMovies.length });
  return allMovies;
}

/**
 * Estimate age rating from TMDB data.
 * TMDB doesn't provide US ratings directly in discover results,
 * so we approximate based on the `adult` flag.
 */
export function estimateAgeRating(movie: TMDBMovie): string {
  if (movie.adult) return 'R';
  return 'PG-13';
}

/**
 * Convert a TMDB movie into a text description suitable for embedding.
 */
export function movieToEmbeddingText(movie: TMDBMovie): string {
  const year = movie.release_date ? movie.release_date.substring(0, 4) : 'Unknown';
  const rating = estimateAgeRating(movie);
  const score = movie.vote_average.toFixed(1);

  return [
    `${movie.title} (${year})`,
    `Rating: ${rating}`,
    `Score: ${score}/10`,
    `Description: ${movie.overview || 'No description available.'}`,
  ].join('\n');
}
