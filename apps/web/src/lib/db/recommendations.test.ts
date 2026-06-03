import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock variables so they are available inside the vi.mock factory
// ---------------------------------------------------------------------------

const { mockQuery, mockConnect, mockRelease, mockClientQuery, mockClient, MockPool } = vi.hoisted(
  () => {
    const mockQuery = vi.fn();
    const mockClientQuery = vi.fn();
    const mockRelease = vi.fn();
    const mockConnect = vi.fn();

    const mockClient = { query: mockClientQuery, release: mockRelease };
    mockConnect.mockResolvedValue(mockClient);

    // Must be a regular function/class — arrow functions cannot be used with `new`
    function MockPool() {
      /* @ts-expect-error – dynamic mock instance */
      this.query = mockQuery;
      /* @ts-expect-error – dynamic mock instance */
      this.connect = mockConnect;
    }

    return { mockQuery, mockConnect, mockRelease, mockClientQuery, mockClient, MockPool };
  },
);

vi.mock('pg', () => ({
  default: { Pool: MockPool },
}));

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Import after mocks are established
import {
  addUserMovieMemoryBatchFromCatalog,
  addUserMovieMemoryFromExternalMovie,
  addUserMovieMemoryFromCatalog,
  claimMorePicksSlot,
  createRecommendation,
  deleteUserMovieMemory,
  getRecommendationTMDBExcludeIds,
  getRecommendationWithMovies,
  getMovieMemoryCandidateStatsForUser,
  getUserMovieMemorySummaries,
  getUserMovieMemoryPage,
  getUserRecommendationSummaries,
  insertMorePicksMovies,
  insertRecommendationMovies,
  createRecommendationFeedback,
  getMovieMemoryCandidatesForUser,
  getUserRecommendationFeedbackMoviePreferences,
  searchMovieCatalogForMemory,
  updateMorePicksStatus,
  updateRecommendationStatus,
  updateRecommendationStage,
} from './recommendations';

import type { MovieRowToInsert } from './recommendations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMovie(overrides: Partial<MovieRowToInsert> = {}): MovieRowToInsert {
  return {
    id: -42,
    name: 'Test Movie',
    year: 2020,
    similarity: 0.8,
    score_rating: 7.5,
    isMainRecommendation: false,
    fromTMDB: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createRecommendation
// ---------------------------------------------------------------------------

describe('createRecommendation', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores the optional owner user id when present', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rec-id', slug: 'abc123' }] });

    const result = await createRecommendation({ favoriteMovie: 'Arrival' } as never, '42');

    expect(result).toEqual({ id: 'rec-id', slug: 'abc123' });
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('user_id');
    expect(params[2]).toBe('42');
    expect(params[3]).toBe('hybrid-fast');
    expect(params[4]).toBe('normal-match');
  });

  it('stores null owner for anonymous recommendations', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rec-id', slug: 'abc123' }] });

    await createRecommendation({ favoriteMovie: 'Arrival' } as never);

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[2]).toBeNull();
  });

  it('stores recommendation source strategy and experience mode metadata when present', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rec-id', slug: 'abc123' }] });

    await createRecommendation(
      { favoriteMovie: 'Arrival' } as never,
      undefined,
      'tmdb-first',
      'fast-pick',
    );

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('source_strategy');
    expect(sql).toContain('experience_mode');
    expect(params[3]).toBe('tmdb-first');
    expect(params[4]).toBe('fast-pick');
  });
});

// ---------------------------------------------------------------------------
// getUserRecommendationSummaries
// ---------------------------------------------------------------------------

describe('getUserRecommendationSummaries', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns saved recommendation summaries without raw quiz data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          slug: 'rec-slug',
          status: 'completed',
          stage: 'complete',
          created_at: new Date('2026-05-15T10:00:00.000Z'),
          completed_at: null,
          quiz_data: [{ name: 'Alex' }, { name: 'Sam' }],
          poster_url: 'https://example.com/poster.jpg',
          localized_name: 'Localized Movie',
          tmdb_id: 123,
          tmdb_name: null,
          tmdb_year: null,
          m_name: 'Movie',
          m_year: 2024,
          feedback_kind: 'useful',
        },
      ],
    });

    const result = await getUserRecommendationSummaries('42');

    expect(result).toEqual([
      {
        slug: 'rec-slug',
        status: 'completed',
        stage: 'complete',
        createdAt: '2026-05-15T10:00:00.000Z',
        completedAt: null,
        peopleCount: 2,
        movieName: 'Localized Movie',
        movieYear: 2024,
        posterURL: 'https://example.com/poster.jpg',
        feedbackKind: 'useful',
      },
    ]);
    expect(result[0]).not.toHaveProperty('quizData');
    expect(mockQuery.mock.calls[0]?.[0]).toContain('recommendation_feedback');
  });
});

// ---------------------------------------------------------------------------
// createRecommendationFeedback
// ---------------------------------------------------------------------------

describe('createRecommendationFeedback', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores feedback for a completed recommendation slug', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 'feedback-id', recommendation_id: 'rec-id' }],
      }) // INSERT feedback
      .mockResolvedValueOnce({
        rows: [
          {
            tmdb_id: 123,
            movie_name: 'Joker',
            movie_year: 2019,
            poster_url: 'https://example.com/poster.jpg',
            localized_name: 'Джокер',
          },
        ],
      }) // SELECT main movie
      .mockResolvedValueOnce({}) // UPSERT interaction
      .mockResolvedValueOnce({}); // COMMIT

    const result = await createRecommendationFeedback({
      slug: 'rec-slug',
      kind: 'already_watched',
      userId: '42',
    });

    expect(result).toEqual({ id: 'feedback-id' });
    const [sql, params] = mockClientQuery.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain('recommendation_feedback');
    expect(sql).toContain("status = 'completed'");
    expect(sql).toContain('user_id = $2');
    expect(params).toEqual(['rec-slug', '42', 'already_watched']);
    const [interactionSql, interactionParams] = mockClientQuery.mock.calls[3] as [
      string,
      unknown[],
    ];
    expect(interactionSql).toContain('user_movie_interactions');
    expect(interactionParams).toContain('tmdb:123');
    expect(interactionParams).toContain('watched');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('returns null when no completed recommendation is found', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // INSERT feedback
      .mockResolvedValueOnce({}); // COMMIT

    const result = await createRecommendationFeedback({
      slug: 'missing',
      kind: 'wrong_mood',
    });

    expect(result).toBeNull();
    const [, params] = mockClientQuery.mock.calls[1] as [string, unknown[]];
    expect(params).toEqual(['missing', null, 'wrong_mood']);
    expect(mockClientQuery).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// getUserRecommendationFeedbackMoviePreferences
// ---------------------------------------------------------------------------

describe('getUserRecommendationFeedbackMoviePreferences', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns movies attached to actionable user feedback', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            kind: 'watched',
            movie_key: 'tmdb:475557',
            tmdb_id: 475557,
            movie_name: 'Joker',
            movie_year: 2019,
          },
          {
            kind: 'wrong_mood',
            movie_key: 'title:arrival:2016',
            tmdb_id: null,
            movie_name: 'Arrival',
            movie_year: 2016,
          },
          {
            kind: 'liked',
            movie_key: 'tmdb:496243',
            tmdb_id: 496243,
            movie_name: 'Parasite',
            movie_year: 2019,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            tmdb_id: 129,
            movie_name: 'Spirited Away',
            movie_year: 2001,
          },
          {
            tmdb_id: 128,
            movie_name: 'Princess Mononoke',
            movie_year: 1997,
          },
        ],
      });

    const result = await getUserRecommendationFeedbackMoviePreferences('42');

    expect(result).toEqual([
      {
        kind: 'watched',
        movieKey: 'tmdb:475557',
        tmdbId: 475557,
        movieName: 'Joker',
        movieYear: 2019,
      },
      {
        kind: 'wrong_mood',
        movieKey: 'title:arrival:2016',
        tmdbId: null,
        movieName: 'Arrival',
        movieYear: 2016,
      },
      {
        kind: 'liked',
        movieKey: 'tmdb:496243',
        tmdbId: 496243,
        movieName: 'Parasite',
        movieYear: 2019,
      },
      {
        kind: 'recently_recommended',
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
      },
      {
        kind: 'recently_recommended',
        movieKey: 'tmdb:128',
        tmdbId: 128,
        movieName: 'Princess Mononoke',
        movieYear: 1997,
      },
    ]);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('user_movie_interactions');
    expect(sql).toContain("kind IN ('watched', 'liked', 'not_interested', 'wrong_mood')");
    const [recentSql, recentParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    const recentWindowIndex = recentSql.indexOf('WITH recent_recommendations AS');
    const recentWindowLimitIndex = recentSql.indexOf('LIMIT $2');
    const movieJoinIndex = recentSql.indexOf('JOIN recommendation_movies rm');
    expect(recentWindowIndex).toBeGreaterThanOrEqual(0);
    expect(recentWindowLimitIndex).toBeGreaterThan(recentWindowIndex);
    expect(movieJoinIndex).toBeGreaterThan(recentWindowLimitIndex);
    expect(recentSql).not.toContain('JOIN LATERAL');
    expect(recentSql).not.toContain('LIMIT 1');
    expect(params).toEqual(['42', 100]);
    expect(recentParams).toEqual(['42', 100]);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// user movie memory summaries
// ---------------------------------------------------------------------------

describe('getUserMovieMemorySummaries', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns explicit movie memory ordered by most recent update', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          kind: 'watched',
          movie_key: 'tmdb:129',
          tmdb_id: 129,
          movie_name: 'Spirited Away',
          movie_year: 2001,
          poster_url: 'https://example.com/poster.jpg',
          localized_name: 'Унесённые призраками',
          updated_at: new Date('2026-05-17T10:00:00.000Z'),
        },
      ],
    });

    const result = await getUserMovieMemorySummaries('42');

    expect(result).toEqual([
      {
        kind: 'watched',
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
        updatedAt: '2026-05-17T10:00:00.000Z',
      },
    ]);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM user_movie_interactions ui');
    expect(sql).toContain(
      'COALESCE(ui.poster_url, catalog_movie.poster_url, source_movie.poster_url)',
    );
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('FROM movies m');
    expect(sql).toContain('FROM recommendation_movies rm');
    expect(sql).toContain('ORDER BY ui.updated_at DESC');
    expect(params).toEqual(['42', 50]);
  });
});

describe('getUserMovieMemoryPage', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns paginated movie memory with total and next offset', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          kind: 'watched',
          movie_key: 'tmdb:129',
          tmdb_id: 129,
          movie_name: 'Spirited Away',
          movie_year: 2001,
          poster_url: 'https://example.com/poster.jpg',
          localized_name: 'Унесённые призраками',
          updated_at: new Date('2026-05-17T10:00:00.000Z'),
          total_count: '75',
        },
      ],
    });

    const result = await getUserMovieMemoryPage('42', { limit: 25, offset: 50 });

    expect(result).toEqual({
      items: [
        {
          kind: 'watched',
          movieKey: 'tmdb:129',
          tmdbId: 129,
          movieName: 'Spirited Away',
          movieYear: 2001,
          posterURL: 'https://example.com/poster.jpg',
          localizedName: 'Унесённые призраками',
          updatedAt: '2026-05-17T10:00:00.000Z',
        },
      ],
      total: 75,
      nextOffset: 51,
    });
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('COUNT(*) OVER() AS total_count');
    expect(sql).toContain('LIMIT $2 OFFSET $3');
    expect(params).toEqual(['42', 25, 50]);
  });
});

describe('searchMovieCatalogForMemory', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns local catalog matches for manual movie memory', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 129,
          tmdb_id: 129,
          name: 'Spirited Away',
          year: 2001,
          poster_url: 'https://example.com/poster.jpg',
          localized_name: 'Унесённые призраками',
          duration: 125,
          description: 'A girl enters a world of spirits.',
        },
      ],
    });

    const result = await searchMovieCatalogForMemory('spirited');

    expect(result).toEqual([
      {
        id: 129,
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
        duration: 125,
        description: 'A girl enters a world of spirits.',
        localizedOverview: null,
      },
    ]);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM movies');
    expect(sql).toContain('poster_url');
    expect(sql).toContain('ILIKE');
    expect(params).toEqual(['%spirited%', 8]);
  });

  it('does not search for very short queries', async () => {
    await expect(searchMovieCatalogForMemory('s')).resolves.toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('getMovieMemoryCandidatesForUser', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns poster-first candidate movies excluding existing memory', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 680,
          tmdb_id: 680,
          name: 'Pulp Fiction',
          year: 1994,
          poster_url: 'https://example.com/pulp.jpg',
          localized_name: null,
          duration: 154,
          description: 'Interlocking stories in Los Angeles.',
          score_rating: 8.9,
        },
        {
          id: 1,
          tmdb_id: null,
          name: 'Local Movie',
          year: 2020,
          poster_url: null,
          localized_name: 'Локальный фильм',
          duration: 102,
          description: 'A local catalog entry.',
          score_rating: 7.1,
        },
      ],
    });

    const result = await getMovieMemoryCandidatesForUser('42', 2);

    expect(result).toEqual([
      {
        id: 680,
        tmdbId: 680,
        movieName: 'Pulp Fiction',
        movieYear: 1994,
        posterURL: 'https://example.com/pulp.jpg',
        localizedName: null,
        duration: 154,
        description: 'Interlocking stories in Los Angeles.',
        localizedOverview: null,
      },
      {
        id: 1,
        tmdbId: null,
        movieName: 'Local Movie',
        movieYear: 2020,
        posterURL: null,
        localizedName: 'Локальный фильм',
        duration: 102,
        description: 'A local catalog entry.',
        localizedOverview: null,
      },
    ]);
    expect(mockQuery).toHaveBeenCalledOnce();
    const [catalogSql, catalogParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(catalogSql).toContain('FROM movies');
    expect(catalogSql).toContain('NOT EXISTS');
    expect(catalogSql).toContain('user_movie_interactions');
    expect(catalogSql).toContain('score_rating');
    expect(catalogParams).toEqual(['42', 2]);
  });

  it('returns candidate diagnostics for empty decks', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ catalog_count: '48', memory_count: '48', available_catalog_count: '0' }],
    });

    const result = await getMovieMemoryCandidateStatsForUser('42');

    expect(result).toEqual({
      catalogCount: 48,
      memoryCount: 48,
      availableCatalogCount: 0,
    });
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('available_catalog_count');
    expect(sql).toContain('NOT EXISTS');
    expect(params).toEqual(['42']);
  });
});

describe('addUserMovieMemoryFromCatalog', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('upserts a watched movie memory item from the local catalog', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            tmdb_id: 129,
            name: 'Spirited Away',
            year: 2001,
            poster_url: 'https://example.com/poster.jpg',
            localized_name: 'Унесённые призраками',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            kind: 'watched',
            movie_key: 'tmdb:129',
            tmdb_id: 129,
            movie_name: 'Spirited Away',
            movie_year: 2001,
            poster_url: 'https://example.com/poster.jpg',
            localized_name: 'Унесённые призраками',
            updated_at: new Date('2026-05-20T12:00:00.000Z'),
          },
        ],
      });

    const result = await addUserMovieMemoryFromCatalog('42', 129, 'watched');

    expect(result).toEqual({
      kind: 'watched',
      movieKey: 'tmdb:129',
      tmdbId: 129,
      movieName: 'Spirited Away',
      movieYear: 2001,
      posterURL: 'https://example.com/poster.jpg',
      localizedName: 'Унесённые призраками',
      updatedAt: '2026-05-20T12:00:00.000Z',
    });
    const [lookupSql, lookupParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(lookupSql).toContain('FROM movies');
    expect(lookupParams).toEqual([129]);
    const [upsertSql, upsertParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(upsertSql).toContain('INSERT INTO user_movie_interactions');
    expect(upsertParams).toEqual([
      '42',
      'tmdb:129',
      129,
      'Spirited Away',
      2001,
      'https://example.com/poster.jpg',
      'Унесённые призраками',
      'watched',
    ]);
  });

  it('returns null when the catalog movie is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(addUserMovieMemoryFromCatalog('42', 999, 'watched')).resolves.toBeNull();
    expect(mockQuery).toHaveBeenCalledOnce();
  });
});

describe('addUserMovieMemoryFromExternalMovie', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('upserts a TMDB movie memory item without requiring a local catalog row', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          kind: 'watched',
          movie_key: 'tmdb:550',
          tmdb_id: 550,
          movie_name: 'Fight Club',
          movie_year: 1999,
          poster_url: 'https://image.tmdb.org/t/p/w500/fight.jpg',
          localized_name: null,
          updated_at: new Date('2026-05-20T12:00:00.000Z'),
        },
      ],
    });

    const result = await addUserMovieMemoryFromExternalMovie(
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

    expect(result).toEqual({
      kind: 'watched',
      movieKey: 'tmdb:550',
      tmdbId: 550,
      movieName: 'Fight Club',
      movieYear: 1999,
      posterURL: 'https://image.tmdb.org/t/p/w500/fight.jpg',
      localizedName: null,
      updatedAt: '2026-05-20T12:00:00.000Z',
    });
    const [upsertSql, upsertParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(upsertSql).toContain('INSERT INTO user_movie_interactions');
    expect(upsertParams).toEqual([
      '42',
      'tmdb:550',
      550,
      'Fight Club',
      1999,
      'https://image.tmdb.org/t/p/w500/fight.jpg',
      null,
      'watched',
    ]);
  });
});

describe('addUserMovieMemoryBatchFromCatalog', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deduplicates movie ids and upserts the latest choice for each movie', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            tmdb_id: 129,
            name: 'Spirited Away',
            year: 2001,
            poster_url: 'https://example.com/poster.jpg',
            localized_name: 'Унесённые призраками',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            kind: 'not_seen',
            movie_key: 'tmdb:129',
            tmdb_id: 129,
            movie_name: 'Spirited Away',
            movie_year: 2001,
            poster_url: 'https://example.com/poster.jpg',
            localized_name: 'Унесённые призраками',
            updated_at: new Date('2026-05-20T12:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await addUserMovieMemoryBatchFromCatalog('42', [
      { movieId: 129, kind: 'watched' },
      { movieId: 129, kind: 'not_seen' },
      { movieId: 999, kind: 'watched' },
    ]);

    expect(result).toEqual([
      {
        kind: 'not_seen',
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
        posterURL: 'https://example.com/poster.jpg',
        localizedName: 'Унесённые призраками',
        updatedAt: '2026-05-20T12:00:00.000Z',
      },
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual([129]);
    const [, upsertParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(upsertParams[7]).toBe('not_seen');
    expect(mockQuery.mock.calls[2]?.[1]).toEqual([999]);
  });
});

describe('deleteUserMovieMemory', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deletes one movie memory item for the user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const result = await deleteUserMovieMemory('42', 'tmdb:129');

    expect(result).toBe(true);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('DELETE FROM user_movie_interactions');
    expect(params).toEqual(['42', 'tmdb:129']);
  });

  it('returns false when no row was deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    await expect(deleteUserMovieMemory('42', 'tmdb:129')).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// claimMorePicksSlot
// ---------------------------------------------------------------------------

describe('claimMorePicksSlot', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when the query returns no rows (already claimed or not completed)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await claimMorePicksSlot('some-slug');

    expect(result).toBeNull();
  });

  it('returns recommendationId and quizData when the slot is successfully claimed', async () => {
    const quizData = { favoriteMovie: 'Inception', newVsClassic: 'new' };
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'rec-uuid-123', quiz_data: quizData }],
    });

    const result = await claimMorePicksSlot('my-slug');

    expect(result).toEqual({ recommendationId: 'rec-uuid-123', quizData });
  });

  it('passes the slug to the UPDATE query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await claimMorePicksSlot('target-slug');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE recommendations');
    expect(params).toContain('target-slug');
  });
});

// ---------------------------------------------------------------------------
// getRecommendationTMDBExcludeIds
// ---------------------------------------------------------------------------

describe('getRecommendationTMDBExcludeIds', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns TMDB ids in negative excludeId form', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ tmdb_id: 321 }, { tmdb_id: 654 }],
    });

    const result = await getRecommendationTMDBExcludeIds('rec-uuid');

    expect(result).toEqual([-321, -654]);
  });

  it('passes the recommendation id to the lookup query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getRecommendationTMDBExcludeIds('rec-uuid');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM recommendation_movies');
    expect(params).toContain('rec-uuid');
  });
});

// ---------------------------------------------------------------------------
// updateMorePicksStatus
// ---------------------------------------------------------------------------

describe('updateMorePicksStatus', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('executes an UPDATE with the given status', async () => {
    await updateMorePicksStatus('rec-id', 'processing');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('processing');
    expect(params).toContain('rec-id');
  });

  it('passes the error message when provided', async () => {
    await updateMorePicksStatus('rec-id', 'failed', 'something went wrong');

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain('something went wrong');
  });

  it('passes null for error when not provided', async () => {
    await updateMorePicksStatus('rec-id', 'completed');

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(null);
  });
});

// ---------------------------------------------------------------------------
// updateRecommendationStatus
// ---------------------------------------------------------------------------

describe('updateRecommendationStatus', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets stage to complete when recommendation completes', async () => {
    await updateRecommendationStatus('rec-id', 'completed');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('stage = COALESCE($4, stage)');
    expect(params[0]).toBe('completed');
    expect(params[3]).toBe('complete');
    expect(params[4]).toBe('rec-id');
  });

  it('sets stage to failed when recommendation fails', async () => {
    await updateRecommendationStatus('rec-id', 'failed', 'pipeline failed');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe('failed');
    expect(params[1]).toBe('pipeline failed');
    expect(params[3]).toBe('failed');
  });

  it('preserves the current stage for non-terminal statuses', async () => {
    await updateRecommendationStatus('rec-id', 'processing');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe('processing');
    expect(params[3]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateRecommendationStage
// ---------------------------------------------------------------------------

describe('updateRecommendationStage', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('updates the recommendation stage without changing status', async () => {
    await updateRecommendationStage('rec-id', 'embedding');

    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('UPDATE recommendations SET stage = $1');
    expect(params).toEqual(['embedding', 'rec-id']);
  });
});

// ---------------------------------------------------------------------------
// insertMorePicksMovies
// ---------------------------------------------------------------------------

describe('insertMorePicksMovies', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does nothing when passed an empty movies array', async () => {
    await insertMorePicksMovies('rec-id', []);

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('wraps inserts in a transaction (BEGIN / COMMIT)', async () => {
    // BEGIN, SELECT FOR UPDATE (lock), SELECT MAX, INSERT, COMMIT
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ max_pos: null }] }) // SELECT MAX
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await insertMorePicksMovies('rec-id', [makeMovie()]);

    const calls = mockClientQuery.mock.calls.map((c) => (c[0] as string).trim().toUpperCase());
    expect(calls[0]).toBe('BEGIN');
    expect(calls[calls.length - 1]).toBe('COMMIT');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('starts position at 0 when there are no existing movies', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ max_pos: null }] }) // SELECT MAX → null
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await insertMorePicksMovies('rec-id', [makeMovie()]);

    // The INSERT call (4th call, index 3) should include position 0
    const [, params] = mockClientQuery.mock.calls[3] as [string, unknown[]];
    expect(params).toContain(0);
  });

  it('appends after existing movies by using max_pos + 1 as start', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ max_pos: 5 }] }) // SELECT MAX → 5
      .mockResolvedValueOnce({}) // INSERT first movie (pos 6)
      .mockResolvedValueOnce({}) // INSERT second movie (pos 7)
      .mockResolvedValueOnce({}); // COMMIT

    await insertMorePicksMovies('rec-id', [makeMovie(), makeMovie({ name: 'Another Movie' })]);

    const firstInsertParams = mockClientQuery.mock.calls[3] as [string, unknown[]];
    const secondInsertParams = mockClientQuery.mock.calls[4] as [string, unknown[]];
    expect(firstInsertParams[1]).toContain(6);
    expect(secondInsertParams[1]).toContain(7);
  });

  it('stores the original TMDB id for TMDB-only rows', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ max_pos: null }] }) // SELECT MAX
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await insertMorePicksMovies('rec-id', [makeMovie({ id: -42 })]);

    const [, params] = mockClientQuery.mock.calls[3] as [string, unknown[]];
    expect(params).toContain(42);
  });

  it('rolls back and rethrows on insert failure', async () => {
    const insertError = new Error('DB insert failed');
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'rec-id' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ max_pos: 0 }] }) // SELECT MAX
      .mockRejectedValueOnce(insertError) // INSERT fails
      .mockResolvedValueOnce({}); // ROLLBACK

    await expect(insertMorePicksMovies('rec-id', [makeMovie()])).rejects.toThrow(
      'DB insert failed',
    );

    const calls = mockClientQuery.mock.calls.map((c) => (c[0] as string).trim().toUpperCase());
    expect(calls).toContain('ROLLBACK');
    expect(mockRelease).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// insertRecommendationMovies
// ---------------------------------------------------------------------------

describe('insertRecommendationMovies', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockConnect.mockReset();
    mockClientQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores the original TMDB id for TMDB recommendations', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE recommendations metadata
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await insertRecommendationMovies('rec-id', [makeMovie({ id: -77 })], false);

    const [, params] = mockClientQuery.mock.calls[2] as [string, unknown[]];
    expect(params).toContain(77);
    expect(params).toContain('tmdb-discover');
  });

  it('stores a matched TMDB id for local recommendations', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE recommendations metadata
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await insertRecommendationMovies(
      'rec-id',
      [makeMovie({ id: 42, tmdbId: 129, fromTMDB: false })],
      false,
    );

    const [, params] = mockClientQuery.mock.calls[2] as [string, unknown[]];
    expect(params).toContain(129);
    expect(params).toContain(42);
    expect(params).toContain('local-cache');
  });

  it('stores explicit recommendation candidate source provenance', async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE recommendations metadata
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await insertRecommendationMovies(
      'rec-id',
      [makeMovie({ id: 42, fromTMDB: false, source: 'curated' })],
      false,
    );

    const [sql, params] = mockClientQuery.mock.calls[2] as [string, unknown[]];
    expect(sql).toContain('from_tmdb, source, tmdb_id');
    expect(params).toContain('curated');
  });
});

// ---------------------------------------------------------------------------
// getRecommendationWithMovies
// ---------------------------------------------------------------------------

describe('getRecommendationWithMovies', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns negative TMDB ids for TMDB-only movies', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rec-id',
            status: 'completed',
            stage: 'complete',
            error: null,
            used_broader_search: false,
            db_movie_count: 12,
            quiz_data: null,
            experience_mode: 'normal-match',
            more_picks_status: null,
            source_strategy: 'tmdb-first',
            user_id: '42',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            rm_id: 999,
            movie_id: null,
            position: 0,
            is_main_recommendation: false,
            ai_description: 'desc',
            poster_url: 'poster',
            localized_name: 'Localized',
            similarity: 0.8,
            from_tmdb: true,
            source: 'tmdb-search',
            tmdb_id: 321,
            tmdb_name: 'TMDB Movie',
            tmdb_year: 2024,
            tmdb_score_rating: 8.2,
            tmdb_duration: 111,
            tmdb_age_rating: 'PG-13',
            m_name: null,
            m_year: null,
            m_age_rating: null,
            m_duration: null,
            m_score_rating: null,
          },
        ],
      });

    const result = await getRecommendationWithMovies('slug-123', '42');

    expect(result?.movies[0]?.id).toBe(-321);
    expect(result?.movies[0]?.source).toBe('tmdb-search');
    expect(result?.experienceMode).toBe('normal-match');
    expect(result?.sourceStrategy).toBe('tmdb-first');
    expect(result?.stage).toBe('complete');
    expect(result?.viewerCanRate).toBe(true);
    expect(result?.isSharedResult).toBe(false);
  });

  it('treats numeric database user ids as owned by the matching signed-in viewer', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rec-id',
            status: 'completed',
            stage: 'complete',
            error: null,
            used_broader_search: false,
            db_movie_count: 12,
            quiz_data: null,
            experience_mode: 'normal-match',
            more_picks_status: null,
            source_strategy: 'tmdb-first',
            user_id: 42,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getRecommendationWithMovies('slug-123', '42');

    expect(result?.viewerCanRate).toBe(true);
    expect(result?.isSharedResult).toBe(false);
  });

  it('returns redacted group metadata instead of raw quiz data', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rec-id',
            status: 'completed',
            stage: 'complete',
            error: null,
            used_broader_search: false,
            db_movie_count: 12,
            quiz_data: [
              {
                name: 'Alex',
                favoriteMovie: 'Arrival',
                newVsClassic: 'New',
                moodPreference: ['Drama', 'Sci-Fi'],
                tonePreference: 'Balanced',
                favoriteActor: 'Amy Adams',
              },
              {
                name: 'Sam',
                favoriteMovie: 'Paddington 2',
                newVsClassic: 'Both new and classic',
                moodPreference: ['Comedy', 'Drama'],
                tonePreference: 'Light and fun',
                favoriteActor: 'Amy Adams',
              },
            ],
            experience_mode: 'normal-match',
            more_picks_status: null,
            source_strategy: 'compromise-hybrid',
            user_id: 'owner-1',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getRecommendationWithMovies('slug-123', 'viewer-1');

    expect(result?.peopleCount).toBe(2);
    expect(result?.viewerCanRate).toBe(false);
    expect(result?.isSharedResult).toBe(true);
    expect(result?.hasActorSignal).toBe(true);
    expect(result?.groupInsights).toEqual(
      expect.objectContaining({
        participantNames: ['Alex', 'Sam'],
        sharedMoods: ['Drama'],
        favoriteActors: ['Amy Adams'],
      }),
    );
    expect(result).not.toHaveProperty('quizData');
  });
});
