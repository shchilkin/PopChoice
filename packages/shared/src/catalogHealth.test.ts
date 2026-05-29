import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeDatabase, initDatabase } from './db.js';
import {
  isCatalogHealthIssueResolvedForMovie,
  isCatalogHealthIssueKey,
  listCatalogHealthIssueMoviePage,
  MAX_CATALOG_HEALTH_ISSUE_OFFSET,
  MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
} from './catalogHealth.js';

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
          tmdb_id: null,
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
      movies: [{ id: '334', name: 'Memento', tmdb_id: null }],
    });
    expect(poolMock.query).toHaveBeenCalledTimes(2);
    expect(poolMock.query.mock.calls[0][1]).toEqual([]);
    expect(poolMock.query.mock.calls[1][1]).toEqual([
      MAX_CATALOG_HEALTH_ISSUE_PAGE_SIZE,
      MAX_CATALOG_HEALTH_ISSUE_OFFSET,
    ]);
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
      "poster_url IS NULL OR btrim(poster_url) = ''",
    );
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
    expect(poolMock.query.mock.calls[0][1]).toEqual([90, '334']);
  });

  it('rejects unknown issue keys before building SQL', async () => {
    expect(isCatalogHealthIssueKey('missing_poster_url')).toBe(true);
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
});
