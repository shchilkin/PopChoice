import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCatalogHealthReport,
  isCatalogHealthIssueResolvedForMovie,
  isCatalogHealthIssueKey,
  listCatalogHealthIssueMoviePage,
  MAX_CATALOG_HEALTH_ISSUE_OFFSET,
  MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
} from './catalogHealth.js';
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

describe('catalog health issue movie pages', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('lists bounded movie pages for a catalog-health issue', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: 351 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: '334',
          name: 'Memento',
          year: 2000,
          tmdb_id: 77,
          poster_url: null,
          localized_name: null,
          duration: 113,
          age_rating: 'R',
          tmdb_matched_at: null,
        },
      ],
    });

    const page = await listCatalogHealthIssueMoviePage({
      issueKey: 'missing_poster_url',
      limit: 500,
      offset: MAX_CATALOG_HEALTH_ISSUE_OFFSET + 1,
      staleAfterDays: 180,
    });

    expect(page).toMatchObject({
      issueKey: 'missing_poster_url',
      label: 'Missing poster_url',
      totalCount: 351,
      limit: MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
      offset: MAX_CATALOG_HEALTH_ISSUE_OFFSET,
      movies: [{ id: '334', name: 'Memento', tmdb_id: 77 }],
    });
    expect(poolMock.query).toHaveBeenCalledTimes(2);
    expect(poolMock.query.mock.calls[0][1]).toEqual([]);
    expect(poolMock.query.mock.calls[1][1]).toEqual([
      MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
      MAX_CATALOG_HEALTH_ISSUE_OFFSET,
    ]);
  });

  it('keeps TMDB-dependent metadata counts behind the missing-tmdb-id hierarchy', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            total_movies: 1,
            missing_poster_url: 0,
            missing_localized_name: 0,
            missing_tmdb_id: 1,
            missing_runtime: 0,
            missing_age_rating: 0,
            missing_tmdb_matched_at: 0,
            stale_tmdb_metadata: 0,
            missing_cast_metadata: 0,
            missing_director_metadata: 0,
            missing_genre_metadata: 0,
            missing_keyword_metadata: 0,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '334',
            name: 'Memento',
            year: 2000,
            tmdb_id: null,
            poster_url: null,
            localized_name: null,
            duration: 0,
            age_rating: '',
            tmdb_matched_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const report = await getCatalogHealthReport({ sampleLimit: 5, staleAfterDays: 180 });

    expect(report.issues.find((issue) => issue.key === 'missing_tmdb_id')).toMatchObject({
      count: 1,
      samples: [{ id: '334', tmdb_id: null }],
    });
    expect(report.issues.find((issue) => issue.key === 'missing_poster_url')?.count).toBe(0);
    const summarySql = String(poolMock.query.mock.calls[0][0]);
    expect(summarySql).toContain(
      "tmdb_id IS NOT NULL AND (poster_url IS NULL OR btrim(poster_url) = '')",
    );
    expect(summarySql).toContain('tmdb_id IS NOT NULL AND duration <= 0');
    expect(summarySql).toContain(
      "tmdb_id IS NOT NULL AND (age_rating IS NULL OR btrim(age_rating) = '')",
    );
    expect(summarySql).toContain('tmdb_metadata_refreshed_at IS NULL');
  });

  it('keeps stale metadata threshold parameterized separately from pagination', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ count: 2 }] }).mockResolvedValueOnce({
      rows: [],
    });

    await listCatalogHealthIssueMoviePage({
      issueKey: 'stale_tmdb_metadata',
      limit: 25,
      offset: 50,
      staleAfterDays: 90,
    });

    expect(poolMock.query.mock.calls[0][1]).toEqual([90]);
    expect(poolMock.query.mock.calls[1][1]).toEqual([90, 25, 50]);
    expect(String(poolMock.query.mock.calls[1][0])).toContain('LIMIT $2');
    expect(String(poolMock.query.mock.calls[1][0])).toContain('OFFSET $3');
    expect(String(poolMock.query.mock.calls[1][0])).toContain('tmdb_metadata_refreshed_at');
  });

  it('re-checks whether one movie still matches the original issue predicate', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ issue_exists: false }] });

    await expect(
      isCatalogHealthIssueResolvedForMovie({
        issueKey: 'missing_poster_url',
        movieId: '334',
        staleAfterDays: 180,
      }),
    ).resolves.toBe(true);

    expect(String(poolMock.query.mock.calls[0][0])).toContain('WHERE id = $1');
    expect(String(poolMock.query.mock.calls[0][0])).toContain(
      "tmdb_id IS NOT NULL AND (poster_url IS NULL OR btrim(poster_url) = '')",
    );
    expect(poolMock.query.mock.calls[0][1]).toEqual(['334']);
  });

  it('considers missing localized_name resolved after a TMDB metadata refresh', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ issue_exists: false }] });

    await expect(
      isCatalogHealthIssueResolvedForMovie({
        issueKey: 'missing_localized_name',
        movieId: '334',
        staleAfterDays: 180,
      }),
    ).resolves.toBe(true);

    const sql = String(poolMock.query.mock.calls[0][0]);
    expect(sql).toContain("(localized_name IS NULL OR btrim(localized_name) = '')");
    expect(sql).toContain('tmdb_metadata_refreshed_at IS NULL');
    expect(poolMock.query.mock.calls[0][1]).toEqual(['334']);
  });

  it('keeps stale metadata threshold parameterized when re-checking one movie', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [{ issue_exists: true }] });

    await expect(
      isCatalogHealthIssueResolvedForMovie({
        issueKey: 'stale_tmdb_metadata',
        movieId: '334',
        staleAfterDays: 90,
      }),
    ).resolves.toBe(false);

    expect(String(poolMock.query.mock.calls[0][0])).toContain('WHERE id = $2');
    expect(String(poolMock.query.mock.calls[0][0])).toContain('tmdb_metadata_refreshed_at');
    expect(poolMock.query.mock.calls[0][1]).toEqual([90, '334']);
  });

  it('rejects unknown issue keys before building SQL', async () => {
    expect(isCatalogHealthIssueKey('missing_poster_url')).toBe(true);
    expect(isCatalogHealthIssueKey('missing_original_language')).toBe(true);
    expect(isCatalogHealthIssueKey('missing_watch_provider_us')).toBe(true);
    expect(isCatalogHealthIssueKey('low_metadata_quality')).toBe(true);
    expect(isCatalogHealthIssueKey('drop table movies')).toBe(false);

    await expect(
      listCatalogHealthIssueMoviePage({
        issueKey: 'drop table movies',
        limit: 25,
        offset: 0,
        staleAfterDays: 90,
      }),
    ).rejects.toThrow('Unsupported catalog-health issue');
    expect(poolMock.query).not.toHaveBeenCalled();

    await expect(
      isCatalogHealthIssueResolvedForMovie({
        issueKey: 'drop table movies',
        movieId: '334',
        staleAfterDays: 90,
      }),
    ).rejects.toThrow('Unsupported catalog-health issue');
  });

  it('normalizes summary rows when building the catalog health report', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            total_movies: '12',
            missing_poster_url: '1',
            missing_tmdb_id: 0,
            stale_tmdb_metadata: '2',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '334',
            name: 'Memento',
            year: 2000,
            tmdb_id: 77,
            poster_url: null,
            localized_name: null,
            duration: 113,
            age_rating: 'R',
            tmdb_matched_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            identity_key: '77',
            duplicate_count: '2',
            total_groups: '1',
            movies: [{ id: '334', name: 'Memento', year: 2000, tmdb_id: 77 }],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const report = await getCatalogHealthReport({ sampleLimit: 5, staleAfterDays: 90 });

    expect(report.totalMovies).toBe(12);
    expect(report.issues.find((issue) => issue.key === 'missing_poster_url')).toMatchObject({
      count: 1,
      samples: [{ id: '334', name: 'Memento', tmdb_id: 77 }],
    });
    expect(report.issues.find((issue) => issue.key === 'stale_tmdb_metadata')).toMatchObject({
      count: 2,
      samples: [],
    });
    expect(report.issues.find((issue) => issue.key === 'missing_localized_name')?.count).toBe(0);
    expect(report.duplicateTmdbIds).toMatchObject({
      totalGroups: 1,
      groups: [{ identityKey: '77', count: 2 }],
    });
  });
});
