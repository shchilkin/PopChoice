import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createRecommendationFeedback,
  type RecommendationFeedbackKind,
} from '@/lib/db/recommendations';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { withAuth } from '@/lib/withAuth';

const feedbackSchema = z
  .object({
    kind: z.enum([
      'useful',
      'already_watched',
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

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing recommendation id' }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid feedback' }, { status: 422 });
  }

  try {
    const userId = clientId.startsWith('user:') ? clientId.slice('user:'.length) : undefined;
    const created = await createRecommendationFeedback({
      slug,
      kind: parsed.data.kind as RecommendationFeedbackKind,
      userId,
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
  const { id: slug } = await context.params;
  return withAuth((r, clientId) => postHandler(r, clientId, { slug }))(req);
}
