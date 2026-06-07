import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/withAuth', () => ({
  withAuth:
    (handler: (req: NextRequest, clientId: string) => Promise<Response> | Response) =>
    (req: NextRequest) =>
      handler(req, 'user:77'),
}));

import {
  authenticatedRecommendationSlugPost,
  recommendationIdValidationResponse,
  userIdFromRecommendationClient,
} from './routeHelpers';

describe('recommendation id route helpers', () => {
  it('returns a missing id response only for empty recommendation ids', async () => {
    expect(recommendationIdValidationResponse('rec-123')).toBeNull();

    const response = recommendationIdValidationResponse('');

    expect(response).not.toBeNull();
    if (!response) throw new Error('Expected a missing recommendation id response');
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing recommendation id' });
  });

  it('extracts signed-in user ids from recommendation auth client ids', () => {
    expect(userIdFromRecommendationClient('user:42')).toBe('42');
    expect(userIdFromRecommendationClient('browser-csrf')).toBeUndefined();
  });

  it('passes dynamic recommendation slugs through the authenticated route wrapper', async () => {
    const request = new NextRequest('http://localhost/api/recommendations/rec-123/feedback', {
      method: 'POST',
    });

    const response = await authenticatedRecommendationSlugPost(
      request,
      { params: Promise.resolve({ id: 'rec-123' }) },
      (_req, clientId, { slug }) => NextResponse.json({ clientId, slug }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ clientId: 'user:77', slug: 'rec-123' });
  });
});
