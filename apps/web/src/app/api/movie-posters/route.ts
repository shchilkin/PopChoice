import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getMovieInfo } from '@/features/recommendation/recommendation';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

const requestSchema = z.object({
  movies: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      year: z.number().optional(),
      tmdbId: z.number().optional(), // pass real TMDB ID for TMDB-sourced movies (id < 0)
    }),
  ),
});

// POST /api/movie-posters
// Accepts a list of movies and returns poster URLs fetched server-side
// using the server-only TMDB_API_KEY — the key never reaches the browser.
export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  const locale = parseLocaleFromRequest(req);

  const results = await Promise.all(
    parsed.data.movies.map(async ({ id, name, year, tmdbId }) => {
      try {
        const { posterURL } = await getMovieInfo(name, locale, year, tmdbId);
        return { id, posterURL: posterURL ?? null };
      } catch (err) {
        logger.warn(
          { err, movieId: id, movieName: name },
          'movie-posters: Failed to fetch poster URL',
        );
        return { id, posterURL: null };
      }
    }),
  );

  return NextResponse.json({ results });
}
