import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/withAuth';

type RecommendationSlugHandler = (
  req: NextRequest,
  clientId: string,
  params: { slug: string },
) => Promise<Response> | Response;

export function recommendationIdValidationResponse(id: string) {
  return id ? null : NextResponse.json({ error: 'Missing recommendation id' }, { status: 400 });
}

export function userIdFromRecommendationClient(clientId: string) {
  return clientId.startsWith('user:') ? clientId.slice('user:'.length) : undefined;
}

export async function authenticatedRecommendationSlugPost(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  handler: RecommendationSlugHandler,
): Promise<Response> {
  const { id: slug } = await context.params;
  return withAuth((r, clientId) => handler(r, clientId, { slug }))(req);
}
