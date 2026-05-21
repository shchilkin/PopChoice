import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getMovieInfo } from '@/features/recommendation/recommendation';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

const requestSchema = z.object({
  locale: z.enum(['en', 'ru', 'fi']).optional(),
  movies: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      year: z.number().optional(),
      tmdbId: z.number().optional(), // pass real TMDB ID for TMDB-sourced movies (id < 0)
    }),
  ),
});
const POSTER_LOOKUP_BATCH_SIZE = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

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

  const locale = parsed.data.locale ?? parseLocaleFromRequest(req);

  const results: Array<{
    id: number;
    posterURL: string | null;
    localizedName: string | null;
    localizedOverview: string | null;
  }> = [];
  for (const batch of chunk(parsed.data.movies, POSTER_LOOKUP_BATCH_SIZE)) {
    const batchResults = await Promise.all(
      batch.map(async ({ id, name, year, tmdbId }) => {
        try {
          const { posterURL, localizedName, localizedOverview } = await getMovieInfo(
            name,
            locale,
            year,
            tmdbId,
          );
          return {
            id,
            posterURL: posterURL ?? null,
            localizedName: localizedName ?? null,
            localizedOverview: localizedOverview ?? null,
          };
        } catch (err) {
          logger.warn(
            { err, movieId: id, movieName: name },
            'movie-posters: Failed to fetch poster URL',
          );
          return { id, posterURL: null, localizedName: null, localizedOverview: null };
        }
      }),
    );
    results.push(...batchResults);
  }

  return NextResponse.json({ results });
}
