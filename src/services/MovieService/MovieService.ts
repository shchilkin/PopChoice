import logger from '@/lib/logger';
import { parseTMDBReleaseYear } from '@/lib/tmdb';

import { POSTER_SIZES, PosterSize, posterSizeSchema, TMDB_MovieEntry } from './types';

export const API_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

type Fetcher = typeof globalThis.fetch;

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

    // Normalized comparison: lowercase + collapse whitespace + strip punctuation.
    // Handles minor variations like "Brother 2" vs "Brother 2: The Elder's Blood".
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const normalizedQuery = normalize(cleanedTitle);

    const searchOnce = async (withYear: boolean): Promise<TMDB_MovieEntry | undefined> => {
      try {
        const params: Record<string, string> = {
          query: cleanedTitle,
          language: 'en-US',
          include_adult: 'false',
        };
        if (withYear && year) {
          params['year'] = String(year);
        }
        const response = await this.tmdbGet('/search/movie', params);
        if (!response.ok) {
          logger.warn(
            { status: response.status, movieTitle: cleanedTitle, withYear },
            'TMDB search request failed',
          );
          return undefined;
        }

        const data = (await response.json()) as { results?: TMDB_MovieEntry[] };
        const results: TMDB_MovieEntry[] = data.results ?? [];
        if (results.length === 0) return undefined;

        // 1. Exact title match (case-insensitive)
        const exactMatches = results.filter(
          (m) => m.title.toLowerCase() === cleanedTitle.toLowerCase(),
        );

        // 2. Normalized match — strips punctuation/extra spaces
        const normalizedMatches =
          exactMatches.length > 0
            ? exactMatches
            : results.filter((m) => normalize(m.title) === normalizedQuery);

        // 3. Prefix/contains match — e.g. "Brother 2" matches "Brother 2: The Elder's Blood"
        const candidateMatches =
          normalizedMatches.length > 0
            ? normalizedMatches
            : results.filter(
                (m) =>
                  normalize(m.title).startsWith(normalizedQuery) ||
                  normalizedQuery.startsWith(normalize(m.title)),
              );

        // 4. Last resort: trust TMDB ranking (first result), only without year constraint
        const pool = candidateMatches.length > 0 ? candidateMatches : !withYear ? [results[0]] : [];
        if (pool.length === 0) return undefined;

        // Prefer the entry whose release year matches when a year is provided.
        if (year) {
          const yearMatch = pool.find((m) => {
            const releaseYear = parseTMDBReleaseYear(m.release_date);
            return Math.abs(releaseYear - year) <= 1; // ±1 year tolerance for release-date shifts
          });
          if (yearMatch) return yearMatch;
        }

        return pool[0];
      } catch (error) {
        logger.warn(
          { err: error, movieTitle: cleanedTitle, withYear },
          'TMDB search request failed',
        );
        return undefined;
      }
    };

    // Cascade: search with year first (better disambiguation), fall back without year.
    const withYear = year ? await searchOnce(true) : undefined;
    if (withYear) return withYear;

    if (year) {
      logger.warn(
        { movieTitle, year },
        'Year-scoped TMDB search found nothing, retrying without year',
      );
    }
    const withoutYear = await searchOnce(false);
    if (!withoutYear) {
      logger.warn({ movieTitle, cleanedTitle }, 'No TMDB movie found with title after cascade');
    }
    return withoutYear;
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
