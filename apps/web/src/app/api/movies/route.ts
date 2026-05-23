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

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseRequiredPositiveInteger(searchParams.get('page'), 1);
    const pageSize = parseRequiredPositiveInteger(searchParams.get('pageSize'), 50);
    const query = (searchParams.get('query') ?? searchParams.get('title') ?? '').trim();
    const yearFrom = parseOptionalYear(searchParams.get('yearFrom'));
    const yearTo = parseOptionalYear(searchParams.get('yearTo'));
    const duration = parseOptionalDurationFilter(searchParams.get('duration'));
    const minScore = parseOptionalMinScore(searchParams.get('minScore'));
    const ageRatingFilters = parseAgeRatingFilters(searchParams);

    // Validate page and pageSize
    if (
      !Number.isInteger(page) ||
      !Number.isInteger(pageSize) ||
      page < 1 ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return NextResponse.json({ error: 'Invalid page or pageSize parameters' }, { status: 400 });
    }

    if (query.length > 80) {
      return NextResponse.json({ error: 'Invalid query parameter' }, { status: 400 });
    }

    const hasInvalidYear =
      (yearFrom !== undefined &&
        (!Number.isFinite(yearFrom) || yearFrom < MIN_MOVIE_YEAR || yearFrom > MAX_MOVIE_YEAR)) ||
      (yearTo !== undefined &&
        (!Number.isFinite(yearTo) || yearTo < MIN_MOVIE_YEAR || yearTo > MAX_MOVIE_YEAR)) ||
      (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo);

    if (hasInvalidYear) {
      return NextResponse.json({ error: 'Invalid year filter parameters' }, { status: 400 });
    }

    const requestedDuration = searchParams.get('duration')?.trim();
    if (requestedDuration && duration === undefined) {
      return NextResponse.json({ error: 'Invalid duration filter parameter' }, { status: 400 });
    }

    if (
      !Number.isFinite(minScore ?? 0) ||
      (minScore !== undefined && (minScore < 0 || minScore > 10))
    ) {
      return NextResponse.json({ error: 'Invalid score filter parameter' }, { status: 400 });
    }

    if (ageRatingFilters && ageRatingFilters.length === 0) {
      return NextResponse.json({ error: 'Invalid age rating filter parameter' }, { status: 400 });
    }

    const response = await getMoviesPage(page, pageSize, {
      query: query || undefined,
      yearFrom,
      yearTo,
      duration,
      minScore,
      ageRatings: ageRatingFilters,
    });
    return NextResponse.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch movies');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
