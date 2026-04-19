import { logger } from './logger.js';
import z from 'zod';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_SEARCH_FETCH_TIMEOUT_MS = 8_000;
const TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS = 8_000;

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

const tmdbSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string(),
});

type TMDBSearchResult = z.infer<typeof tmdbSearchResultSchema>;

const tmdbSearchResponseSchema = z.object({
  results: z.array(tmdbSearchResultSchema),
});

/** Year tolerance (in years) when disambiguating TMDB search results. */
const YEAR_TOLERANCE = 1;

/**
 * Pick the first TMDB result whose release_date year is within YEAR_TOLERANCE of targetYear.
 */
function pickByYear(results: TMDBSearchResult[], targetYear: number): number | null {
  for (const result of results) {
    const releaseYear = result.release_date
      ? parseInt(result.release_date.substring(0, 4), 10)
      : NaN;
    if (!Number.isNaN(releaseYear) && Math.abs(releaseYear - targetYear) <= YEAR_TOLERANCE) {
      return result.id;
    }
  }
  return null;
}

/**
 * Execute a single TMDB /search/movie request and return the raw results array.
 */
async function tmdbSearch(
  apiKey: string,
  title: string,
  year: number | null,
): Promise<TMDBSearchResult[]> {
  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set('query', title);
  url.searchParams.set('language', 'en-US');
  if (year !== null && year > 0) {
    url.searchParams.set('year', String(year));
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TMDB_SEARCH_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      logger.warn('TMDB search request timed out', {
        title,
        year,
        timeoutMs: TMDB_SEARCH_FETCH_TIMEOUT_MS,
      });
      throw new Error(`TMDB search timeout after ${TMDB_SEARCH_FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`TMDB search API error: ${response.status} ${response.statusText}`);
  }

  const parsedSearchResponse = tmdbSearchResponseSchema.safeParse(await response.json());
  if (!parsedSearchResponse.success) {
    logger.warn('TMDB search response validation failed', {
      title,
      year,
      zodError: parsedSearchResponse.error,
    });
    return [];
  }

  return parsedSearchResponse.data.results;
}

/**
 * Search TMDB for a movie by title and optional year.
 *
 * Strategy:
 * 1. If year > 0, run a year-scoped search and validate results against ±YEAR_TOLERANCE.
 * 2. Fall back to a year-less search:
 *    - Still validate against ±YEAR_TOLERANCE when year > 0.
 *    - Return the first result when year === 0 (no year to validate against).
 * 3. Return null when no suitable match is found.
 */
export async function searchMovie(
  apiKey: string,
  title: string,
  year: number,
): Promise<number | null> {
  if (year > 0) {
    // 1. Year-scoped search
    const scopedResults = await tmdbSearch(apiKey, title, year);
    const id = pickByYear(scopedResults, year);
    if (id !== null) return id;

    // 2. Year-less fallback — TMDB may rank differently without the year filter
    const broadResults = await tmdbSearch(apiKey, title, null);
    return pickByYear(broadResults, year);
  }

  // year === 0 — year unknown, return first result without year validation
  const results = await tmdbSearch(apiKey, title, null);
  return results.length > 0 ? results[0].id : null;
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

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      logger.warn('TMDB movie details request timed out, returning null', {
        movieId,
        timeoutMs: TMDB_MOVIE_DETAILS_FETCH_TIMEOUT_MS,
      });
      return null;
    }
    throw error;
  }

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
 * The `description` parameter should be the value from the DB (not TMDB overview),
 * to keep embeddings consistent with the stored row.
 */
export function movieToEmbeddingText(
  title: string,
  year: number,
  ageRating: string,
  runtime: number,
  description: string,
  scoreRating: number,
): string {
  return [
    `${title} (${year})`,
    `Rating: ${ageRating}`,
    `Duration: ${runtime} min`,
    `Score: ${scoreRating.toFixed(1)}/10`,
    `Description: ${description}`,
  ].join('\n');
}
