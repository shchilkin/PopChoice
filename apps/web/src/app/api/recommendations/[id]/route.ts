import { NextRequest, NextResponse } from 'next/server';

import { getRecommendationRecord } from '@/features/recommendation/persistence';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

// ---------------------------------------------------------------------------
// GET /api/recommendations/[id]
// ---------------------------------------------------------------------------
async function getHandler(
  _req: NextRequest,
  clientId: string,
  { id }: { id: string },
): Promise<Response> {
  const validationResponse = getRecommendationIdValidationResponse(id);
  if (validationResponse) return validationResponse;

  try {
    return getRecommendationResponse(id, clientId);
  } catch (err) {
    logger.error({ err, id }, 'Failed to fetch recommendation');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getRecommendationIdValidationResponse(id: string) {
  return id ? null : NextResponse.json({ error: 'Missing recommendation id' }, { status: 400 });
}

async function getRecommendationResponse(id: string, clientId: string) {
  const result = await getRecommendationRecord(id, getViewerUserId(clientId));
  return result ? NextResponse.json(result) : getRecommendationNotFoundResponse();
}

function getViewerUserId(clientId: string) {
  return clientId.startsWith('user:') ? clientId.slice('user:'.length) : undefined;
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
