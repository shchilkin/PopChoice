import { logger } from './logger.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
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

interface TMDBSearchResult {
  id: number;
  title: string;
  release_date: string;
}

interface TMDBSearchResponse {
  results: TMDBSearchResult[];
}

/**
 * Search TMDB for a movie by title and year. Returns the TMDB movie ID or null if not found.
 */
export async function searchMovie(
  apiKey: string,
  title: string,
  year: number,
): Promise<number | null> {
  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set('query', title);
  url.searchParams.set('year', String(year));
  url.searchParams.set('language', 'en-US');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB search API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TMDBSearchResponse;

  if (!data.results || data.results.length === 0) {
    return null;
  }

  // Return the first result's ID — TMDB search already ranks by relevance
  return data.results[0].id;
}

/**
 * Fetch full movie details including runtime and US certification.
 */
export async function fetchMovieDetails(
  apiKey: string,
  movieId: number,
): Promise<TMDBMovieDetails | null> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);
  url.searchParams.set('append_to_response', 'release_dates');
  url.searchParams.set('language', 'en-US');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    logger.warn('TMDB movie details fetch failed', {
      movieId,
      status: response.status,
      statusText: response.statusText,
    });
    return null;
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
 * Convert movie data into a text description suitable for embedding.
 * Format must match the format used by services/movie-seed/src/sync.ts.
 */
export function movieToEmbeddingText(
  title: string,
  year: number,
  ageRating: string,
  runtime: number,
  overview: string,
  scoreRating: number,
): string {
  return [
    `${title} (${year})`,
    `Rating: ${ageRating}`,
    `Duration: ${runtime} min`,
    `Score: ${scoreRating.toFixed(1)}/10`,
    `Description: ${overview}`,
  ].join('\n');
}
