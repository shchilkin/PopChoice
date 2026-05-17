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
  original_title: z.string().optional(),
  release_date: z.string(),
  popularity: z.number().optional(),
});

type TMDBSearchResult = z.infer<typeof tmdbSearchResultSchema>;

const tmdbSearchResponseSchema = z.object({
  results: z.array(tmdbSearchResultSchema),
});

/** Year tolerance (in years) when disambiguating TMDB search results. */
const YEAR_TOLERANCE = 1;
const CONFIDENT_MATCH_THRESHOLD = 0.9;
const LOW_YEAR_CONFIDENT_MATCH_THRESHOLD = 0.82;
const AMBIGUOUS_SCORE_GAP = 0.08;

export type TMDBSearchCandidate = {
  id: number;
  title: string;
  originalTitle?: string;
  releaseYear: number | null;
  confidence: number;
};

export type TMDBMovieSearchResult =
  | {
      status: 'matched';
      tmdbId: number;
      confidence: number;
      title: string;
      releaseYear: number | null;
      candidates: TMDBSearchCandidate[];
    }
  | {
      status: 'ambiguous';
      candidates: TMDBSearchCandidate[];
    }
  | {
      status: 'not_found';
      candidates: TMDBSearchCandidate[];
    };

function parseReleaseYear(releaseDate: string): number | null {
  const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : NaN;
  return Number.isFinite(year) ? year : null;
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ');
}

function titleConfidence(candidate: TMDBSearchResult, targetTitle: string): number {
  const target = normalizeTitle(targetTitle);
  const title = normalizeTitle(candidate.title);
  const originalTitle = candidate.original_title ? normalizeTitle(candidate.original_title) : '';

  if (!target || (!title && !originalTitle)) return 0;
  if (target === title || target === originalTitle) return 0.75;
  return 0;
}

function yearConfidence(candidateYear: number | null, targetYear: number): number {
  if (targetYear <= 0) return 0.1;
  if (candidateYear === null) return 0;

  const delta = Math.abs(candidateYear - targetYear);
  if (delta === 0) return 0.25;
  if (delta <= YEAR_TOLERANCE) return 0.15;
  return -0.5;
}

function scoreCandidate(
  candidate: TMDBSearchResult,
  targetTitle: string,
  targetYear: number,
): number {
  const releaseYear = parseReleaseYear(candidate.release_date);
  return titleConfidence(candidate, targetTitle) + yearConfidence(releaseYear, targetYear);
}

function toCandidate(
  candidate: TMDBSearchResult,
  targetTitle: string,
  targetYear: number,
): TMDBSearchCandidate {
  return {
    id: candidate.id,
    title: candidate.title,
    originalTitle: candidate.original_title,
    releaseYear: parseReleaseYear(candidate.release_date),
    confidence: scoreCandidate(candidate, targetTitle, targetYear),
  };
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
  const match = await searchMovieMatch(apiKey, title, year);
  return match.status === 'matched' ? match.tmdbId : null;
}

export async function searchMovieMatch(
  apiKey: string,
  title: string,
  year: number,
): Promise<TMDBMovieSearchResult> {
  const collected = new Map<number, TMDBSearchResult>();

  if (year > 0) {
    const scopedResults = await tmdbSearch(apiKey, title, year);
    for (const result of scopedResults) collected.set(result.id, result);

    const broadResults = await tmdbSearch(apiKey, title, null);
    for (const result of broadResults) collected.set(result.id, result);
  } else {
    const results = await tmdbSearch(apiKey, title, null);
    for (const result of results) collected.set(result.id, result);
  }

  const candidates = Array.from(collected.values())
    .map((candidate) => toCandidate(candidate, title, year))
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const best = candidates[0];
  if (!best) return { status: 'not_found', candidates };

  const threshold = year > 0 ? CONFIDENT_MATCH_THRESHOLD : LOW_YEAR_CONFIDENT_MATCH_THRESHOLD;
  const runnerUp = candidates[1];
  const isAmbiguous =
    runnerUp &&
    runnerUp.confidence >= LOW_YEAR_CONFIDENT_MATCH_THRESHOLD &&
    best.confidence - runnerUp.confidence <= AMBIGUOUS_SCORE_GAP;

  if (isAmbiguous) {
    return { status: 'ambiguous', candidates };
  }

  if (best.confidence < threshold) {
    return { status: 'not_found', candidates };
  }

  return {
    status: 'matched',
    tmdbId: best.id,
    confidence: best.confidence,
    title: best.title,
    releaseYear: best.releaseYear,
    candidates,
  };
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
