import { logger } from './logger.js';
import type { TMDBSource } from './config.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MAX_CAST_CREDITS = 12;
const MAX_KEYWORDS = 20;

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBCastCredit {
  id: number;
  name: string;
  character?: string | null;
  order?: number | null;
  profile_path?: string | null;
  popularity?: number | null;
  credit_id?: string | null;
}

interface TMDBCrewCredit {
  id: number;
  name: string;
  job?: string | null;
  department?: string | null;
  profile_path?: string | null;
  popularity?: number | null;
  credit_id?: string | null;
}

interface TMDBKeyword {
  id: number;
  name: string;
}

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
  poster_path?: string | null;
  genres?: TMDBGenre[];
  credits?: {
    cast?: TMDBCastCredit[];
    crew?: TMDBCrewCredit[];
  };
  keywords?: {
    keywords?: TMDBKeyword[];
  };
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

export interface TMDBCatalogMetadata {
  people: Array<{
    tmdbId: number;
    name: string;
    profilePath: string | null;
    popularity: number | null;
    creditId: string;
    role: 'cast' | 'director';
    characterName: string | null;
    job: string | null;
    department: string | null;
    billingOrder: number | null;
    rawMetadata: Record<string, unknown>;
  }>;
  genres: Array<{
    tmdbId: number;
    name: string;
    rawMetadata: Record<string, unknown>;
  }>;
  keywords: Array<{
    tmdbId: number;
    name: string;
    rawMetadata: Record<string, unknown>;
  }>;
  snapshot: Record<string, unknown>;
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
  language: string,
): Promise<TMDBMovie[]> {
  const allMovies: TMDBMovie[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(`${TMDB_BASE_URL}/movie/${source}`);
    url.searchParams.set('language', language);
    url.searchParams.set('page', String(page));

    logger.info('Fetching TMDB source page', { source, page, maxPages });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${readAccessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
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
  language: string,
): Promise<TMDBMovie[]> {
  const seenIds = new Set<number>();
  const allMovies: TMDBMovie[] = [];

  for (const source of sources) {
    const movies = await fetchFromSource(readAccessToken, source, maxPagesPerSource, language);
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
  language: string,
): Promise<TMDBMovieDetails> {
  const url = new URL(`${TMDB_BASE_URL}/movie/${movieId}`);
  url.searchParams.set('append_to_response', 'release_dates,credits,keywords');
  url.searchParams.set('language', language);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${readAccessToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`TMDB API error (movie details): ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TMDBMovieDetails;
}

export function extractCatalogMetadata(details: TMDBMovieDetails): TMDBCatalogMetadata {
  const genres = (details.genres ?? [])
    .filter((genre) => Number.isFinite(genre.id) && genre.name)
    .map((genre) => ({
      tmdbId: genre.id,
      name: genre.name,
      rawMetadata: genre as unknown as Record<string, unknown>,
    }));

  const cast = (details.credits?.cast ?? [])
    .filter((credit) => Number.isFinite(credit.id) && credit.name && credit.credit_id)
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .slice(0, MAX_CAST_CREDITS)
    .map((credit) => ({
      tmdbId: credit.id,
      name: credit.name,
      profilePath: credit.profile_path ?? null,
      popularity: credit.popularity ?? null,
      creditId: credit.credit_id as string,
      role: 'cast' as const,
      characterName: credit.character ?? null,
      job: null,
      department: null,
      billingOrder: credit.order ?? null,
      rawMetadata: credit as unknown as Record<string, unknown>,
    }));

  const directors = (details.credits?.crew ?? [])
    .filter(
      (credit) =>
        Number.isFinite(credit.id) &&
        credit.name &&
        credit.credit_id &&
        credit.job?.toLowerCase() === 'director',
    )
    .map((credit) => ({
      tmdbId: credit.id,
      name: credit.name,
      profilePath: credit.profile_path ?? null,
      popularity: credit.popularity ?? null,
      creditId: credit.credit_id as string,
      role: 'director' as const,
      characterName: null,
      job: credit.job ?? null,
      department: credit.department ?? null,
      billingOrder: null,
      rawMetadata: credit as unknown as Record<string, unknown>,
    }));

  const keywords = (details.keywords?.keywords ?? [])
    .filter((keyword) => Number.isFinite(keyword.id) && keyword.name)
    .slice(0, MAX_KEYWORDS)
    .map((keyword) => ({
      tmdbId: keyword.id,
      name: keyword.name,
      rawMetadata: keyword as unknown as Record<string, unknown>,
    }));

  return {
    people: [...cast, ...directors],
    genres,
    keywords,
    snapshot: {
      id: details.id,
      title: details.title,
      release_date: details.release_date,
      runtime: details.runtime,
      vote_average: details.vote_average,
      poster_path: details.poster_path ?? null,
      genres: genres.map(({ tmdbId, name }) => ({ id: tmdbId, name })),
      cast: cast.map(({ tmdbId, name, characterName, billingOrder }) => ({
        id: tmdbId,
        name,
        character: characterName,
        order: billingOrder,
      })),
      directors: directors.map(({ tmdbId, name, job }) => ({ id: tmdbId, name, job })),
      keywords: keywords.map(({ tmdbId, name }) => ({ id: tmdbId, name })),
    },
  };
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
  const runtime = movie.runtime;
  const score = movie.vote_average.toFixed(1);
  const durationText =
    typeof runtime === 'number' && runtime > 0 ? `Duration: ${runtime} min` : 'Duration: unknown';

  return [
    `${movie.title} (${year})`,
    `Rating: ${ageRating}`,
    `Score: ${score}/10`,
    durationText,
    `Description: ${movie.overview || 'No description available.'}`,
  ].join('\n');
}
