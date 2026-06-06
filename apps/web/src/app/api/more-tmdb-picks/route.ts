import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { runMorePicksPipeline } from '@/features/recommendation/morePicksPipeline';
import { morePicksPersonFormDataSchema } from '@/features/recommendation/morePicksSchemas';
import { parseLocaleFromRequest } from '@/lib/locale';
import { isOpenAITimeoutError } from '@/lib/openaiTimeout';
import { applyRateLimit } from '@/lib/rateLimit';
import {
  RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES,
  readJsonBodyWithLimit,
  requestBodyErrorResponse,
} from '@/lib/requestBody';
import { withAuth } from '@/lib/withAuth';

const requestBodySchema = z.object({
  quizData: z.union([morePicksPersonFormDataSchema, z.array(morePicksPersonFormDataSchema).min(1)]),
  /** TMDB discover page number (2 = first "more" page, since page 1 was used in main route). */
  page: z.number().int().min(2).max(10).optional().default(2),
  /** Negative IDs of TMDB movies already shown to the user; used to deduplicate. */
  excludeIds: z.array(z.number()).optional().default([]),
});

async function postHandler(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const tmdbConfigResponse = getTMDBConfigResponse();
    if (tmdbConfigResponse) return tmdbConfigResponse;

    const locale = parseLocaleFromRequest(req);
    const { quizData, page, excludeIds } = await parseMorePicksRequest(req);
    const movies = await runMorePicksPipeline(quizData, excludeIds, page, locale);
    return NextResponse.json({ movies });
  } catch (error) {
    return getMorePicksErrorResponse(error);
  }
}

function getTMDBConfigResponse() {
  return process.env.TMDB_API_KEY
    ? null
    : NextResponse.json({ error: 'TMDB not configured' }, { status: 503 });
}

async function parseMorePicksRequest(req: NextRequest) {
  const body = await readJsonBodyWithLimit(req, RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES);
  return requestBodySchema.parse(body);
}

function getMorePicksErrorResponse(error: unknown) {
  const bodyErrorResponse = requestBodyErrorResponse(error);
  if (bodyErrorResponse) return bodyErrorResponse;

  if (error instanceof z.ZodError) {
    return NextResponse.json({ details: error.issues, error: 'Invalid request' }, { status: 400 });
  }

  if (isMorePicksTimeoutError(error)) {
    return NextResponse.json({ error: 'Upstream request timed out' }, { status: 504 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

function isMorePicksTimeoutError(error: unknown) {
  return isAbortOrTimeoutError(error) || isOpenAITimeoutError(error);
}

function isAbortOrTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export const POST = withAuth(postHandler);
