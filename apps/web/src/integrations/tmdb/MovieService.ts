import logger from '@/lib/logger';
import { parseTMDBReleaseYear } from '@/lib/tmdb';

import { POSTER_SIZES, PosterSize, posterSizeSchema, TMDB_MovieEntry } from './types';

export const API_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

type Fetcher = typeof globalThis.fetch;

function getSearchParams(
  cleanedTitle: string,
  year: number | undefined,
  withYear: boolean,
): Record<string, string> {
  return {
    include_adult: 'false',
    language: 'en-US',
    query: cleanedTitle,
    ...(withYear && year ? { year: String(year) } : {}),
  };
}

function selectBestMovieMatch(
  results: TMDB_MovieEntry[],
  cleanedTitle: string,
  year: number | undefined,
  withYear: boolean,
): TMDB_MovieEntry | undefined {
  if (results.length === 0) return undefined;

  const pool = getCandidatePool(results, cleanedTitle, withYear);
  if (pool.length === 0) return undefined;

  return getYearMatchedMovie(pool, year) ?? pool[0];
}

function getCandidatePool(
  results: TMDB_MovieEntry[],
  cleanedTitle: string,
  withYear: boolean,
): TMDB_MovieEntry[] {
  const normalizedQuery = normalizeMovieTitle(cleanedTitle);
  const candidateMatches =
    getExactTitleMatches(results, cleanedTitle) ||
    getNormalizedTitleMatches(results, normalizedQuery);

  return candidateMatches ?? getFallbackCandidatePool(results, normalizedQuery, withYear);
}

function getExactTitleMatches(results: TMDB_MovieEntry[], cleanedTitle: string) {
  const matches = results.filter(
    (movie) => movie.title.toLowerCase() === cleanedTitle.toLowerCase(),
  );

  return matches.length > 0 ? matches : null;
}

function getNormalizedTitleMatches(results: TMDB_MovieEntry[], normalizedQuery: string) {
  const matches = results.filter((movie) => normalizeMovieTitle(movie.title) === normalizedQuery);

  return matches.length > 0 ? matches : null;
}

function getFallbackCandidatePool(
  results: TMDB_MovieEntry[],
  normalizedQuery: string,
  withYear: boolean,
) {
  const prefixMatches = results.filter((movie) => isPrefixTitleMatch(movie.title, normalizedQuery));

  if (prefixMatches.length > 0) {
    return prefixMatches;
  }

  return withYear ? [] : [results[0]];
}

function isPrefixTitleMatch(title: string, normalizedQuery: string) {
  const normalizedTitle = normalizeMovieTitle(title);

  return normalizedTitle.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedTitle);
}

function getYearMatchedMovie(pool: TMDB_MovieEntry[], year: number | undefined) {
  if (!year) {
    return undefined;
  }

  return pool.find((movie) => isReleaseYearMatch(movie, year));
}

function isReleaseYearMatch(movie: TMDB_MovieEntry, year: number) {
  const releaseYear = parseTMDBReleaseYear(movie.release_date);
  return Math.abs(releaseYear - year) <= 1;
}

// Normalized comparison handles variations like "Brother 2" vs
// "Brother 2: The Elder's Blood".
function normalizeMovieTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class MovieService {
  constructor(
    private fetcher: Fetcher = globalThis.fetch,
    private apiURLBase = API_BASE_URL,
    private imageURLBase = IMAGE_BASE_URL,
  ) {}

  private async tmdbGet(path: string, params: Record<string, string>): Promise<Response> {
    const url = new URL(`${this.apiURLBase}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return this.fetcher(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        Accept: 'application/json',
      },
    });
  }

  /**
   * Fetch a movie directly by its TMDB ID — the most reliable lookup, no ambiguity.
   * Used for TMDB-sourced movies where we already know the ID.
   */
  async getMovieById(tmdbId: number): Promise<TMDB_MovieEntry | undefined> {
    try {
      const response = await this.tmdbGet(`/movie/${tmdbId}`, { language: 'en-US' });
      if (!response.ok) {
        logger.warn({ status: response.status, tmdbId }, 'TMDB direct ID lookup failed');
        return undefined;
      }
      return (await response.json()) as TMDB_MovieEntry;
    } catch (error) {
      logger.warn({ err: error, tmdbId }, 'TMDB direct ID lookup failed');
      return undefined;
    }
  }

  async getMovieByTitle(movieTitle: string, year?: number): Promise<TMDB_MovieEntry | undefined> {
    // Strip optional year suffix like " (1997)" that OpenAI sometimes appends to titles.
    const cleanedTitle = movieTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();

    // Cascade: search with year first (better disambiguation), fall back without year.
    const withYear = year ? await this.searchMovie(cleanedTitle, year, true) : undefined;
    if (withYear) return withYear;

    if (year) {
      logger.warn(
        { movieTitle, year },
        'Year-scoped TMDB search found nothing, retrying without year',
      );
    }
    const withoutYear = await this.searchMovie(cleanedTitle, year, false);
    if (!withoutYear) {
      logger.warn({ movieTitle, cleanedTitle }, 'No TMDB movie found with title after cascade');
    }
    return withoutYear;
  }

  private async searchMovie(
    cleanedTitle: string,
    year: number | undefined,
    withYear: boolean,
  ): Promise<TMDB_MovieEntry | undefined> {
    try {
      const results = await this.fetchSearchResults(cleanedTitle, year, withYear);
      return selectBestMovieMatch(results, cleanedTitle, year, withYear);
    } catch (error) {
      logger.warn({ err: error, movieTitle: cleanedTitle, withYear }, 'TMDB search request failed');
      return undefined;
    }
  }

  private async fetchSearchResults(
    cleanedTitle: string,
    year: number | undefined,
    withYear: boolean,
  ): Promise<TMDB_MovieEntry[]> {
    const response = await this.tmdbGet(
      '/search/movie',
      getSearchParams(cleanedTitle, year, withYear),
    );
    if (!response.ok) {
      logger.warn(
        { status: response.status, movieTitle: cleanedTitle, withYear },
        'TMDB search request failed',
      );
      return [];
    }

    const data = (await response.json()) as { results?: TMDB_MovieEntry[] };
    return data.results ?? [];
  }

  async getLocalizedMovieInfo(
    movieId: number,
    language: string,
  ): Promise<{ title: string; poster_path: string | null; overview?: string } | undefined> {
    try {
      const response = await this.tmdbGet(`/movie/${movieId}`, { language });
      if (!response.ok) {
        logger.warn({ status: response.status, movieId }, 'Failed to fetch localized movie info');
        return undefined;
      }
      const data = (await response.json()) as {
        title: string;
        poster_path: string | null;
        overview?: string;
      };
      return {
        title: data.title,
        poster_path: data.poster_path,
        overview: data.overview,
      };
    } catch (error) {
      logger.warn({ movieId, err: error }, 'Failed to fetch localized movie info');
      return undefined;
    }
  }

  getPosterURL(posterPath: string | null, size: PosterSize): string | undefined {
    if (!posterPath) {
      return undefined;
    }
    const { success, data: parsedSize } = posterSizeSchema.safeParse(size);
    if (!success) {
      throw new Error(`Invalid poster size: ${size}. Available sizes: ${POSTER_SIZES.join(', ')}`);
    }
    return `${this.imageURLBase}/${parsedSize}${posterPath}`;
  }
}
