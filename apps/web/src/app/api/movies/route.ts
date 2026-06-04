import { NextRequest, NextResponse } from 'next/server';

import { getMoviesPage } from '@/features/movies/catalog';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';
import { ageRatings } from '@/utils/schemas/movieSchemas';

import type { MovieDurationFilter } from '@/features/movies/catalog';

const MIN_MOVIE_YEAR = 1878;
const MAX_MOVIE_YEAR = 2100;
const DURATION_FILTERS = new Set<MovieDurationFilter>(['under-90', '90-120', 'over-120']);
const VALID_AGE_RATINGS = new Set<string>(ageRatings.options);

type MoviesQueryParams = {
  page: number;
  pageSize: number;
  query: string;
  yearFrom?: number;
  yearTo?: number;
  duration?: MovieDurationFilter;
  requestedDuration?: string;
  minScore?: number;
  ageRatingFilters?: string[];
};

function parseRequiredPositiveInteger(value: string | null, fallback: number): number {
  if (value == null || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function parseOptionalYear(value: string | null): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  if (!/^\d{1,4}$/.test(value.trim())) return Number.NaN;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function parseOptionalDurationFilter(value: string | null): MovieDurationFilter | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return DURATION_FILTERS.has(normalized as MovieDurationFilter)
    ? (normalized as MovieDurationFilter)
    : undefined;
}

function parseOptionalMinScore(value: string | null): number | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!/^\d{1,2}(?:\.\d)?$/.test(normalized)) return Number.NaN;
  return Number.parseFloat(normalized);
}

function parseAgeRatingFilters(searchParams: URLSearchParams): string[] | undefined {
  const rawValues = [
    ...searchParams.getAll('ageRating'),
    ...searchParams.getAll('ageRatings').flatMap((value) => value.split(',')),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (rawValues.length === 0) return undefined;

  const uniqueValues = Array.from(new Set(rawValues));
  return uniqueValues.every((value) => VALID_AGE_RATINGS.has(value)) ? uniqueValues : [];
}

function parseMoviesQueryParams(searchParams: URLSearchParams): MoviesQueryParams {
  return {
    page: parseRequiredPositiveInteger(searchParams.get('page'), 1),
    pageSize: parseRequiredPositiveInteger(searchParams.get('pageSize'), 50),
    query: (searchParams.get('query') ?? searchParams.get('title') ?? '').trim(),
    yearFrom: parseOptionalYear(searchParams.get('yearFrom')),
    yearTo: parseOptionalYear(searchParams.get('yearTo')),
    duration: parseOptionalDurationFilter(searchParams.get('duration')),
    requestedDuration: searchParams.get('duration')?.trim(),
    minScore: parseOptionalMinScore(searchParams.get('minScore')),
    ageRatingFilters: parseAgeRatingFilters(searchParams),
  };
}

function isInvalidPagination(params: Pick<MoviesQueryParams, 'page' | 'pageSize'>): boolean {
  if (!Number.isInteger(params.page) || params.page < 1) return true;
  return !Number.isInteger(params.pageSize) || params.pageSize < 1 || params.pageSize > 100;
}

function isYearOutsideCatalogRange(year: number): boolean {
  return !Number.isFinite(year) || year < MIN_MOVIE_YEAR || year > MAX_MOVIE_YEAR;
}

function isInvalidYearFilter(params: Pick<MoviesQueryParams, 'yearFrom' | 'yearTo'>): boolean {
  if (params.yearFrom !== undefined && isYearOutsideCatalogRange(params.yearFrom)) return true;
  if (params.yearTo !== undefined && isYearOutsideCatalogRange(params.yearTo)) return true;
  return (
    params.yearFrom !== undefined && params.yearTo !== undefined && params.yearFrom > params.yearTo
  );
}

function isInvalidScoreFilter(minScore: number | undefined): boolean {
  if (minScore === undefined) return false;
  return !Number.isFinite(minScore) || minScore < 0 || minScore > 10;
}

function getMoviesQueryValidationError(params: MoviesQueryParams): string | undefined {
  if (isInvalidPagination(params)) return 'Invalid page or pageSize parameters';
  if (params.query.length > 80) return 'Invalid query parameter';
  if (isInvalidYearFilter(params)) return 'Invalid year filter parameters';
  if (params.requestedDuration && params.duration === undefined) {
    return 'Invalid duration filter parameter';
  }
  if (isInvalidScoreFilter(params.minScore)) return 'Invalid score filter parameter';
  if (params.ageRatingFilters && params.ageRatingFilters.length === 0) {
    return 'Invalid age rating filter parameter';
  }
  return undefined;
}

function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = parseMoviesQueryParams(searchParams);
    const validationError = getMoviesQueryValidationError(params);
    if (validationError) return badRequest(validationError);

    const response = await getMoviesPage(params.page, params.pageSize, {
      query: params.query || undefined,
      yearFrom: params.yearFrom,
      yearTo: params.yearTo,
      duration: params.duration,
      minScore: params.minScore,
      ageRatings: params.ageRatingFilters,
    });
    return NextResponse.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch movies');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
