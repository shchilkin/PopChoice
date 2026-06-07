import { NextRequest, NextResponse } from 'next/server';

import { getRecommendationRecord } from '@/features/recommendation/persistence';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

import { recommendationIdValidationResponse, userIdFromRecommendationClient } from './routeHelpers';

// ---------------------------------------------------------------------------
// GET /api/recommendations/[id]
// ---------------------------------------------------------------------------
async function getHandler(
  _req: NextRequest,
  clientId: string,
  { id }: { id: string },
): Promise<Response> {
  const validationResponse = recommendationIdValidationResponse(id);
  if (validationResponse) return validationResponse;

  try {
    return getRecommendationResponse(id, clientId);
  } catch (err) {
    logger.error({ err, id }, 'Failed to fetch recommendation');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getRecommendationResponse(id: string, clientId: string) {
  const result = await getRecommendationRecord(id, userIdFromRecommendationClient(clientId));
  return result ? NextResponse.json(result) : getRecommendationNotFoundResponse();
}

function getRecommendationNotFoundResponse() {
  return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
}

// Next.js dynamic route params are passed as the second argument to the route handler
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return withAuth((r, clientId) => getHandler(r, clientId, { id }))(req);
}
