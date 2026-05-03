import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { runMorePicksPipeline } from '@/features/recommendation/morePicksPipeline';
import { parseLocaleFromRequest } from '@/lib/locale';
import { applyRateLimit } from '@/lib/rateLimit';
import { withAuth } from '@/lib/withAuth';

const personFormDataSchema = z.object({
  favoriteMovie: z.string().min(1),
  newVsClassic: z.string().min(1),
  moodPreference: z.array(z.string()).min(1),
  tonePreference: z.string().min(1),
});

const requestBodySchema = z.object({
  quizData: z.union([personFormDataSchema, z.array(personFormDataSchema).min(1)]),
  /** TMDB discover page number (2 = first "more" page, since page 1 was used in main route). */
  page: z.number().int().min(2).max(10).optional().default(2),
  /** Negative IDs of TMDB movies already shown to the user; used to deduplicate. */
  excludeIds: z.array(z.number()).optional().default([]),
});

async function postHandler(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const locale = parseLocaleFromRequest(req);

  try {
    const body = await req.json();
    const { quizData, page, excludeIds } = requestBodySchema.parse(body);

    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({ error: 'TMDB not configured' }, { status: 503 });
    }

    const movies = await runMorePicksPipeline(quizData, excludeIds, page, locale);
    return NextResponse.json({ movies });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 },
      );
    }
    const isTimeout =
      error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    if (isTimeout) {
      return NextResponse.json({ error: 'TMDB request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
