import { NextRequest, NextResponse } from 'next/server';

import { getRecommendationRecord } from '@/features/recommendation/persistence';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

// ---------------------------------------------------------------------------
// GET /api/recommendations/[id]
// ---------------------------------------------------------------------------
async function getHandler(
  _req: NextRequest,
  _clientId: string,
  { id }: { id: string },
): Promise<Response> {
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing recommendation id' }, { status: 400 });
  }

  try {
    const result = await getRecommendationRecord(id);

    if (!result) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err, id }, 'Failed to fetch recommendation');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Next.js dynamic route params are passed as the second argument to the route handler
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return withAuth((r, clientId) => getHandler(r, clientId, { id }))(req);
}
