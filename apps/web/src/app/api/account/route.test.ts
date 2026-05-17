import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetSessionFromRequest, mockGetDbClient, mockGetUserRecommendationSummaries } =
  vi.hoisted(() => ({
    mockGetSessionFromRequest: vi.fn(),
    mockGetDbClient: vi.fn(),
    mockGetUserRecommendationSummaries: vi.fn(),
  }));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: mockGetSessionFromRequest,
}));

vi.mock('@/clients/dbClient', () => ({
  getDbClient: mockGetDbClient,
}));

vi.mock('@/lib/db/recommendations', () => ({
  getUserRecommendationSummaries: mockGetUserRecommendationSummaries,
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from './route';

describe('GET /api/account', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockGetDbClient.mockReset();
    mockGetUserRecommendationSummaries.mockReset();
  });

  it('returns 401 without a session', async () => {
    mockGetSessionFromRequest.mockReturnValue(null);

    const response = await GET(new NextRequest('http://localhost/api/account'));

    expect(response.status).toBe(401);
  });

  it('returns 503 when the database is not configured', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockGetDbClient.mockReturnValue({ isConfigured: () => false });

    const response = await GET(new NextRequest('http://localhost/api/account'));

    expect(response.status).toBe(503);
  });

  it('returns account email and saved recommendations for the current user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockGetDbClient.mockReturnValue({
      isConfigured: () => true,
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [{ email: 'alex@example.com' }], error: null }),
        }),
      }),
    });
    mockGetUserRecommendationSummaries.mockResolvedValueOnce([
      { slug: 'saved-rec', feedbackKind: 'already_watched' },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/account'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    await expect(response.json()).resolves.toEqual({
      user: { email: 'alex@example.com' },
      recommendations: [{ slug: 'saved-rec', feedbackKind: 'already_watched' }],
    });
    expect(mockGetUserRecommendationSummaries).toHaveBeenCalledWith('42');
  });
});
