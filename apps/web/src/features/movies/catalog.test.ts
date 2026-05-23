import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetDbClient, setDbClient } from '@/clients/dbClient';

import { getMoviesPage } from './catalog';

import type { DbClient } from '@/clients/dbClient';

function createSqlClient(query: NonNullable<DbClient['query']>): DbClient {
  return {
    isConfigured: () => true,
    from: vi.fn(() => {
      throw new Error('query-builder fallback should not be used');
    }),
    query,
    rpc: vi.fn(),
  };
}

describe('movies catalog', () => {
  afterEach(() => {
    resetDbClient();
  });

  it('searches titles, people, and genres while preserving filters and pagination', async () => {
    const queryMock = vi.fn();
    const query: NonNullable<DbClient['query']> = async <T = unknown>(
      sql: string,
      values?: readonly unknown[],
    ) => {
      queryMock(sql, values);
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: 2 }] as T[], rowCount: 1 };
      }

      expect(values).toEqual(['%Nolan%', 2000, 2020, 121, 8, ['PG-13'], 10, 10]);
      return {
        rows: [
          {
            id: 7,
            name: 'Inception',
            age_rating: 'PG-13',
            duration: 148,
            score_rating: 8.8,
            year: 2010,
          },
        ] as T[],
        rowCount: 1,
      };
    };
    setDbClient(createSqlClient(query));

    const result = await getMoviesPage(2, 10, {
      query: 'Nolan',
      yearFrom: 2000,
      yearTo: 2020,
      duration: 'over-120',
      minScore: 8,
      ageRatings: ['PG-13'],
    });
    const [countSql, countValues] = queryMock.mock.calls[0] ?? [];
    const [dataSql] = queryMock.mock.calls[1] ?? [];

    expect(result).toMatchObject({
      totalCount: 2,
      page: 2,
      pageSize: 10,
      totalPages: 1,
      movies: [{ name: 'Inception' }],
    });
    expect(countValues).toEqual(['%Nolan%', 2000, 2020, 121, 8, ['PG-13']]);
    expect(countSql).toContain('movies.name ILIKE $1');
    expect(countSql).toContain('catalog_people.name ILIKE $1');
    expect(countSql).toContain('catalog_genres.name ILIKE $1');
    expect(countSql).toContain('movie_people.movie_id = movies.id');
    expect(countSql).toContain('movie_genres.movie_id = movies.id');
    expect(dataSql).toContain('LIMIT $7');
    expect(dataSql).toContain('OFFSET $8');
  });

  it('escapes wildcard characters in metadata search terms', async () => {
    const query: NonNullable<DbClient['query']> = async <T = unknown>(
      sql: string,
      values?: readonly unknown[],
    ) => {
      if (sql.includes('COUNT(*)')) {
        expect(values).toEqual(['%100\\% fun\\_%']);
        return { rows: [{ count: '0' }] as T[], rowCount: 1 };
      }

      expect(values).toEqual(['%100\\% fun\\_%', 5, 0]);
      return { rows: [], rowCount: 0 };
    };
    setDbClient(createSqlClient(query));

    const result = await getMoviesPage(1, 5, { query: '100% fun_' });

    expect(result.movies).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
