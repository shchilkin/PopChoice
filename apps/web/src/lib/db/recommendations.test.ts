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
  claimMorePicksSlot,
  getRecommendationTMDBExcludeIds,
  getRecommendationWithMovies,
  insertMorePicksMovies,
  insertRecommendationMovies,
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
            more_picks_status: null,
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

    const result = await getRecommendationWithMovies('slug-123');

    expect(result?.movies[0]?.id).toBe(-321);
    expect(result?.stage).toBe('complete');
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
            more_picks_status: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getRecommendationWithMovies('slug-123');

    expect(result?.peopleCount).toBe(2);
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
