import z from 'zod';

import logger from '@/lib/logger';

import type { TMDBCatalogCandidate, TMDBDiscoverySource } from '@/lib/jobQueue';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TMDB_FETCH_TIMEOUT_MS = 8_000;
const MAX_CAST_CREDITS = 12;
const MAX_KEYWORDS = 20;

type TMDBGenre = {
  id: number;
  name: string;
};

type TMDBCastCredit = {
  id: number;
  name: string;
  character?: string | null;
  order?: number | null;
  profile_path?: string | null;
  popularity?: number | null;
  credit_id?: string | null;
};

type TMDBCrewCredit = {
  id: number;
  name: string;
  job?: string | null;
  department?: string | null;
  profile_path?: string | null;
  popularity?: number | null;
  credit_id?: string | null;
};

type TMDBKeyword = {
  id: number;
  name: string;
};

export type TMDBMovieDetails = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  poster_path: string | null;
  genres?: TMDBGenre[];
  credits?: {
    cast?: TMDBCastCredit[];
    crew?: TMDBCrewCredit[];
  };
  keywords?: {
    keywords?: TMDBKeyword[];
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates: Array<{
        certification: string;
        type: number;
      }>;
    }>;
  };
};

export type TMDBCatalogMetadata = {
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
};

export class TMDBRateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`TMDB rate limit exceeded; retry after ${retryAfterMs}ms`);
    this.name = 'TMDBRateLimitError';
  }
}

function retryAfterMs(response: Response): number {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return 30_000;

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;

  const retryDate = Date.parse(retryAfter);
  if (Number.isFinite(retryDate)) return Math.max(1000, retryDate - Date.now());

  return 30_000;
}

async function tmdbGet(apiKey: string, path: string, params: Record<string, string>) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(TMDB_FETCH_TIMEOUT_MS),
  });

  if (response.status === 429) {
    throw new TMDBRateLimitError(retryAfterMs(response));
  }

  return response;
}

export function getPosterUrl(posterPath: string | null | undefined): string | null {
  return posterPath ? `${TMDB_IMAGE_BASE_URL}/w500${posterPath}` : null;
}

export function parseTMDBYear(releaseDate: string | null | undefined): number {
  const year = releaseDate ? Number.parseInt(releaseDate.substring(0, 4), 10) : NaN;
  return Number.isFinite(year) ? year : 0;
}

export async function fetchMovieDetails(
  apiKey: string,
  movieId: number,
  language = 'en-US',
): Promise<TMDBMovieDetails | null> {
  try {
    const response = await tmdbGet(apiKey, `/movie/${movieId}`, {
      append_to_response: 'release_dates,credits,keywords',
      language,
    });

    if (!response.ok) {
      logger.warn(
        { movieId, status: response.status, statusText: response.statusText },
        'TMDB movie details fetch failed',
      );
      return null;
    }

    return (await response.json()) as TMDBMovieDetails;
  } catch (error) {
    if (error instanceof TMDBRateLimitError) throw error;
    logger.warn({ err: error, movieId }, 'TMDB movie details fetch failed');
    return null;
  }
}

const tmdbSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional(),
  release_date: z.string(),
});

const tmdbSearchResponseSchema = z.object({
  results: z.array(tmdbSearchResultSchema),
});

type TMDBSearchResult = z.infer<typeof tmdbSearchResultSchema>;

type TMDBSearchCandidate = {
  id: number;
  title: string;
  releaseYear: number | null;
  confidence: number;
};

export type TMDBMovieSearchResult =
  | {
      status: 'matched';
      tmdbId: number;
      confidence: number;
      candidates: TMDBSearchCandidate[];
    }
  | {
      status: 'ambiguous' | 'not_found';
      candidates: TMDBSearchCandidate[];
    };

const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string().default(''),
  release_date: z.string().default(''),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  poster_path: z.string().nullable().optional(),
});

const tmdbListResponseSchema = z.object({
  results: z.array(tmdbMovieSchema),
});

export async function fetchTMDBSourcePage(input: {
  apiKey: string;
  source: TMDBDiscoverySource;
  page: number;
  language?: string;
}): Promise<TMDBCatalogCandidate[]> {
  const response = await tmdbGet(input.apiKey, `/movie/${input.source}`, {
    language: input.language ?? 'en-US',
    page: String(input.page),
  });

  if (!response.ok) {
    throw new Error(`TMDB source page API error: ${response.status} ${response.statusText}`);
  }

  const parsed = tmdbListResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    logger.warn(
      { source: input.source, page: input.page, zodError: parsed.error },
      'TMDB source page response validation failed',
    );
    return [];
  }

  return parsed.data.results.map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    poster_path: movie.poster_path,
  }));
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

function scoreSearchCandidate(candidate: TMDBSearchResult, title: string, year: number): number {
  const releaseYear = parseTMDBYear(candidate.release_date);
  const yearScore =
    year <= 0 ? 0.1 : releaseYear === 0 ? 0 : Math.abs(releaseYear - year) <= 1 ? 0.25 : -0.5;

  return titleConfidence(candidate, title) + yearScore;
}

async function tmdbSearch(
  apiKey: string,
  title: string,
  year: number | null,
): Promise<TMDBSearchResult[]> {
  const params: Record<string, string> = {
    query: title,
    language: 'en-US',
  };
  if (year && year > 0) params.year = String(year);

  const response = await tmdbGet(apiKey, '/search/movie', params);
  if (!response.ok) {
    throw new Error(`TMDB search API error: ${response.status} ${response.statusText}`);
  }

  const parsed = tmdbSearchResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    logger.warn({ title, year, zodError: parsed.error }, 'TMDB search response validation failed');
    return [];
  }

  return parsed.data.results;
}

export async function searchMovieMatch(
  apiKey: string,
  title: string,
  year: number,
): Promise<TMDBMovieSearchResult> {
  const collected = new Map<number, TMDBSearchResult>();
  const scopedResults = year > 0 ? await tmdbSearch(apiKey, title, year) : [];
  for (const result of scopedResults) collected.set(result.id, result);

  const broadResults = await tmdbSearch(apiKey, title, null);
  for (const result of broadResults) collected.set(result.id, result);

  const candidates = Array.from(collected.values())
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      releaseYear: parseTMDBYear(candidate.release_date) || null,
      confidence: scoreSearchCandidate(candidate, title, year),
    }))
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  const best = candidates[0];
  if (!best) return { status: 'not_found', candidates };

  const runnerUp = candidates[1];
  if (runnerUp && runnerUp.confidence >= 0.82 && best.confidence - runnerUp.confidence <= 0.08) {
    return { status: 'ambiguous', candidates };
  }

  const threshold = year > 0 ? 0.9 : 0.82;
  if (best.confidence < threshold) return { status: 'not_found', candidates };

  return {
    status: 'matched',
    tmdbId: best.id,
    confidence: best.confidence,
    candidates,
  };
}

export function extractUSCertification(details: TMDBMovieDetails): string {
  const usEntry = details.release_dates?.results?.find((entry) => entry.iso_3166_1 === 'US');
  if (!usEntry) return 'NR';

  const theatrical = usEntry.release_dates.find(
    (release) => release.type === 3 && release.certification,
  );
  const any = usEntry.release_dates.find((release) => release.certification);
  return (theatrical ?? any)?.certification || 'NR';
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
      poster_path: details.poster_path,
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

export function movieToEmbeddingText(input: {
  title: string;
  year: number;
  ageRating: string;
  runtime: number;
  description: string;
  scoreRating: number;
}): string {
  return [
    `${input.title} (${input.year})`,
    `Rating: ${input.ageRating}`,
    `Duration: ${input.runtime} min`,
    `Score: ${input.scoreRating.toFixed(1)}/10`,
    `Description: ${input.description}`,
  ].join('\n');
}
