import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES } from '@/lib/requestBody';

vi.mock('@/lib/withAuth', () => ({
  withAuth:
    (handler: (req: NextRequest, clientId: string) => Promise<Response> | Response) =>
    (req: NextRequest) =>
      handler(req, 'test-client'),
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

const mockGetRecommendationInputBlock = vi.fn<(allPeopleData: unknown[]) => Promise<null>>(() =>
  Promise.resolve(null),
);
const mockNormalizePeopleData = vi.fn<(body: unknown) => unknown[]>((body) =>
  Array.isArray(body) ? body : [body],
);

vi.mock('@/features/recommendation/input', () => ({
  getRecommendationInputBlock: (allPeopleData: unknown[]) =>
    mockGetRecommendationInputBlock(allPeopleData),
  normalizePeopleData: (body: unknown) => mockNormalizePeopleData(body),
}));

const mockCreateAndStartRecommendation = vi.fn<(...args: unknown[]) => Promise<{ slug: string }>>(
  () => Promise.resolve({ slug: 'rec-test-slug' }),
);

vi.mock('@/features/recommendation/jobs', () => ({
  createAndStartRecommendation: (...args: unknown[]) => mockCreateAndStartRecommendation(...args),
}));

import { POST } from './route';

const validBody = {
  favoriteMovie: 'The Matrix',
  newVsClassic: 'new',
  moodPreference: ['action', 'sci-fi'],
  tonePreference: 'serious',
};

function makeRequest(body: unknown = validBody) {
  return new NextRequest('http://localhost/api/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 413 before validation or job creation when the request body is too large', async () => {
    const response = await POST(
      makeRequest({
        ...validBody,
        extraPayload: 'x'.repeat(RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data).toHaveProperty('error', 'Request body too large');
    expect(mockNormalizePeopleData).not.toHaveBeenCalled();
    expect(mockGetRecommendationInputBlock).not.toHaveBeenCalled();
    expect(mockCreateAndStartRecommendation).not.toHaveBeenCalled();
  });

  it('creates a recommendation job for a valid request', async () => {
    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual({ id: 'rec-test-slug' });
    expect(mockCreateAndStartRecommendation).toHaveBeenCalled();
  });
});
