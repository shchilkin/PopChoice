import axios, { AxiosInstance } from 'axios';

import logger from '@/lib/logger';

import { POSTER_SIZES, posterSize, PosterSize, TMDB_MovieEntry } from './types';

export const API_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export class MovieService {
  private axiosClient: AxiosInstance;
  private imageURLBase: string;
  private apiURLBase: string;

  constructor() {
    this.axiosClient = axios.create();
    this.imageURLBase = IMAGE_BASE_URL;
    this.apiURLBase = API_BASE_URL;
  }

  /**
   * Fetch a movie directly by its TMDB ID — the most reliable lookup, no ambiguity.
   * Used for TMDB-sourced movies where we already know the ID.
   */
  async getMovieById(tmdbId: number): Promise<TMDB_MovieEntry | undefined> {
    try {
      const response = await this.axiosClient({
        method: 'GET',
        url: `${this.apiURLBase}/movie/${tmdbId}`,
        responseType: 'json',
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        params: { language: 'en-US' },
      });
      return response.data as TMDB_MovieEntry;
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
        const response = await this.axiosClient({
          method: 'GET',
          url: `${this.apiURLBase}/search/movie`,
          responseType: 'json',
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
          params: {
            query: cleanedTitle,
            language: 'en-US',
            include_adult: false,
            ...(withYear && year ? { year } : {}),
          },
        });

        const results: TMDB_MovieEntry[] = response.data.results ?? [];
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
            const releaseYear = m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : 0;
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
      const response = await this.axiosClient({
        method: 'GET',
        url: `${this.apiURLBase}/movie/${movieId}`,
        responseType: 'json',
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
        params: { language },
      });
      return {
        title: response.data.title,
        poster_path: response.data.poster_path,
        overview: response.data.overview as string | undefined,
      };
    } catch (error) {
      logger.warn({ movieId, err: error }, 'Failed to fetch localized movie info');
      return undefined;
    }
  }

  getPosterURL(posterPath: string, size: PosterSize): string {
    const { success, data: parsedSize } = posterSize.safeParse(size);
    if (!success) {
      throw new Error(`Invalid poster size: ${size}. Available sizes: ${POSTER_SIZES.join(', ')}`);
    }
    return `${this.imageURLBase}/${parsedSize}${posterPath}`;
  }
}
