import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { runMorePicksPipeline } from '@/features/recommendation/morePicksPipeline';
import { parseLocaleFromRequest } from '@/lib/locale';
import { isOpenAITimeoutError } from '@/lib/openaiTimeout';
import { applyRateLimit } from '@/lib/rateLimit';
import {
  RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES,
  readJsonBodyWithLimit,
  requestBodyErrorResponse,
} from '@/lib/requestBody';
import { withAuth } from '@/lib/withAuth';

const personFormDataSchema = z.object({
  favoriteMovie: z.string(),
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
    const body = await readJsonBodyWithLimit(req, RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES);
    const { quizData, page, excludeIds } = requestBodySchema.parse(body);

    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({ error: 'TMDB not configured' }, { status: 503 });
    }

    const movies = await runMorePicksPipeline(quizData, excludeIds, page, locale);
    return NextResponse.json({ movies });
  } catch (error) {
    const bodyErrorResponse = requestBodyErrorResponse(error);
    if (bodyErrorResponse) return bodyErrorResponse;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 },
      );
    }
    const isTimeout =
      (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
      isOpenAITimeoutError(error);
    if (isTimeout) {
      return NextResponse.json({ error: 'Upstream request timed out' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
