import { NextResponse } from 'next/server';

import { getPopularPosterUrls } from '@/integrations/tmdb';
import logger from '@/lib/logger';

export interface PosterUrlsResponse {
  posters: string[];
}

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    logger.warn('TMDB_API_KEY is not set — returning empty poster list');
    return NextResponse.json<PosterUrlsResponse>({ posters: [] });
  }

  try {
    const posters = await getPopularPosterUrls(apiKey);

    return NextResponse.json<PosterUrlsResponse>(
      { posters },
      {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
      },
    );
  } catch (err) {
    logger.error({ err }, 'Failed to fetch poster URLs from TMDB');
    return NextResponse.json<PosterUrlsResponse>({ posters: [] });
  }
}
