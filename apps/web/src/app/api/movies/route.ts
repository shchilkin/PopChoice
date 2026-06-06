import { NextRequest, NextResponse } from 'next/server';

import { getMoviesPage } from '@/features/movies/catalog';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

import { getMoviesQueryValidationError, parseMoviesQueryParams } from './queryParams';

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
