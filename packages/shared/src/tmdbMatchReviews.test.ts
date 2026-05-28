import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDatabase, initDatabase } from './db.js';
import {
  applyTMDBMatchReviewAction,
  listTMDBMatchReviewPage,
  MAX_TMDB_MATCH_REVIEW_OFFSET,
} from './tmdbMatchReviews.js';

vi.mock('pg', () => {
  const mClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const mPool = {
    query: vi.fn(),
    end: vi.fn(),
    connect: vi.fn(async () => mClient),
  };
  return {
    default: {
      Pool: vi.fn(function () {
        return mPool;
      }),
    },
  };
});

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '7',
    movie_id: '42',
    movie_name: 'Solaris',
    movie_year: 1972,
    reason: 'ambiguous_match',
    status: 'open',
    candidates: [
      {
        id: 593,
        title: 'Solaris',
        releaseYear: 1972,
        confidence: 0.94,
      },
    ],
    notes: 'Needs manual confirmation.',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-02T00:00:00.000Z',
    current_movie: {
      id: '42',
      name: 'Solaris',
      year: 1972,
      duration: 166,
      age_rating: 'PG',
      tmdb_id: null,
      poster_url: null,
      localized_name: null,
      tmdb_match_confidence: null,
      tmdb_match_source: null,
      tmdb_matched_at: null,
    },
    ...overrides,
  };
}

describe('tmdb match review actions', () => {
  let poolMock: any;
  let clientMock: any;

  beforeEach(async () => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
    clientMock = await poolMock.connect();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('applies a candidate transactionally and writes an audit row', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reviewRow({ status: 'resolved' })] });
    clientMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reviewRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const updated = await applyTMDBMatchReviewAction({
      reviewId: '7',
      action: 'apply_candidate',
      actor: 'operator@example.test',
      candidateId: 593,
      note: 'Confirmed manually.',
    });

    expect(updated.status).toBe('resolved');
    expect(clientMock.query.mock.calls[0][0]).toBe('BEGIN');
    expect(clientMock.query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(clientMock.query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(clientMock.release).toHaveBeenCalledTimes(1);

    const updateMovieCall = clientMock.query.mock.calls.find(([sql]: [unknown]) =>
      String(sql).includes('UPDATE movies'),
    );
    expect(updateMovieCall?.[1]).toEqual([593, 0.94, 'Solaris', '42']);

    const auditCall = clientMock.query.mock.calls.find(([sql]: [unknown]) =>
      String(sql).includes('INSERT INTO tmdb_match_review_audit'),
    );
    expect(auditCall?.[1]?.slice(0, 6)).toEqual([
      '7',
      'apply_candidate',
      'operator@example.test',
      'Confirmed manually.',
      'open',
      'resolved',
    ]);
    expect(JSON.parse(auditCall?.[1]?.[6])).toEqual({
      id: 593,
      title: 'Solaris',
      releaseYear: 1972,
      confidence: 0.94,
    });
    expect(JSON.parse(auditCall?.[1]?.[7])).toEqual({
      movieId: '42',
      movieName: 'Solaris',
      movieYear: 1972,
      previousMovie: reviewRow().current_movie,
      appliedCandidateId: 593,
    });
  });

  it('rejects duplicate TMDB ownership and rolls back', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });
    clientMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reviewRow()] })
      .mockResolvedValueOnce({ rows: [{ id: '9', name: 'Solaris', year: 1972 }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      applyTMDBMatchReviewAction({
        reviewId: '7',
        action: 'apply_candidate',
        actor: 'operator@example.test',
        candidateId: 593,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(clientMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(
      clientMock.query.mock.calls.some(([sql]: [unknown]) => String(sql).includes('UPDATE movies')),
    ).toBe(false);
    expect(clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('records non-apply decisions without changing movie identity', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reviewRow({ status: 'ignored' })] });
    clientMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reviewRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const updated = await applyTMDBMatchReviewAction({
      reviewId: '7',
      action: 'reject',
      actor: 'operator@example.test',
    });

    expect(updated.status).toBe('ignored');
    expect(
      clientMock.query.mock.calls.some(([sql]: [unknown]) => String(sql).includes('UPDATE movies')),
    ).toBe(false);

    const reviewUpdateCall = clientMock.query.mock.calls.find(([sql]: [unknown]) =>
      String(sql).includes('UPDATE tmdb_match_reviews'),
    );
    expect(reviewUpdateCall?.[1]).toEqual(['ignored', '7']);

    const auditCall = clientMock.query.mock.calls.find(([sql]: [unknown]) =>
      String(sql).includes('INSERT INTO tmdb_match_review_audit'),
    );
    expect(auditCall?.[1]?.slice(0, 6)).toEqual([
      '7',
      'reject',
      'operator@example.test',
      null,
      'open',
      'ignored',
    ]);
  });

  it('does not allow actions on resolved reviews', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });
    clientMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reviewRow({ status: 'resolved' })] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      applyTMDBMatchReviewAction({
        reviewId: '7',
        action: 'reopen',
        actor: 'operator@example.test',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(clientMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(
      clientMock.query.mock.calls.some(([sql]: [unknown]) =>
        String(sql).includes('INSERT INTO tmdb_match_review_audit'),
      ),
    ).toBe(false);
  });

  it('lists review pages with total count', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [{ total_count: 37 }] })
      .mockResolvedValueOnce({ rows: [reviewRow()] });

    const page = await listTMDBMatchReviewPage({
      status: 'deferred',
      reason: 'runtime_mismatch',
      sort: 'oldest',
      limit: 25,
      offset: 50,
    });

    expect(page.totalCount).toBe(37);
    expect(page.limit).toBe(25);
    expect(page.offset).toBe(50);
    expect(page.reviews).toHaveLength(1);
    expect(poolMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('COUNT(*)::int AS total_count'),
      ['deferred', 'runtime_mismatch'],
    );
    expect(poolMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $3\n      OFFSET $4'),
      ['deferred', 'runtime_mismatch', 25, 50],
    );
  });

  it('clamps out-of-range review page limits and offsets', async () => {
    poolMock.query
      .mockResolvedValueOnce({ rows: [{ total_count: 37 }] })
      .mockResolvedValueOnce({ rows: [reviewRow()] })
      .mockResolvedValueOnce({ rows: [{ total_count: 37 }] })
      .mockResolvedValueOnce({ rows: [reviewRow()] });

    const cappedHigh = await listTMDBMatchReviewPage({
      limit: 999,
      offset: MAX_TMDB_MATCH_REVIEW_OFFSET + 1,
    });
    const cappedLow = await listTMDBMatchReviewPage({
      limit: -10,
      offset: -1,
    });

    expect(cappedHigh.limit).toBe(500);
    expect(cappedHigh.offset).toBe(MAX_TMDB_MATCH_REVIEW_OFFSET);
    expect(cappedLow.limit).toBe(1);
    expect(cappedLow.offset).toBe(0);
    expect(poolMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $2\n      OFFSET $3'),
      ['open', 500, MAX_TMDB_MATCH_REVIEW_OFFSET],
    );
    expect(poolMock.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('LIMIT $2\n      OFFSET $3'),
      ['open', 1, 0],
    );
  });
});
