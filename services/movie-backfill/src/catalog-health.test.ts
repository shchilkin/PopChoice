import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';

import {
  formatCatalogHealthReport,
  getCatalogHealthReport,
  type CatalogHealthReport,
} from './catalog-health.js';
import { closeDatabase, initDatabase } from './database.js';

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

describe('catalog health report', () => {
  let poolMock: any;

  beforeEach(() => {
    initDatabase('postgres://user:pass@localhost:5432/db');
    poolMock = new pg.Pool();
  });

  afterEach(async () => {
    await closeDatabase();
    vi.clearAllMocks();
  });

  it('collects read-only catalog health counts, samples, and duplicate groups', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            total_movies: 4,
            missing_poster_url: 1,
            missing_localized_name: 2,
            missing_tmdb_id: 1,
            missing_runtime: 1,
            missing_age_rating: 0,
            missing_tmdb_matched_at: 1,
            stale_tmdb_metadata: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            name: 'Solaris',
            year: 1972,
            tmdb_id: 593,
            poster_url: null,
            localized_name: 'Solaris Localized',
            duration: 166,
            age_rating: 'PG',
            tmdb_matched_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            identity_key: '593',
            duplicate_count: 2,
            total_groups: 1,
            movies: [
              { id: '1', name: 'Solaris', year: 1972, tmdb_id: 593 },
              { id: '4', name: 'Solaris Duplicate', year: 1972, tmdb_id: 593 },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            identity_key: 'solaris:1972',
            duplicate_count: 2,
            total_groups: 1,
            movies: [
              { id: '1', name: 'Solaris', year: 1972, tmdb_id: 593 },
              { id: '2', name: 'Solaris!', year: 1972, tmdb_id: null },
            ],
          },
        ],
      });

    const report = await getCatalogHealthReport({ sampleLimit: 3, staleAfterDays: 90 });

    expect(report.totalMovies).toBe(4);
    expect(report.staleAfterDays).toBe(90);
    expect(report.issues.find((issue) => issue.key === 'missing_poster_url')).toMatchObject({
      count: 1,
      samples: [{ id: '1', name: 'Solaris', tmdb_id: 593 }],
    });
    expect(report.duplicateTmdbIds).toMatchObject({
      totalGroups: 1,
      groups: [{ identityKey: '593', count: 2 }],
    });
    expect(report.duplicateNormalizedTitleYears).toMatchObject({
      totalGroups: 1,
      groups: [{ identityKey: 'solaris:1972', count: 2 }],
    });

    expect(poolMock.query).toHaveBeenCalledTimes(9);
    const duplicateTmdbSql = String(poolMock.query.mock.calls[7]?.[0]);
    expect(duplicateTmdbSql).toContain('ROW_NUMBER() OVER (PARTITION BY tmdb_id ORDER BY id)');
    expect(duplicateTmdbSql).toContain('sample_rank <= $1');
    const duplicateTitleYearSql = String(poolMock.query.mock.calls[8]?.[0]);
    expect(duplicateTitleYearSql).toContain(
      'ROW_NUMBER() OVER (PARTITION BY identity_key ORDER BY id)',
    );
    expect(duplicateTitleYearSql).toContain('sample_rank <= $1');

    for (const [sql] of poolMock.query.mock.calls) {
      const normalizedSql = String(sql).trim().toLowerCase();
      expect(normalizedSql).toMatch(/^(select|with)\b/);
      expect(normalizedSql).not.toMatch(/\b(insert|update|delete|alter|create|drop)\b/);
    }
  });

  it('skips sample queries for issues with zero rows', async () => {
    poolMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            total_movies: 4,
            missing_poster_url: 0,
            missing_localized_name: 0,
            missing_tmdb_id: 0,
            missing_runtime: 0,
            missing_age_rating: 0,
            missing_tmdb_matched_at: 0,
            stale_tmdb_metadata: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const report = await getCatalogHealthReport({ sampleLimit: 3, staleAfterDays: 90 });

    expect(report.issues.every((issue) => issue.samples.length === 0)).toBe(true);
    expect(poolMock.query).toHaveBeenCalledTimes(3);
    const sqlStatements = poolMock.query.mock.calls.slice(1).map(([sql]) => String(sql));
    expect(sqlStatements.join('\n')).not.toContain('WHERE poster_url IS NULL');
  });

  it('formats text output for local and CI logs', () => {
    const report: CatalogHealthReport = {
      generatedAt: '2026-05-22T10:00:00.000Z',
      staleAfterDays: 180,
      totalMovies: 2,
      issues: [
        {
          key: 'missing_poster_url',
          label: 'Missing poster_url',
          count: 1,
          samples: [
            {
              id: '1',
              name: 'Solaris',
              year: 1972,
              tmdb_id: 593,
              poster_url: null,
              localized_name: 'Solaris Localized',
              duration: 166,
              age_rating: 'PG',
              tmdb_matched_at: null,
            },
          ],
        },
      ],
      duplicateTmdbIds: { totalGroups: 0, groups: [] },
      duplicateNormalizedTitleYears: {
        totalGroups: 1,
        groups: [
          {
            identityKey: 'solaris:1972',
            count: 2,
            movies: [
              { id: '1', name: 'Solaris', year: 1972, tmdb_id: 593 },
              { id: '2', name: 'Solaris!', year: 1972, tmdb_id: null },
            ],
          },
        ],
      },
    };

    expect(formatCatalogHealthReport(report)).toContain('Catalog health report');
    expect(formatCatalogHealthReport(report)).toContain('- Missing poster_url: 1');
    expect(formatCatalogHealthReport(report)).toContain(
      'Duplicate normalized title/year groups: 1',
    );
    expect(formatCatalogHealthReport(report)).toContain('#1 Solaris (1972) tmdb:593');
  });
});
