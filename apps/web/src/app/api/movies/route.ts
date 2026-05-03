import { NextRequest, NextResponse } from 'next/server';

import { getMoviesPage } from '@/features/movies/catalog';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Validate page and pageSize
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: 'Invalid page or pageSize parameters' }, { status: 400 });
    }

    const response = await getMoviesPage(page, pageSize);
    return NextResponse.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch movies');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
