import { NextResponse } from 'next/server';

import logger from '@/lib/logger';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

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
    const pages = await Promise.allSettled(
      [1, 2].map((page) =>
        fetch(`${TMDB_API_BASE}/movie/popular?page=${page}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          next: { revalidate: 86400 }, // cache the TMDB response for 24h at the edge
        })
          .then((r) => {
            if (!r.ok) throw new Error(`TMDB responded with ${r.status}`);
            return r.json() as Promise<{ results: Array<{ poster_path: string | null }> }>;
          })
          .then((data) => data.results ?? []),
      ),
    );

    const posters = pages
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .map((m) => m.poster_path)
      .filter((p): p is string => Boolean(p))
      .map((path) => `${TMDB_IMAGE_BASE}${path}`);

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
