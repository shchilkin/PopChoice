import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetSessionFromRequest,
  mockAddUserMovieMemoryFromCatalog,
  mockDeleteUserMovieMemory,
  mockGetMovieMemoryCandidatesForUser,
  mockSearchMovieCatalogForMemory,
  mockApplyRateLimit,
} = vi.hoisted(() => ({
  mockGetSessionFromRequest: vi.fn(),
  mockAddUserMovieMemoryFromCatalog: vi.fn(),
  mockDeleteUserMovieMemory: vi.fn(),
  mockGetMovieMemoryCandidatesForUser: vi.fn(),
  mockSearchMovieCatalogForMemory: vi.fn(),
  mockApplyRateLimit: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: mockGetSessionFromRequest,
}));

vi.mock('@/lib/db/recommendations', () => ({
  addUserMovieMemoryFromCatalog: mockAddUserMovieMemoryFromCatalog,
  deleteUserMovieMemory: mockDeleteUserMovieMemory,
  getMovieMemoryCandidatesForUser: mockGetMovieMemoryCandidatesForUser,
  searchMovieCatalogForMemory: mockSearchMovieCatalogForMemory,
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: mockApplyRateLimit,
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { DELETE, GET, POST } from './route';

function makeMutationRequest(
  method: 'POST' | 'DELETE',
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest('http://localhost/api/account/movie-memory', {
    method,
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

function makeDeleteRequest(body: unknown, headers: Record<string, string> = {}) {
  return makeMutationRequest('DELETE', body, headers);
}

function makePostRequest(body: unknown, headers: Record<string, string> = {}) {
  return makeMutationRequest('POST', body, headers);
}

function makeGetRequest(query = 'spirited') {
  return new NextRequest(
    `http://localhost/api/account/movie-memory?query=${encodeURIComponent(query)}`,
    {
      method: 'GET',
    },
  );
}

function makeCandidatesRequest() {
  return new NextRequest('http://localhost/api/account/movie-memory?mode=candidates', {
    method: 'GET',
  });
}

describe('GET /api/account/movie-memory', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockGetMovieMemoryCandidatesForUser.mockReset();
    mockSearchMovieCatalogForMemory.mockReset();
    mockApplyRateLimit.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
  });

  it('returns 401 without a session', async () => {
    mockGetSessionFromRequest.mockReturnValue(null);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
    expect(mockSearchMovieCatalogForMemory).not.toHaveBeenCalled();
    expect(mockGetMovieMemoryCandidatesForUser).not.toHaveBeenCalled();
  });

  it('returns movie memory candidates for a signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockGetMovieMemoryCandidatesForUser.mockResolvedValueOnce([
      {
        id: 129,
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
      },
    ]);

    const response = await GET(makeCandidatesRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      movies: [
        {
          id: 129,
          tmdbId: 129,
          movieName: 'Spirited Away',
          movieYear: 2001,
          posterURL: 'https://example.com/poster.jpg',
          localizedName: 'Унесённые призраками',
        },
      ],
    });
    expect(mockGetMovieMemoryCandidatesForUser).toHaveBeenCalledWith('42', 20);
    expect(mockSearchMovieCatalogForMemory).not.toHaveBeenCalled();
  });

  it('returns 422 for a too-short query', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await GET(makeGetRequest('s'));

    expect(response.status).toBe(422);
    expect(mockSearchMovieCatalogForMemory).not.toHaveBeenCalled();
  });

  it('returns catalog search results for a signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockSearchMovieCatalogForMemory.mockResolvedValueOnce([
      {
        id: 129,
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
      },
    ]);

    const response = await GET(makeGetRequest('spirited'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      movies: [
        {
          id: 129,
          tmdbId: 129,
          movieName: 'Spirited Away',
          movieYear: 2001,
          posterURL: 'https://example.com/poster.jpg',
          localizedName: 'Унесённые призраками',
        },
      ],
    });
    expect(mockSearchMovieCatalogForMemory).toHaveBeenCalledWith('spirited');
  });
});

describe('POST /api/account/movie-memory', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockAddUserMovieMemoryFromCatalog.mockReset();
    mockApplyRateLimit.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
  });

  it('returns 401 without a session', async () => {
    mockGetSessionFromRequest.mockReturnValue(null);

    const response = await POST(makePostRequest({ movieId: 129 }));

    expect(response.status).toBe(401);
    expect(mockAddUserMovieMemoryFromCatalog).not.toHaveBeenCalled();
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await POST(
      makePostRequest({ movieId: 129 }, { 'X-CSRF-Token': 'wrong-token' }),
    );

    expect(response.status).toBe(403);
    expect(mockAddUserMovieMemoryFromCatalog).not.toHaveBeenCalled();
  });

  it('returns 422 for an invalid payload', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await POST(makePostRequest({ movieId: 0 }));

    expect(response.status).toBe(422);
    expect(mockAddUserMovieMemoryFromCatalog).not.toHaveBeenCalled();
  });

  it('marks a catalog movie as watched for the signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockAddUserMovieMemoryFromCatalog.mockResolvedValueOnce({
      movieKey: 'tmdb:129',
      tmdbId: 129,
      movieName: 'Spirited Away',
      movieYear: 2001,
      posterURL: null,
      localizedName: null,
      kind: 'watched',
      updatedAt: '2026-05-20T12:00:00.000Z',
    });

    const response = await POST(makePostRequest({ movieId: 129 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'saved',
      item: {
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: null,
        localizedName: null,
        kind: 'watched',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
    });
    expect(mockAddUserMovieMemoryFromCatalog).toHaveBeenCalledWith('42', 129, 'watched');
  });

  it('marks a catalog movie as not watched for the signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockAddUserMovieMemoryFromCatalog.mockResolvedValueOnce({
      movieKey: 'tmdb:129',
      tmdbId: 129,
      movieName: 'Spirited Away',
      movieYear: 2001,
      posterURL: 'https://example.com/poster.jpg',
      localizedName: 'Унесённые призраками',
      kind: 'not_seen',
      updatedAt: '2026-05-20T12:00:00.000Z',
    });

    const response = await POST(makePostRequest({ movieId: 129, kind: 'not_seen' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'saved',
      item: {
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
        kind: 'not_seen',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
    });
    expect(mockAddUserMovieMemoryFromCatalog).toHaveBeenCalledWith('42', 129, 'not_seen');
  });

  it('returns 404 when the catalog movie is absent', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockAddUserMovieMemoryFromCatalog.mockResolvedValueOnce(null);

    const response = await POST(makePostRequest({ movieId: 999 }));

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/account/movie-memory', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockDeleteUserMovieMemory.mockReset();
    mockApplyRateLimit.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
  });

  it('returns 401 without a session', async () => {
    mockGetSessionFromRequest.mockReturnValue(null);

    const response = await DELETE(makeDeleteRequest({ movieKey: 'tmdb:129' }));

    expect(response.status).toBe(401);
    expect(mockDeleteUserMovieMemory).not.toHaveBeenCalled();
  });

  it('returns 403 when CSRF validation fails', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await DELETE(
      makeDeleteRequest({ movieKey: 'tmdb:129' }, { 'X-CSRF-Token': 'wrong-token' }),
    );

    expect(response.status).toBe(403);
    expect(mockDeleteUserMovieMemory).not.toHaveBeenCalled();
  });

  it('returns 422 for an invalid payload', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });

    const response = await DELETE(makeDeleteRequest({ movieKey: '' }));

    expect(response.status).toBe(422);
    expect(mockDeleteUserMovieMemory).not.toHaveBeenCalled();
  });

  it('deletes the selected movie memory item for the signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockDeleteUserMovieMemory.mockResolvedValueOnce(true);

    const response = await DELETE(makeDeleteRequest({ movieKey: 'tmdb:129' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'deleted' });
    expect(mockDeleteUserMovieMemory).toHaveBeenCalledWith('42', 'tmdb:129');
  });

  it('returns 404 when the movie memory item is absent', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockDeleteUserMovieMemory.mockResolvedValueOnce(false);

    const response = await DELETE(makeDeleteRequest({ movieKey: 'tmdb:129' }));

    expect(response.status).toBe(404);
  });
});
