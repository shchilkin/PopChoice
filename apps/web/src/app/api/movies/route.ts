import { NextRequest, NextResponse } from 'next/server';

import { getMoviesPage } from '@/features/movies/catalog';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

const MIN_MOVIE_YEAR = 1878;
const MAX_MOVIE_YEAR = 2100;

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

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseRequiredPositiveInteger(searchParams.get('page'), 1);
    const pageSize = parseRequiredPositiveInteger(searchParams.get('pageSize'), 50);
    const query = (searchParams.get('query') ?? searchParams.get('title') ?? '').trim();
    const yearFrom = parseOptionalYear(searchParams.get('yearFrom'));
    const yearTo = parseOptionalYear(searchParams.get('yearTo'));

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

    const response = await getMoviesPage(page, pageSize, {
      query: query || undefined,
      yearFrom,
      yearTo,
    });
    return NextResponse.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch movies');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
