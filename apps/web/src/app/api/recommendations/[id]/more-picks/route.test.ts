import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockClaimMorePicksRequest = vi.fn();
const mockStartMorePicksRequest = vi.fn();

vi.mock('@/features/recommendation/morePicksPersistence', () => ({
  claimMorePicksRequest: (...args: Parameters<typeof mockClaimMorePicksRequest>) =>
    mockClaimMorePicksRequest(...args),
}));

vi.mock('@/features/recommendation/morePicksJobs', () => ({
  startMorePicksRequest: (...args: Parameters<typeof mockStartMorePicksRequest>) =>
    mockStartMorePicksRequest(...args),
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/locale', () => ({
  parseLocaleFromRequest: vi.fn(() => 'en'),
}));

vi.mock('@/lib/withAuth', () => ({
  withAuth:
    (handler: (req: NextRequest, clientId: string) => Promise<Response>) => (req: NextRequest) =>
      handler(req, 'test-client'),
}));

import { POST } from './route';

function makeRequest() {
  return new NextRequest('http://localhost/api/recommendations/test-slug/more-picks', {
    method: 'POST',
    headers: { 'Accept-Language': 'en' },
  });
}

describe('POST /api/recommendations/[id]/more-picks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 202 and delegates to shared more-picks start flow when claim succeeds', async () => {
    const claimed = {
      recommendationId: 'rec-uuid',
      quizData: { favoriteMovie: 'Inception' },
    };
    mockClaimMorePicksRequest.mockResolvedValueOnce(claimed);
    mockStartMorePicksRequest.mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'test-slug' }) });
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data).toEqual({ status: 'pending' });
    expect(mockClaimMorePicksRequest).toHaveBeenCalledWith('test-slug');
    expect(mockStartMorePicksRequest).toHaveBeenCalledWith(claimed, 'test-slug', 'en');
  });

  it('returns 409 when the more-picks slot cannot be claimed', async () => {
    mockClaimMorePicksRequest.mockResolvedValueOnce(null);

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'test-slug' }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toEqual({ error: 'More picks already requested or recommendation not completed' });
    expect(mockStartMorePicksRequest).not.toHaveBeenCalled();
  });

  it('returns 400 when the recommendation id is missing', async () => {
    const response = await POST(makeRequest(), { params: Promise.resolve({ id: '' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Missing recommendation id' });
    expect(mockClaimMorePicksRequest).not.toHaveBeenCalled();
  });
});
