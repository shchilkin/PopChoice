import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateRecommendationFeedback = vi.fn();

vi.mock('@/lib/db/recommendations', () => ({
  createRecommendationFeedback: (...args: Parameters<typeof mockCreateRecommendationFeedback>) =>
    mockCreateRecommendationFeedback(...args),
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/withAuth', () => ({
  withAuth:
    (handler: (req: NextRequest, clientId: string) => Promise<Response>) => (req: NextRequest) =>
      handler(req, 'user:42'),
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { POST } from './route';

function makeRequest(body: unknown = { kind: 'useful' }) {
  return new NextRequest('http://localhost/api/recommendations/test-slug/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/recommendations/[id]/feedback', () => {
  beforeEach(() => {
    mockCreateRecommendationFeedback.mockReset();
  });

  it('records feedback for the recommendation and signed-in user', async () => {
    mockCreateRecommendationFeedback.mockResolvedValueOnce({ id: 'feedback-id' });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: 'test-slug' }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ status: 'recorded' });
    expect(mockCreateRecommendationFeedback).toHaveBeenCalledWith({
      slug: 'test-slug',
      kind: 'useful',
      userId: '42',
    });
  });

  it('rejects invalid feedback kinds', async () => {
    const response = await POST(makeRequest({ kind: 'please_retry' }), {
      params: Promise.resolve({ id: 'test-slug' }),
    });

    expect(response.status).toBe(422);
    expect(mockCreateRecommendationFeedback).not.toHaveBeenCalled();
  });

  it('returns 404 when the recommendation cannot accept feedback', async () => {
    mockCreateRecommendationFeedback.mockResolvedValueOnce(null);

    const response = await POST(makeRequest({ kind: 'already_watched' }), {
      params: Promise.resolve({ id: 'test-slug' }),
    });

    expect(response.status).toBe(404);
  });
});
