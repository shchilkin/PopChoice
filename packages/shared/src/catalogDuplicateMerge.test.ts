import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDatabase, initDatabase } from './db.js';
import {
  ensureCatalogDuplicateMergeAuditSchema,
  getCatalogDuplicateMergeDryRun,
} from './catalogDuplicateMerge.js';

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

describe('catalog duplicate merge dry-run', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('ensures idempotent audit schema for future transactional merges', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });

    await ensureCatalogDuplicateMergeAuditSchema();

    const sql = String(poolMock.query.mock.calls[0][0]);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS catalog_duplicate_merge_audit');
    expect(sql).toContain("action IN ('merge_movies')");
    expect(sql).toContain('idx_catalog_duplicate_merge_audit_canonical_created_at');
    expect(sql).not.toContain(
      'DROP CONSTRAINT IF EXISTS catalog_duplicate_merge_audit_action_check',
    );
    expect(sql).not.toContain('ADD CONSTRAINT catalog_duplicate_merge_audit_action_check');
  });

  it('returns snapshots, affected row counts, user-memory conflicts, and warnings without mutation', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '10',
            name: 'Memento',
            year: 2000,
            tmdb_id: null,
            poster_url: '/memento.jpg',
            localized_name: 'Memento',
            duration: 113,
            age_rating: 'R',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
          {
            id: '11',
            name: 'The Memento',
            year: 2000,
            tmdb_id: 77,
            poster_url: null,
            localized_name: null,
            duration: 113,
            age_rating: 'R',
            tmdb_match_confidence: 0.94,
            tmdb_match_source: 'backfill_auto',
            tmdb_matched_at: '2026-05-01 00:00:00+00',
            tmdb_metadata_refreshed_at: '2026-05-01 00:00:00+00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            recommendation_movies: 3,
            movie_people: 4,
            movie_genres: 2,
            movie_keywords: 8,
            tmdb_match_reviews: 1,
            user_movie_interactions: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: '5',
            canonical_count: 1,
            loser_count: 1,
            total_conflicts: 1,
            interactions: [
              {
                side: 'canonical',
                movieKey: 'title:memento:2000',
                kind: 'liked',
                tmdbId: null,
                movieName: 'Memento',
                movieYear: 2000,
                updatedAt: '2026-05-28 10:00:00+00',
              },
              {
                side: 'loser',
                movieKey: 'tmdb:77',
                kind: 'watched',
                tmdbId: 77,
                movieName: 'The Memento',
                movieYear: 2000,
                updatedAt: '2026-05-27 10:00:00+00',
              },
            ],
          },
        ],
      });

    const dryRun = await getCatalogDuplicateMergeDryRun({
      canonicalMovieId: 10,
      loserMovieIds: [11],
    });

    expect(dryRun).toMatchObject({
      generatedAt: '2026-06-02T12:00:00.000Z',
      identityKind: 'candidate_normalized_title_year',
      canonical: {
        id: '10',
        identityKey: 'title:memento:2000',
        normalizedTitleYearKey: 'title:memento:2000',
      },
      losers: [
        {
          id: '11',
          identityKey: 'tmdb:77',
          normalizedTitleYearKey: 'title:memento:2000',
        },
      ],
      affectedRows: {
        recommendationRows: { recommendationMovies: 3 },
        metadataRows: { moviePeople: 4, movieGenres: 2, movieKeywords: 8 },
        reviewRows: { tmdbMatchReviews: 1 },
        userMemoryRows: { userMovieInteractions: 2 },
      },
      userMemoryConflicts: {
        totalCount: 1,
        samples: [{ userId: '5', canonicalInteractionCount: 1, loserInteractionCount: 1 }],
      },
    });
    expect(dryRun.warnings).toContain(
      'Normalized title/year groups are candidate duplicates, not proof of identity.',
    );
    expect(dryRun.warnings).toContain(
      'User movie memory has conflicting rows that a transactional merge must coalesce.',
    );

    const dryRunSql = poolMock.query.mock.calls.map(([sql]: [unknown]) => String(sql)).join('\n');
    expect(dryRunSql).not.toMatch(/\b(INSERT|UPDATE|DELETE|BEGIN|COMMIT|ROLLBACK)\b/i);
    expect(poolMock.query.mock.calls[1][1]).toEqual([
      ['11'],
      ['title:memento:2000', 'tmdb:77'],
      ['77'],
    ]);
  });

  it('marks same-TMDB selections as confirmed duplicate anomalies', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '10',
            name: 'Heat',
            year: 1995,
            tmdb_id: 949,
            poster_url: null,
            localized_name: null,
            duration: 170,
            age_rating: 'R',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
          {
            id: '12',
            name: 'Heat Duplicate',
            year: 1995,
            tmdb_id: 949,
            poster_url: null,
            localized_name: null,
            duration: 170,
            age_rating: 'R',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            recommendation_movies: 0,
            movie_people: 0,
            movie_genres: 0,
            movie_keywords: 0,
            tmdb_match_reviews: 0,
            user_movie_interactions: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      getCatalogDuplicateMergeDryRun({ canonicalMovieId: '10', loserMovieIds: ['12'] }),
    ).resolves.toMatchObject({
      identityKind: 'confirmed_tmdb_duplicate',
      warnings: [],
    });

    expect(poolMock.query.mock.calls[1][1]).toEqual([
      ['12'],
      ['tmdb:949', 'title:heat:1995', 'title:heat duplicate:1995'],
      ['949'],
    ]);
    expect(poolMock.query.mock.calls[2][1]).toEqual([
      ['tmdb:949', 'title:heat:1995'],
      ['tmdb:949', 'title:heat duplicate:1995'],
      ['949'],
      ['949'],
      ['tmdb:949', 'title:heat:1995', 'title:heat duplicate:1995'],
      ['949'],
      20,
    ]);
  });

  it('preserves loser-side user-memory rows when movies share a TMDB id', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '10',
            name: 'Heat',
            year: 1995,
            tmdb_id: 949,
            poster_url: null,
            localized_name: null,
            duration: 170,
            age_rating: 'R',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
          {
            id: '12',
            name: 'Heat Duplicate',
            year: 1995,
            tmdb_id: 949,
            poster_url: null,
            localized_name: null,
            duration: 170,
            age_rating: 'R',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            recommendation_movies: 0,
            movie_people: 0,
            movie_genres: 0,
            movie_keywords: 0,
            tmdb_match_reviews: 0,
            user_movie_interactions: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: '7',
            canonical_count: 1,
            loser_count: 1,
            total_conflicts: 1,
            interactions: [
              {
                side: 'canonical',
                movieKey: 'title:heat:1995',
                kind: 'liked',
                tmdbId: 949,
                movieName: 'Heat',
                movieYear: 1995,
                updatedAt: '2026-05-28 10:00:00+00',
              },
              {
                side: 'loser',
                movieKey: 'title:heat duplicate:1995',
                kind: 'watched',
                tmdbId: 949,
                movieName: 'Heat Duplicate',
                movieYear: 1995,
                updatedAt: '2026-05-27 10:00:00+00',
              },
            ],
          },
        ],
      });

    const dryRun = await getCatalogDuplicateMergeDryRun({
      canonicalMovieId: '10',
      loserMovieIds: ['12'],
    });

    expect(dryRun.userMemoryConflicts.samples[0]?.interactions).toEqual([
      expect.objectContaining({ side: 'canonical', movieKey: 'title:heat:1995' }),
      expect.objectContaining({ side: 'loser', movieKey: 'title:heat duplicate:1995' }),
    ]);
    const conflictSql = String(poolMock.query.mock.calls[2][0]);
    expect(conflictSql).toContain('WHEN movie_key = ANY($1::text[])');
    expect(conflictSql).toContain('WHEN movie_key = ANY($2::text[])');
    expect(conflictSql).toContain('AND NOT (tmdb_id = ANY($4::bigint[]))');
    expect(conflictSql).toContain('AND NOT (tmdb_id = ANY($3::bigint[]))');
  });

  it('marks mismatched selections as manual review and warns on multiple TMDB ids', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: '20',
            name: 'Heat',
            year: 1995,
            tmdb_id: 949,
            poster_url: null,
            localized_name: null,
            duration: 170,
            age_rating: 'R',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
          {
            id: '21',
            name: 'The Conversation',
            year: 1974,
            tmdb_id: 592,
            poster_url: null,
            localized_name: null,
            duration: 113,
            age_rating: 'PG',
            tmdb_match_confidence: null,
            tmdb_match_source: null,
            tmdb_matched_at: null,
            tmdb_metadata_refreshed_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            recommendation_movies: 0,
            movie_people: 0,
            movie_genres: 0,
            movie_keywords: 0,
            tmdb_match_reviews: 0,
            user_movie_interactions: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const dryRun = await getCatalogDuplicateMergeDryRun({
      canonicalMovieId: '20',
      loserMovieIds: ['21'],
    });

    expect(dryRun.identityKind).toBe('manual_review_required');
    expect(dryRun.warnings).toContain(
      'Selected movies do not share one TMDB id or normalized title/year key.',
    );
    expect(dryRun.warnings).toContain(
      'Selected movies include multiple TMDB ids; merge requires explicit operator review.',
    );
  });

  it('rejects invalid or self-referential dry-run inputs before querying', async () => {
    await expect(
      getCatalogDuplicateMergeDryRun({ canonicalMovieId: 'abc', loserMovieIds: [11] }),
    ).rejects.toThrow('canonicalMovieId must be a positive integer movie id');

    await expect(
      getCatalogDuplicateMergeDryRun({ canonicalMovieId: '10abc', loserMovieIds: [11] }),
    ).rejects.toThrow('canonicalMovieId must be a positive integer movie id');

    await expect(
      getCatalogDuplicateMergeDryRun({ canonicalMovieId: 10, loserMovieIds: [] }),
    ).rejects.toThrow('At least one loser movie id is required');

    await expect(
      getCatalogDuplicateMergeDryRun({ canonicalMovieId: 10, loserMovieIds: [10] }),
    ).rejects.toThrow('canonicalMovieId cannot also be a loser movie id');

    expect(poolMock.query).not.toHaveBeenCalled();
  });

  it('rejects missing selected movie ids', async () => {
    poolMock.query.mockResolvedValueOnce({
      rows: [
        {
          id: '10',
          name: 'Heat',
          year: 1995,
          tmdb_id: 949,
          poster_url: null,
          localized_name: null,
          duration: 170,
          age_rating: 'R',
          tmdb_match_confidence: null,
          tmdb_match_source: null,
          tmdb_matched_at: null,
          tmdb_metadata_refreshed_at: null,
        },
      ],
    });

    await expect(
      getCatalogDuplicateMergeDryRun({ canonicalMovieId: 10, loserMovieIds: [12] }),
    ).rejects.toThrow('Selected movie ids were not found: 12');

    expect(poolMock.query).toHaveBeenCalledTimes(1);
  });
});
