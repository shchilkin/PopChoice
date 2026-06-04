import {
  extractTMDBCatalogMetadataCore,
  extractTMDBUSCertification,
  resolveTMDBSearchMatch,
  scoreTMDBTitleMatch,
} from '@pop-choice/shared';
import z from 'zod';

import logger from '@/lib/logger';
import { recordTMDBProviderError } from '@/lib/metrics';

import type { TMDBCatalogCandidate, TMDBDiscoverySource } from '@/lib/jobQueue';
import type { TMDBCatalogMetadataCore, TMDBCatalogMovieDetails } from '@pop-choice/shared';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TMDB_FETCH_TIMEOUT_MS = 8_000;
const SUPPORTED_PROVIDER_REGIONS = ['US', 'FI', 'RU'] as const;
const WATCH_PROVIDER_TYPES = ['flatrate', 'rent', 'buy', 'ads', 'free'] as const;

type TMDBWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number | null;
};

type TMDBWatchProviderRegion = {
  link?: string | null;
} & Partial<Record<(typeof WATCH_PROVIDER_TYPES)[number], TMDBWatchProvider[]>>;

export type TMDBMovieDetails = TMDBCatalogMovieDetails & {
  original_title?: string | null;
  original_language?: string | null;
  overview: string;
  vote_count?: number | null;
  popularity?: number | null;
  poster_path: string | null;
  spoken_languages?: Array<{
    english_name?: string | null;
    iso_639_1?: string | null;
    name?: string | null;
  }>;
  production_countries?: Array<{
    iso_3166_1?: string | null;
    name?: string | null;
  }>;
  'watch/providers'?: {
    results?: Record<string, TMDBWatchProviderRegion>;
  };
};

export type TMDBCatalogMetadata = Omit<TMDBCatalogMetadataCore, 'snapshot'> & {
  providers: Array<{
    providerId: number;
    providerName: string;
    logoPath: string | null;
    displayPriority: number | null;
    region: string;
    availabilityType: (typeof WATCH_PROVIDER_TYPES)[number];
    link: string | null;
    rawMetadata: Record<string, unknown>;
  }>;
  qualityFlags: string[];
  qualityScore: number;
  snapshot: TMDBCatalogMetadataCore['snapshot'] & {
    original_title: string | null;
    original_language: string | null;
    vote_count: number | null;
    popularity: number | null;
    spoken_languages: TMDBMovieDetails['spoken_languages'];
    production_countries: TMDBMovieDetails['production_countries'];
    certification: string;
    providers: Array<{
      id: number;
      name: string;
      region: string;
      type: (typeof WATCH_PROVIDER_TYPES)[number];
      display_priority: number | null;
    }>;
    metadata_quality_score: number;
    metadata_quality_flags: string[];
  };
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
      append_to_response: 'release_dates,credits,keywords,watch/providers',
      language,
    });

    if (!response.ok) {
      recordTMDBProviderError('catalog_details', 'http_error');
      logger.warn(
        { movieId, status: response.status, statusText: response.statusText },
        'TMDB movie details fetch failed',
      );
      return null;
    }

    return (await response.json()) as TMDBMovieDetails;
  } catch (error) {
    if (error instanceof TMDBRateLimitError) throw error;
    recordTMDBProviderError(
      'catalog_details',
      error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
        ? 'timeout'
        : 'error',
    );
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
    recordTMDBProviderError('catalog_discover', 'http_error');
    throw new Error(`TMDB source page API error: ${response.status} ${response.statusText}`);
  }

  const parsed = tmdbListResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    recordTMDBProviderError('catalog_discover', 'invalid_response');
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

function scoreSearchCandidate(candidate: TMDBSearchResult, title: string, year: number): number {
  const releaseYear = parseTMDBYear(candidate.release_date);
  const yearScore =
    year <= 0 ? 0.1 : releaseYear === 0 ? 0 : Math.abs(releaseYear - year) <= 1 ? 0.25 : -0.5;

  return scoreTMDBTitleMatch(candidate, title) + yearScore;
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
    recordTMDBProviderError('catalog_details', 'http_error');
    throw new Error(`TMDB search API error: ${response.status} ${response.statusText}`);
  }

  const parsed = tmdbSearchResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    recordTMDBProviderError('catalog_details', 'invalid_response');
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
  const threshold = year > 0 ? 0.9 : 0.82;
  const match = await resolveTMDBSearchMatch({
    title,
    year,
    search: (query, searchYear) => tmdbSearch(apiKey, query, searchYear),
    toCandidate: (candidate) => ({
      id: candidate.id,
      title: candidate.title,
      releaseYear: parseTMDBYear(candidate.release_date) || null,
      confidence: scoreSearchCandidate(candidate, title, year),
    }),
    matchThreshold: threshold,
    ambiguousRunnerUpThreshold: 0.82,
    ambiguousScoreGap: 0.08,
  });

  if (match.status !== 'matched') return { status: match.status, candidates: match.candidates };

  return {
    status: 'matched',
    tmdbId: match.best.id,
    confidence: match.best.confidence,
    candidates: match.candidates,
  };
}

export function extractUSCertification(details: TMDBMovieDetails): string {
  return extractTMDBUSCertification(details);
}

function extractWatchProviders(details: TMDBMovieDetails): TMDBCatalogMetadata['providers'] {
  const results = details['watch/providers']?.results ?? {};
  return SUPPORTED_PROVIDER_REGIONS.flatMap((region) => {
    const regionProviders = results[region];
    if (!regionProviders) return [];
    const link = regionProviders.link ?? null;

    return WATCH_PROVIDER_TYPES.flatMap((availabilityType) =>
      (regionProviders[availabilityType] ?? [])
        .filter(
          (provider) =>
            Number.isFinite(provider.provider_id) && provider.provider_name.trim().length > 0,
        )
        .map((provider) => ({
          availabilityType,
          displayPriority: provider.display_priority ?? null,
          link,
          logoPath: provider.logo_path ?? null,
          providerId: provider.provider_id,
          providerName: provider.provider_name,
          rawMetadata: provider as unknown as Record<string, unknown>,
          region,
        })),
    );
  });
}

function getMetadataQualityFlags(input: {
  ageRating: string;
  details: TMDBMovieDetails;
  genres: TMDBCatalogMetadata['genres'];
  keywords: TMDBCatalogMetadata['keywords'];
  people: TMDBCatalogMetadata['people'];
  providers: TMDBCatalogMetadata['providers'];
}): string[] {
  const flags: string[] = [];
  if (!input.details.runtime || input.details.runtime <= 0) flags.push('missing_runtime');
  if (!input.ageRating || input.ageRating === 'NR') flags.push('missing_certification');
  if (!input.details.poster_path) flags.push('missing_poster');
  if (!input.details.overview?.trim()) flags.push('missing_overview');
  if (!input.details.original_language?.trim()) flags.push('missing_original_language');
  if (!Number.isFinite(input.details.vote_count) || Number(input.details.vote_count ?? 0) <= 0) {
    flags.push('missing_vote_count');
  }
  if (!Number.isFinite(input.details.popularity) || Number(input.details.popularity ?? 0) <= 0) {
    flags.push('missing_popularity');
  }
  if (input.genres.length === 0) flags.push('missing_genres');
  if (input.keywords.length === 0) flags.push('missing_keywords');
  if (!input.people.some((person) => person.role === 'cast')) flags.push('missing_cast');
  if (!input.people.some((person) => person.role === 'director')) flags.push('missing_director');
  for (const region of SUPPORTED_PROVIDER_REGIONS) {
    if (!input.providers.some((provider) => provider.region === region)) {
      flags.push(`missing_provider_${region.toLowerCase()}`);
    }
  }
  return flags;
}

export function getMetadataQualityScore(flags: string[]): number {
  const penaltyByFlag: Record<string, number> = {
    missing_runtime: 15,
    missing_certification: 12,
    missing_poster: 8,
    missing_overview: 12,
    missing_original_language: 4,
    missing_vote_count: 8,
    missing_popularity: 6,
    missing_genres: 12,
    missing_keywords: 8,
    missing_cast: 6,
    missing_director: 6,
    missing_provider_us: 1,
    missing_provider_fi: 1,
    missing_provider_ru: 1,
  };

  const penalty = flags.reduce((sum, flag) => sum + (penaltyByFlag[flag] ?? 4), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function extractCatalogMetadata(details: TMDBMovieDetails): TMDBCatalogMetadata {
  const coreMetadata = extractTMDBCatalogMetadataCore(details);
  const { genres, keywords, people } = coreMetadata;
  const providers = extractWatchProviders(details);
  const ageRating = extractUSCertification(details);
  const qualityFlags = getMetadataQualityFlags({
    ageRating,
    details,
    genres,
    keywords,
    people,
    providers,
  });

  return {
    ...coreMetadata,
    people,
    genres,
    keywords,
    providers,
    qualityFlags,
    qualityScore: getMetadataQualityScore(qualityFlags),
    snapshot: {
      ...coreMetadata.snapshot,
      original_title: details.original_title ?? null,
      original_language: details.original_language ?? null,
      vote_count: details.vote_count ?? null,
      popularity: details.popularity ?? null,
      spoken_languages: details.spoken_languages ?? [],
      production_countries: details.production_countries ?? [],
      certification: ageRating,
      providers: providers.map(
        ({ providerId, providerName, region, availabilityType, displayPriority }) => ({
          id: providerId,
          name: providerName,
          region,
          type: availabilityType,
          display_priority: displayPriority,
        }),
      ),
      metadata_quality_score: getMetadataQualityScore(qualityFlags),
      metadata_quality_flags: qualityFlags,
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
