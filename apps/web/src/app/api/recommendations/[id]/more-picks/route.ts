import { NextRequest, NextResponse } from 'next/server';

import { startMorePicksRequest } from '@/features/recommendation/morePicksJobs';
import { claimMorePicksRequest } from '@/features/recommendation/morePicksPersistence';
import { parseLocaleFromRequest } from '@/lib/locale';
import { applyRateLimit } from '@/lib/rateLimit';

import {
  authenticatedRecommendationSlugPost,
  recommendationIdValidationResponse,
} from '../routeHelpers';

// ---------------------------------------------------------------------------
// POST /api/recommendations/[id]/more-picks
//
// Enqueues a BullMQ job that fetches an additional batch of TMDB movies for
// the given recommendation. Can only be called ONCE per recommendation — the
// DB column `more_picks_status` is atomically set to 'pending' on first call
// and subsequent calls return 409.
// ---------------------------------------------------------------------------

async function postHandler(
  req: NextRequest,
  _clientId: string,
  { slug }: { slug: string },
): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const validationResponse = recommendationIdValidationResponse(slug);
  if (validationResponse) return validationResponse;

  // Atomically claim the slot — fails gracefully if already claimed
  const claimed = await claimMorePicksRequest(slug);
  if (!claimed) {
    return NextResponse.json(
      { error: 'More picks already requested or recommendation not completed' },
      { status: 409 },
    );
  }

  const locale = parseLocaleFromRequest(req);
  await startMorePicksRequest(claimed, slug, locale);

  return NextResponse.json({ status: 'pending' }, { status: 202 });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return authenticatedRecommendationSlugPost(req, context, postHandler);
}
