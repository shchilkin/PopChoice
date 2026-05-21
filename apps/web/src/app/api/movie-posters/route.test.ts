import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockApplyRateLimit, mockGetMovieInfo, mockLoggerWarn } = vi.hoisted(() => ({
  mockApplyRateLimit: vi.fn(),
  mockGetMovieInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
}));

vi.mock('@/features/recommendation/recommendation', () => ({
  getMovieInfo: mockGetMovieInfo,
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: mockApplyRateLimit,
}));

vi.mock('@/lib/logger', () => ({
  default: { warn: mockLoggerWarn },
}));

import { POST } from './route';

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/movie-posters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/movie-posters', () => {
  beforeEach(() => {
    mockApplyRateLimit.mockReset();
    mockGetMovieInfo.mockReset();
    mockLoggerWarn.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
  });

  it('returns localized title metadata with poster lookups', async () => {
    mockGetMovieInfo.mockResolvedValueOnce({
      posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
      localizedName: 'Бойцовский клуб',
    });

    const response = await POST(
      makePostRequest({
        locale: 'ru',
        movies: [{ id: 550, name: 'Fight Club', year: 1999, tmdbId: 550 }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [
        {
          id: 550,
          posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
          localizedName: 'Бойцовский клуб',
        },
      ],
    });
    expect(mockGetMovieInfo).toHaveBeenCalledWith('Fight Club', 'ru', 1999, 550);
  });
});
