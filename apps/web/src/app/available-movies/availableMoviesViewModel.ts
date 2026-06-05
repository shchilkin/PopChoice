import { getCsrfToken } from '@/lib/csrfClient';

import type { MovieDurationFilter, MoviesResponse } from '@/features/movies/catalog';

export type MoviesFetchOutcome =
  | { ok: true; data: MoviesResponse }
  | { ok: false; errorMessage: string };

export interface MovieFilters {
  query: string;
  yearFrom: string;
  yearTo: string;
  duration: '' | MovieDurationFilter;
  minScore: string;
  ageRatings: string[];
}

export const AGE_RATING_FILTERS = ['G', 'PG', 'PG-13', 'R', 'NR', '12+', '15', '16+', '18+'];

const emptyMovieFilters: MovieFilters = {
  query: '',
  yearFrom: '',
  yearTo: '',
  duration: '',
  minScore: '',
  ageRatings: [],
};

export function cloneEmptyMovieFilters(): MovieFilters {
  return { ...emptyMovieFilters, ageRatings: [] };
}

export function buildMoviesCacheKey(page: number, filters: MovieFilters): string {
  return JSON.stringify([
    page,
    filters.query.trim(),
    filters.yearFrom.trim(),
    filters.yearTo.trim(),
    filters.duration,
    filters.minScore.trim(),
    filters.ageRatings,
  ]);
}

function appendTrimmedParam(params: URLSearchParams, key: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) params.set(key, trimmed);
}

export function buildMoviesUrl(page: number, pageSize: number, filters: MovieFilters): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  appendTrimmedParam(params, 'query', filters.query);
  appendTrimmedParam(params, 'yearFrom', filters.yearFrom);
  appendTrimmedParam(params, 'yearTo', filters.yearTo);
  if (filters.duration) params.set('duration', filters.duration);
  appendTrimmedParam(params, 'minScore', filters.minScore);
  if (filters.ageRatings.length > 0) params.set('ageRatings', filters.ageRatings.join(','));

  return `/api/movies?${params.toString()}`;
}

export function hasActiveMovieFilters(filters: MovieFilters): boolean {
  return Object.values(normalizeMovieFilters(filters)).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
}

export function normalizeMovieFilters(filters: MovieFilters): MovieFilters {
  return {
    query: filters.query.trim(),
    yearFrom: filters.yearFrom.trim(),
    yearTo: filters.yearTo.trim(),
    duration: filters.duration,
    minScore: filters.minScore.trim(),
    ageRatings: filters.ageRatings,
  };
}

export function toggleAgeRatingFilter(filters: MovieFilters, rating: string): MovieFilters {
  const ageRatings = filters.ageRatings.includes(rating)
    ? filters.ageRatings.filter((value) => value !== rating)
    : [...filters.ageRatings, rating];
  return { ...filters, ageRatings };
}

export function generatePageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 1) return [];

  const delta = 2;
  const start = Math.max(2, currentPage - delta);
  const end = Math.min(totalPages - 1, currentPage + delta);
  const middlePages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return [
    1,
    ...(start > 2 ? (['...'] as const) : []),
    ...middlePages,
    ...(end < totalPages - 1 ? (['...'] as const) : []),
    totalPages,
  ];
}

export function getMoviesPageSummary(params: {
  currentPage: number;
  loading: boolean;
  pageSize: number;
  totalCount: number;
  noMoviesFoundText: string;
  showingText: string;
}): string {
  if (params.loading) return '';
  if (params.totalCount <= 0) return params.noMoviesFoundText;

  return params.showingText
    .replace('{start}', String((params.currentPage - 1) * params.pageSize + 1))
    .replace('{end}', String(Math.min(params.currentPage * params.pageSize, params.totalCount)))
    .replace('{total}', String(params.totalCount));
}

async function fetchMoviesResponse(
  page: number,
  pageSize: number,
  filters: MovieFilters,
  signal: AbortSignal,
): Promise<MoviesResponse> {
  const response = await fetch(buildMoviesUrl(page, pageSize, filters), {
    signal,
    headers: { 'X-CSRF-Token': getCsrfToken() },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch movies: ${response.statusText}`);
  }

  return response.json() as Promise<MoviesResponse>;
}

function getFetchErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An error occurred';
}

export async function fetchMoviesOutcome(
  page: number,
  pageSize: number,
  filters: MovieFilters,
  signal: AbortSignal,
): Promise<MoviesFetchOutcome> {
  try {
    return { ok: true, data: await fetchMoviesResponse(page, pageSize, filters, signal) };
  } catch (error) {
    return { ok: false, errorMessage: getFetchErrorMessage(error) };
  }
}
