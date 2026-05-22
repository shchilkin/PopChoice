import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAddUserMovieMemoryBatchFromCatalog,
  mockAddUserMovieMemoryFromExternalMovie,
  mockAddUserMovieMemoryFromCatalog,
  mockDeleteUserMovieMemory,
  mockGetMovieMemoryCandidateStatsForUser,
  mockGetMovieMemoryCandidatesForUser,
  mockGetLocalizedMovieInfo,
  mockGetMovieById,
  mockGetPosterURL,
  mockGetUserMovieMemoryPage,
  mockGetUserMovieMemorySummaries,
  mockLoggerWarn,
  mockSearchMovieCatalogForMemory,
} = vi.hoisted(() => ({
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
  mockGetUserMovieMemoryPage: vi.fn(),
  mockGetUserMovieMemorySummaries: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockSearchMovieCatalogForMemory: vi.fn(),
}));

vi.mock('@/lib/db/recommendations', () => ({
  addUserMovieMemoryBatchFromCatalog: mockAddUserMovieMemoryBatchFromCatalog,
  addUserMovieMemoryFromExternalMovie: mockAddUserMovieMemoryFromExternalMovie,
  addUserMovieMemoryFromCatalog: mockAddUserMovieMemoryFromCatalog,
  deleteUserMovieMemory: mockDeleteUserMovieMemory,
  getMovieMemoryCandidateStatsForUser: mockGetMovieMemoryCandidateStatsForUser,
  getMovieMemoryCandidatesForUser: mockGetMovieMemoryCandidatesForUser,
  getUserMovieMemoryPage: mockGetUserMovieMemoryPage,
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

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: mockLoggerWarn, info: vi.fn(), debug: vi.fn() },
}));

import { addMovieMemoryBatchForUser, loadMovieMemoryCandidatesForUser } from './service';

describe('movie memory feature service', () => {
  beforeEach(() => {
    mockAddUserMovieMemoryBatchFromCatalog.mockReset();
    mockAddUserMovieMemoryFromExternalMovie.mockReset();
    mockAddUserMovieMemoryFromCatalog.mockReset();
    mockDeleteUserMovieMemory.mockReset();
    mockGetMovieMemoryCandidateStatsForUser.mockReset();
    mockGetMovieMemoryCandidatesForUser.mockReset();
    mockGetLocalizedMovieInfo.mockReset();
    mockGetMovieById.mockReset();
    mockGetPosterURL.mockClear();
    mockGetUserMovieMemoryPage.mockReset();
    mockGetUserMovieMemorySummaries.mockReset();
    mockLoggerWarn.mockReset();
    mockSearchMovieCatalogForMemory.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns catalog candidates without collecting empty-catalog diagnostics', async () => {
    mockGetMovieMemoryCandidatesForUser.mockResolvedValueOnce([
      {
        id: 129,
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: null,
        duration: 125,
        description: 'A girl enters the spirit world.',
        localizedOverview: null,
      },
    ]);

    const result = await loadMovieMemoryCandidatesForUser('42', 'en');

    expect(result).toEqual({
      source: 'catalog',
      emptyStats: undefined,
      movies: [
        {
          id: 129,
          tmdbId: 129,
          movieName: 'Spirited Away',
          movieYear: 2001,
          posterURL: 'https://example.com/poster.jpg',
          localizedName: null,
          duration: 125,
          description: 'A girl enters the spirit world.',
          localizedOverview: null,
        },
      ],
    });
    expect(mockGetMovieMemoryCandidateStatsForUser).not.toHaveBeenCalled();
    expect(mockGetUserMovieMemorySummaries).not.toHaveBeenCalled();
  });

  it('falls back to localized TMDB candidates while excluding existing memory', async () => {
    vi.stubEnv('TMDB_API_KEY', 'tmdb-key');
    mockGetMovieMemoryCandidatesForUser.mockResolvedValueOnce([]);
    mockGetMovieMemoryCandidateStatsForUser.mockResolvedValueOnce({
      catalogCount: 0,
      memoryCount: 1,
      availableCatalogCount: 0,
    });
    mockGetUserMovieMemorySummaries.mockResolvedValueOnce([
      {
        movieKey: 'tmdb:550',
        tmdbId: 550,
        movieName: 'Fight Club',
        movieYear: 1999,
        posterURL: null,
        localizedName: null,
        kind: 'watched',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        Response.json({
          results: [
            {
              id: 550,
              title: 'Бойцовский клуб',
              original_title: 'Fight Club',
              release_date: '1999-10-15',
              poster_path: '/fight.jpg',
              overview: 'Офисный работник встречает торговца мылом.',
            },
            {
              id: 27205,
              title: 'Начало',
              original_title: 'Inception',
              release_date: '2010-07-15',
              poster_path: '/inception.jpg',
              overview: 'Вор крадет секреты через сны.',
            },
          ],
        }),
      ),
    );

    const result = await loadMovieMemoryCandidatesForUser('42', 'ru', { limit: 1 });

    expect(result).toEqual({
      source: 'tmdb',
      emptyStats: { catalogCount: 0, memoryCount: 1, availableCatalogCount: 0 },
      movies: [
        {
          id: -27205,
          tmdbId: 27205,
          movieName: 'Inception',
          movieYear: 2010,
          posterURL: 'https://image.tmdb.org/t/p/w500/inception.jpg',
          localizedName: 'Начало',
          duration: null,
          description: null,
          localizedOverview: 'Вор крадет секреты через сны.',
        },
      ],
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('language=ru-RU'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer tmdb-key', Accept: 'application/json' },
      }),
    );
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('splits batch saves between local catalog rows and transient TMDB rows', async () => {
    mockAddUserMovieMemoryBatchFromCatalog.mockResolvedValueOnce([
      {
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: null,
        localizedName: null,
        kind: 'watched',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
    ]);
    mockGetMovieById.mockResolvedValueOnce({
      id: 550,
      title: 'Fight Club',
      release_date: '1999-10-15',
      poster_path: '/fight.jpg',
    });
    mockGetLocalizedMovieInfo.mockResolvedValueOnce({
      title: 'Бойцовский клуб',
      poster_path: '/fight-ru.jpg',
    });
    mockAddUserMovieMemoryFromExternalMovie.mockResolvedValueOnce({
      movieKey: 'tmdb:550',
      tmdbId: 550,
      movieName: 'Fight Club',
      movieYear: 1999,
      posterURL: 'https://image.tmdb.org/t/p/w500/fight-ru.jpg',
      localizedName: 'Бойцовский клуб',
      kind: 'not_seen',
      updatedAt: '2026-05-20T12:00:00.000Z',
    });

    const result = await addMovieMemoryBatchForUser(
      '42',
      [
        { movieId: 129, kind: 'watched' },
        { movieId: -550, kind: 'not_seen' },
      ],
      'ru',
    );

    expect(result).toHaveLength(2);
    expect(mockAddUserMovieMemoryBatchFromCatalog).toHaveBeenCalledWith('42', [
      { movieId: 129, kind: 'watched' },
    ]);
    expect(mockGetMovieById).toHaveBeenCalledWith(550);
    expect(mockGetLocalizedMovieInfo).toHaveBeenCalledWith(550, 'ru-RU');
    expect(mockAddUserMovieMemoryFromExternalMovie).toHaveBeenCalledWith(
      '42',
      {
        tmdbId: 550,
        movieName: 'Fight Club',
        movieYear: 1999,
        posterURL: 'https://image.tmdb.org/t/p/w500/fight-ru.jpg',
        localizedName: 'Бойцовский клуб',
      },
      'not_seen',
    );
  });
});
