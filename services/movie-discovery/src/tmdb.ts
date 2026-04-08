import { logger } from './logger.js';
import type { TMDBSource } from './config.js';

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

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  release_dates: {
    results: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
      }>;
    }>;
  };
}

interface TMDBListResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

/**
 * Fetch movies from a single TMDB source endpoint.
 * Returns up to `maxPages` pages of results.
 */
async function fetchFromSource(
  readAccessToken: string,
  source: TMDBSource,
  maxPages: number,
): Promise<TMDBMovie[]> {
  const allMovies: TMDBMovie[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(`${TMDB_BASE_URL}/movie/${source}`);
    url.searchParams.set('language', 'en-US');
    url.searchParams.set('page', String(page));

    logger.info('Fetching TMDB source page', { source, page, maxPages });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${readAccessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TMDB API error (${source}): ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TMDBListResponse;
    allMovies.push(...data.results);

    logger.info('Fetched TMDB source page', {
      source,
      page,
      moviesOnPage: data.results.length,
      totalPages: data.total_pages,
    });

    if (page >= data.total_pages) break;
  }

  logger.info('Source fetch complete', { source, totalFetched: allMovies.length });
  return allMovies;
}

/**
 * Fetch movies from multiple TMDB source endpoints.
 * Deduplicates by movie ID across sources.
 */
export async function fetchFromSources(
  readAccessToken: string,
  sources: TMDBSource[],
  maxPagesPerSource: number,
): Promise<TMDBMovie[]> {
  const seenIds = new Set<number>();
  const allMovies: TMDBMovie[] = [];

  for (const source of sources) {
    const movies = await fetchFromSource(readAccessToken, source, maxPagesPerSource);
    for (const movie of movies) {
      if (!seenIds.has(movie.id)) {
        seenIds.add(movie.id);
        allMovies.push(movie);
      }
    }
  }

  logger.info('All sources fetched', { totalUnique: allMovies.length });
  return allMovies;
}

/**
 * Fetch full movie details including runtime and US certification.
 */
export async function fetchMovieDetails(
  readAccessToken: string,
  movieId: number,
): Promise<TMDBMovieDetails> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);
  url.searchParams.set('append_to_response', 'release_dates');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${readAccessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error (movie details): ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TMDBMovieDetails;
}

/**
 * Extract the US certification from movie details.
 * Falls back to 'NR' if not found.
 */
export function extractUSCertification(details: TMDBMovieDetails): string {
  const usEntry = details.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');
  if (!usEntry) return 'NR';

  // Type 3 = Theatrical, prefer that; otherwise take the first with a certification
  const theatrical = usEntry.release_dates.find((rd) => rd.type === 3 && rd.certification);
  const any = usEntry.release_dates.find((rd) => rd.certification);
  const cert = (theatrical ?? any)?.certification ?? '';
  return cert || 'NR';
}

/**
 * Convert a TMDB movie into a text description suitable for embedding.
 */
export function movieToEmbeddingText(movie: TMDBMovieDetails, ageRating: string): string {
  const year = movie.release_date?.substring(0, 4) || 'Unknown';
  const runtime = movie.runtime ?? 0;
  const score = movie.vote_average.toFixed(1);

  return [
    `${movie.title} (${year})`,
    `Rating: ${ageRating}`,
    `Score: ${score}/10`,
    `Duration: ${runtime} min`,
    `Description: ${movie.overview || 'No description available.'}`,
  ].join('\n');
}
