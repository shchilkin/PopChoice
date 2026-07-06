import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createRecommendationFeedback,
  type RecommendationFeedbackKind,
} from '@/lib/db/recommendations';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

import {
  authenticatedRecommendationSlugPost,
  recommendationIdValidationResponse,
  userIdFromRecommendationClient,
} from '../routeHelpers';

const feedbackSchema = z
  .object({
    kind: z.enum([
      'useful',
      'already_watched',
      'not_for_me',
      'wrong_mood',
      'too_obvious',
      'too_obscure',
      'close',
    ]),
  })
  .strict();

async function postHandler(
  req: NextRequest,
  clientId: string,
  { slug }: { slug: string },
): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const validationResponse = recommendationIdValidationResponse(slug);
  if (validationResponse) return validationResponse;

  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid feedback' }, { status: 422 });
  }

  try {
    const created = await createRecommendationFeedback({
      slug,
      kind: parsed.data.kind as RecommendationFeedbackKind,
      userId: userIdFromRecommendationClient(clientId),
    });

    if (!created) {
      return NextResponse.json(
        { error: 'Recommendation not found or not completed' },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: 'recorded' }, { status: 201 });
  } catch (err) {
    logger.error({ err, slug }, 'Failed to record recommendation feedback');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return authenticatedRecommendationSlugPost(req, context, postHandler);
}
