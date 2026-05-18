import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetSessionFromRequest, mockDeleteUserMovieMemory, mockApplyRateLimit } = vi.hoisted(
  () => ({
    mockGetSessionFromRequest: vi.fn(),
    mockDeleteUserMovieMemory: vi.fn(),
    mockApplyRateLimit: vi.fn(),
  }),
);

vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: mockGetSessionFromRequest,
}));

vi.mock('@/lib/db/recommendations', () => ({
  deleteUserMovieMemory: mockDeleteUserMovieMemory,
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: mockApplyRateLimit,
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE } from './route';

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/account/movie-memory', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost',
      'X-CSRF-Token': 'csrf-token',
      Cookie: '__csrf=csrf-token',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('DELETE /api/account/movie-memory', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockDeleteUserMovieMemory.mockReset();
    mockApplyRateLimit.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
  });

  it('returns 401 without a session', async () => {
    mockGetSessionFromRequest.mockReturnValue(null);

    const response = await DELETE(makeRequest({ movieKey: 'tmdb:129' }));

    expect(response.status).toBe(401);
    expect(mockDeleteUserMovieMemory).not.toHaveBeenCalled();
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await DELETE(
      makeRequest({ movieKey: 'tmdb:129' }, { 'X-CSRF-Token': 'wrong-token' }),
    );

    expect(response.status).toBe(403);
    expect(mockDeleteUserMovieMemory).not.toHaveBeenCalled();
  });

  it('returns 422 for an invalid payload', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await DELETE(makeRequest({ movieKey: '' }));

    expect(response.status).toBe(422);
    expect(mockDeleteUserMovieMemory).not.toHaveBeenCalled();
  });

  it('deletes the selected movie memory item for the signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockDeleteUserMovieMemory.mockResolvedValueOnce(true);

    const response = await DELETE(makeRequest({ movieKey: 'tmdb:129' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'deleted' });
    expect(mockDeleteUserMovieMemory).toHaveBeenCalledWith('42', 'tmdb:129');
  });

  it('returns 404 when the movie memory item is absent', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockDeleteUserMovieMemory.mockResolvedValueOnce(false);

    const response = await DELETE(makeRequest({ movieKey: 'tmdb:129' }));

    expect(response.status).toBe(404);
  });
});
