import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetSessionFromRequest,
  mockAddUserMovieMemoryBatchFromCatalog,
  mockAddUserMovieMemoryFromExternalMovie,
  mockAddUserMovieMemoryFromCatalog,
  mockDeleteUserMovieMemory,
  mockGetMovieMemoryCandidateStatsForUser,
  mockGetMovieMemoryCandidatesForUser,
  mockGetLocalizedMovieInfo,
  mockGetMovieById,
  mockGetPosterURL,
  mockGetUserMovieMemorySummaries,
  mockLoggerWarn,
  mockSearchMovieCatalogForMemory,
  mockApplyRateLimit,
} = vi.hoisted(() => ({
  mockGetSessionFromRequest: vi.fn(),
  mockAddUserMovieMemoryBatchFromCatalog: vi.fn(),
  mockAddUserMovieMemoryFromExternalMovie: vi.fn(),
  mockAddUserMovieMemoryFromCatalog: vi.fn(),
  mockDeleteUserMovieMemory: vi.fn(),
  mockGetMovieMemoryCandidateStatsForUser: vi.fn(),
  mockGetMovieMemoryCandidatesForUser: vi.fn(),
  mockGetLocalizedMovieInfo: vi.fn(),
  mockGetMovieById: vi.fn(),
  mockGetPosterURL: vi.fn((path: string | null) =>
    path ? `https://image.tmdb.org/t/p/w500${path}` : undefined,
  ),
  mockGetUserMovieMemorySummaries: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockSearchMovieCatalogForMemory: vi.fn(),
  mockApplyRateLimit: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionFromRequest: mockGetSessionFromRequest,
}));

vi.mock('@/lib/db/recommendations', () => ({
  addUserMovieMemoryBatchFromCatalog: mockAddUserMovieMemoryBatchFromCatalog,
  addUserMovieMemoryFromExternalMovie: mockAddUserMovieMemoryFromExternalMovie,
  addUserMovieMemoryFromCatalog: mockAddUserMovieMemoryFromCatalog,
  deleteUserMovieMemory: mockDeleteUserMovieMemory,
  getMovieMemoryCandidateStatsForUser: mockGetMovieMemoryCandidateStatsForUser,
  getMovieMemoryCandidatesForUser: mockGetMovieMemoryCandidatesForUser,
  getUserMovieMemorySummaries: mockGetUserMovieMemorySummaries,
  searchMovieCatalogForMemory: mockSearchMovieCatalogForMemory,
}));

vi.mock('@/integrations/tmdb', () => ({
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
  MovieService: vi.fn(function () {
    return {
      getLocalizedMovieInfo: mockGetLocalizedMovieInfo,
      getMovieById: mockGetMovieById,
      getPosterURL: mockGetPosterURL,
    };
  }),
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: mockApplyRateLimit,
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: mockLoggerWarn, info: vi.fn(), debug: vi.fn() },
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

function makeCandidatesRequest(locale?: string) {
  const url = new URL('http://localhost/api/account/movie-memory');
  url.searchParams.set('mode', 'candidates');
  if (locale) url.searchParams.set('locale', locale);

  return new NextRequest(url, {
    method: 'GET',
  });
}

describe('GET /api/account/movie-memory', () => {
  beforeEach(() => {
    mockGetSessionFromRequest.mockReset();
    mockGetMovieMemoryCandidateStatsForUser.mockReset();
    mockGetMovieMemoryCandidatesForUser.mockReset();
    mockGetUserMovieMemorySummaries.mockReset();
    mockLoggerWarn.mockReset();
    mockSearchMovieCatalogForMemory.mockReset();
    mockApplyRateLimit.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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
    expect(mockLoggerWarn).not.toHaveBeenCalled();
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
    expect(mockGetMovieMemoryCandidateStatsForUser).not.toHaveBeenCalled();
    expect(mockSearchMovieCatalogForMemory).not.toHaveBeenCalled();
  });

  it('collects diagnostics when candidate loading returns no movies', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockGetMovieMemoryCandidatesForUser.mockResolvedValueOnce([]);
    mockGetMovieMemoryCandidateStatsForUser.mockResolvedValueOnce({
      catalogCount: 48,
      memoryCount: 48,
      availableCatalogCount: 0,
    });

    const response = await GET(makeCandidatesRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ movies: [] });
    expect(mockGetMovieMemoryCandidateStatsForUser).toHaveBeenCalledWith('42');
  });

  it('falls back to TMDB candidates when the catalog has no available movies', async () => {
    vi.stubEnv('TMDB_API_KEY', 'tmdb-key');
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockGetMovieMemoryCandidatesForUser.mockResolvedValueOnce([]);
    mockGetMovieMemoryCandidateStatsForUser.mockResolvedValueOnce({
      catalogCount: 0,
      memoryCount: 0,
      availableCatalogCount: 0,
    });
    mockGetUserMovieMemorySummaries.mockResolvedValueOnce([]);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            results: [
              {
                id: 550,
                title: 'Fight Club',
                original_title: 'Fight Club',
                release_date: '1999-10-15',
                poster_path: '/fight.jpg',
                overview: 'A restless office worker meets a soap maker.',
                vote_average: 8.4,
              },
            ],
          }),
        )
        .mockImplementation(() => Promise.resolve(Response.json({ results: [] }))),
    );

    const response = await GET(makeCandidatesRequest());

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalled();
    expect(mockGetUserMovieMemorySummaries).toHaveBeenCalledWith('42', 100);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      movies: [
        {
          id: -550,
          tmdbId: 550,
          movieName: 'Fight Club',
          movieYear: 1999,
          posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
          localizedName: null,
          duration: null,
          description: 'A restless office worker meets a soap maker.',
          localizedOverview: null,
        },
      ],
    });
  });

  it('keeps TMDB fallback movie identity canonical while returning localized titles', async () => {
    vi.stubEnv('TMDB_API_KEY', 'tmdb-key');
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockGetMovieMemoryCandidatesForUser.mockResolvedValueOnce([]);
    mockGetMovieMemoryCandidateStatsForUser.mockResolvedValueOnce({
      catalogCount: 0,
      memoryCount: 0,
      availableCatalogCount: 0,
    });
    mockGetUserMovieMemorySummaries.mockResolvedValueOnce([]);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            results: [
              {
                id: 550,
                title: 'Бойцовский клуб',
                original_title: 'Fight Club',
                release_date: '1999-10-15',
                poster_path: '/fight.jpg',
                overview: 'Офисный работник встречает торговца мылом.',
                vote_average: 8.4,
              },
            ],
          }),
        )
        .mockImplementation(() => Promise.resolve(Response.json({ results: [] }))),
    );

    const response = await GET(makeCandidatesRequest('ru'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      movies: [
        {
          id: -550,
          tmdbId: 550,
          movieName: 'Fight Club',
          movieYear: 1999,
          posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
          localizedName: 'Бойцовский клуб',
          duration: null,
          description: null,
          localizedOverview: 'Офисный работник встречает торговца мылом.',
        },
      ],
    });
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
    mockAddUserMovieMemoryBatchFromCatalog.mockReset();
    mockAddUserMovieMemoryFromExternalMovie.mockReset();
    mockAddUserMovieMemoryFromCatalog.mockReset();
    mockGetLocalizedMovieInfo.mockReset();
    mockGetMovieById.mockReset();
    mockGetPosterURL.mockClear();
    mockLoggerWarn.mockReset();
    mockApplyRateLimit.mockReset();
    mockApplyRateLimit.mockResolvedValue(null);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  it('saves a batch of movie memory choices for the signed-in user', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockAddUserMovieMemoryBatchFromCatalog.mockResolvedValueOnce([
      {
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
        kind: 'watched',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
      {
        movieKey: 'tmdb:680',
        tmdbId: 680,
        movieName: 'Pulp Fiction',
        movieYear: 1994,
        posterURL: 'https://example.com/pulp.jpg',
        localizedName: null,
        kind: 'not_seen',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
    ]);

    const response = await POST(
      makePostRequest({
        items: [
          { movieId: 129, kind: 'watched' },
          { movieId: 680, kind: 'not_seen' },
        ],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'saved',
      requested: 2,
      items: [
        {
          movieKey: 'tmdb:129',
          tmdbId: 129,
          movieName: 'Spirited Away',
          movieYear: 2001,
          posterURL: 'https://example.com/poster.jpg',
          localizedName: 'Унесённые призраками',
          kind: 'watched',
          updatedAt: '2026-05-20T12:00:00.000Z',
        },
        {
          movieKey: 'tmdb:680',
          tmdbId: 680,
          movieName: 'Pulp Fiction',
          movieYear: 1994,
          posterURL: 'https://example.com/pulp.jpg',
          localizedName: null,
          kind: 'not_seen',
          updatedAt: '2026-05-20T12:00:00.000Z',
        },
      ],
    });
    expect(mockAddUserMovieMemoryBatchFromCatalog).toHaveBeenCalledWith('42', [
      { movieId: 129, kind: 'watched' },
      { movieId: 680, kind: 'not_seen' },
    ]);
    expect(mockAddUserMovieMemoryFromCatalog).not.toHaveBeenCalled();
  });

  it('saves TMDB fallback choices from a batched deck', async () => {
    mockGetSessionFromRequest.mockReturnValue({ sub: '42', exp: 9999999999 });
    mockAddUserMovieMemoryBatchFromCatalog.mockResolvedValueOnce([]);
    mockGetMovieById.mockResolvedValueOnce({
      id: 550,
      title: 'Fight Club',
      release_date: '1999-10-15',
      poster_path: '/fight.jpg',
    });
    mockAddUserMovieMemoryFromExternalMovie.mockResolvedValueOnce({
      movieKey: 'tmdb:550',
      tmdbId: 550,
      movieName: 'Fight Club',
      movieYear: 1999,
      posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
      localizedName: null,
      kind: 'watched',
      updatedAt: '2026-05-20T12:00:00.000Z',
    });

    const response = await POST(
      makePostRequest({
        locale: 'en',
        items: [{ movieId: -550, kind: 'watched' }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'saved',
      requested: 1,
      items: [
        {
          movieKey: 'tmdb:550',
          tmdbId: 550,
          movieName: 'Fight Club',
          movieYear: 1999,
          posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
          localizedName: null,
          kind: 'watched',
          updatedAt: '2026-05-20T12:00:00.000Z',
        },
      ],
    });
    expect(mockAddUserMovieMemoryBatchFromCatalog).toHaveBeenCalledWith('42', []);
    expect(mockGetMovieById).toHaveBeenCalledWith(550);
    expect(mockAddUserMovieMemoryFromExternalMovie).toHaveBeenCalledWith(
      '42',
      {
        tmdbId: 550,
        movieName: 'Fight Club',
        movieYear: 1999,
        posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
        localizedName: null,
      },
      'watched',
    );
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
