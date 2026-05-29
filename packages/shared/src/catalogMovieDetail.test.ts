import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCatalogMovieDetail } from './catalogMovieDetail.js';
import { closeDatabase, initDatabase } from './db.js';

vi.mock('pg', () => {
  const mPool = {
    query: vi.fn(),
    end: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

function movieRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '42',
    name: 'Solaris',
    year: 1972,
    age_rating: 'PG',
    description: 'A psychologist visits a space station.',
    duration: 166,
    score_rating: 8.1,
    tmdb_id: 593,
    poster_url: '/poster.jpg',
    localized_name: 'Solyaris',
    tmdb_match_confidence: '0.94',
    tmdb_match_source: 'manual',
    tmdb_matched_at: '2026-05-01T00:00:00.000Z',
    tmdb_metadata: { original_language: 'ru' },
    tmdb_metadata_refreshed_at: '2026-05-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('catalog movie detail query', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('aggregates a movie detail with metadata, health, reviews, duplicates, and repair audit', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [movieRow()] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            person_id: '10',
            tmdb_id: 123,
            name: 'Andrei Tarkovsky',
            profile_path: '/andrei.jpg',
            popularity: '9.5',
            raw_metadata: { known_for_department: 'Directing' },
            tmdb_credit_id: 'director-credit',
            role: 'director',
            character_name: null,
            job: 'Director',
            department: 'Directing',
            billing_order: null,
          },
          {
            id: '2',
            person_id: '11',
            tmdb_id: 456,
            name: 'Natalya Bondarchuk',
            profile_path: null,
            popularity: 4.2,
            raw_metadata: {},
            tmdb_credit_id: 'cast-credit',
            role: 'cast',
            character_name: 'Hari',
            job: null,
            department: null,
            billing_order: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: '5', tmdb_id: 878, name: 'Science Fiction', source: 'tmdb', raw_metadata: {} },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: '6', tmdb_id: 102, name: 'space station', source: 'tmdb', raw_metadata: {} }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            missing_poster_url: false,
            missing_localized_name: false,
            missing_tmdb_id: false,
            missing_runtime: false,
            missing_age_rating: false,
            missing_tmdb_matched_at: false,
            stale_tmdb_metadata: true,
            missing_cast_metadata: false,
            missing_director_metadata: false,
            missing_genre_metadata: false,
            missing_keyword_metadata: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: '99', name: 'Solaris Copy', year: 1972, tmdb_id: 593 }],
      })
      .mockResolvedValueOnce({ rows: [{ id: '100', name: 'Solaris', year: 1972, tmdb_id: null }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '7',
            movie_id: '42',
            movie_name: 'Solaris',
            movie_year: 1972,
            reason: 'ambiguous_match',
            status: 'open',
            candidates: [{ id: 593, title: 'Solaris', releaseYear: 1972, confidence: 0.94 }],
            notes: 'Needs confirmation.',
            created_at: '2026-05-03T00:00:00.000Z',
            updated_at: '2026-05-04T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '12',
            action: 'enqueue_backfill',
            actor: 'operator@example.test',
            issue_key: 'stale_tmdb_metadata',
            target_type: 'movie',
            target_id: '42',
            note: null,
            previous_state: { id: '42' },
            result: { queued: true },
            repair_batch_id: '3',
            repair_batch_item_id: '4',
            created_at: '2026-05-05T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '8',
            review_id: '7',
            action: 'defer',
            actor: 'operator@example.test',
            note: 'Later.',
            previous_status: 'open',
            new_status: 'deferred',
            candidate: null,
            created_at: '2026-05-06T00:00:00.000Z',
          },
        ],
      });

    const result = await getCatalogMovieDetail({
      movieId: '42',
      staleAfterDays: 30,
      duplicateLimit: 5,
      relatedReviewLimit: 10,
      repairAuditLimit: 10,
    });

    expect(result.status).toBe('found');
    if (result.status !== 'found') throw new Error('Expected found detail');
    expect(result.detail.movie).toMatchObject({
      id: '42',
      name: 'Solaris',
      tmdbId: 593,
      tmdbMatchConfidence: 0.94,
      tmdbMetadata: { original_language: 'ru' },
    });
    expect(result.detail.directors[0]).toMatchObject({
      personId: '10',
      name: 'Andrei Tarkovsky',
      tmdbId: 123,
    });
    expect(result.detail.cast[0]).toMatchObject({ name: 'Natalya Bondarchuk', billingOrder: 1 });
    expect(result.detail.genres).toEqual([
      { id: '5', tmdbId: 878, name: 'Science Fiction', source: 'tmdb', rawMetadata: {} },
    ]);
    expect(result.detail.keywords[0]).toMatchObject({ name: 'space station' });
    expect(result.detail.healthFlags.find((flag) => flag.key === 'stale_tmdb_metadata')).toEqual({
      key: 'stale_tmdb_metadata',
      label: 'Stale TMDB metadata',
      isActive: true,
    });
    expect(result.detail.duplicateContext.tmdbIdPeers).toEqual([
      { id: '99', name: 'Solaris Copy', year: 1972, tmdbId: 593 },
    ]);
    expect(result.detail.duplicateContext.normalizedTitleYearPeers).toEqual([
      { id: '100', name: 'Solaris', year: 1972, tmdbId: null },
    ]);
    expect(result.detail.relatedReviews[0]).toMatchObject({
      id: '7',
      movieId: '42',
      candidates: [{ id: 593, title: 'Solaris', releaseYear: 1972, confidence: 0.94 }],
      audit: [{ id: '8', action: 'defer', newStatus: 'deferred' }],
    });
    expect(result.detail.repairAudit[0]).toMatchObject({
      id: '12',
      issueKey: 'stale_tmdb_metadata',
      repairBatchId: '3',
      repairBatchItemId: '4',
    });

    expect(poolMock.query).toHaveBeenCalledTimes(10);
    expect(poolMock.query.mock.calls[0][1]).toEqual(['42']);
    expect(poolMock.query.mock.calls[4][1]).toEqual(['42', 30]);
    expect(poolMock.query.mock.calls[5][1]).toEqual(['42', 5]);
    expect(poolMock.query.mock.calls[7][1]).toEqual(['42', 10]);
    expect(poolMock.query.mock.calls[8][1]).toEqual(['42', 10]);
    expect(poolMock.query.mock.calls[9][1]).toEqual([['7']]);
  });

  it('returns a typed not-found result without companion queries', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });

    await expect(getCatalogMovieDetail({ movieId: '404' })).resolves.toEqual({
      status: 'not_found',
      movieId: '404',
    });
    expect(poolMock.query).toHaveBeenCalledTimes(1);
  });

  it('returns empty arrays for missing companion metadata and avoids review audit query', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [movieRow({ poster_url: null, tmdb_id: null })] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            missing_poster_url: true,
            missing_localized_name: false,
            missing_tmdb_id: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getCatalogMovieDetail({ movieId: 42 });

    expect(result.status).toBe('found');
    if (result.status !== 'found') throw new Error('Expected found detail');
    expect(result.detail.cast).toEqual([]);
    expect(result.detail.directors).toEqual([]);
    expect(result.detail.genres).toEqual([]);
    expect(result.detail.keywords).toEqual([]);
    expect(result.detail.relatedReviews).toEqual([]);
    expect(result.detail.repairAudit).toEqual([]);
    expect(result.detail.healthFlags).toEqual(
      expect.arrayContaining([
        { key: 'missing_poster_url', label: 'Missing poster_url', isActive: true },
        { key: 'missing_tmdb_id', label: 'Missing tmdb_id', isActive: true },
      ]),
    );
    expect(poolMock.query).toHaveBeenCalledTimes(9);
  });

  it('keeps generated SQL read-only and parameterized by movie id', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [movieRow()] }).mockResolvedValue({ rows: [] });

    await getCatalogMovieDetail({ movieId: '42' });

    for (const [sql] of poolMock.query.mock.calls) {
      const statement = String(sql).trim().toLowerCase();
      expect(statement).toMatch(/^(select|with)/);
      expect(statement).not.toMatch(/\b(insert|update|delete|alter|create|drop)\b/);
    }
    expect(poolMock.query.mock.calls[0][1]).toEqual(['42']);
  });
});
