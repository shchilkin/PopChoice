import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { setDbClient, resetDbClient } from '@/clients/dbClient';

import { filterExistingMovies, clearAllMovies } from './validation';

import type { MovieRecord } from '../types';
import type { DbClient, QueryFilter, QueryResult, QuerySelect } from '@/clients/dbClient';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSelectMock(
  rows: { name: string; year: number }[],
): QuerySelect<{ name: string; year: number }> {
  const result: QueryResult<{ name: string; year: number }> = { data: rows, error: null };

  const filter: QueryFilter<{ name: string; year: number }> = {
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled as never, onrejected),
    eq: () => filter,
    ilike: () => filter,
    gte: () => filter,
    lte: () => filter,
    neq: () => Promise.resolve(result),
    in: () => filter,
    limit: () => Promise.resolve(result),
    range: () => ({
      then: (onfulfilled, onrejected) =>
        Promise.resolve(result).then(onfulfilled as never, onrejected),
      order: () => Promise.resolve(result),
    }),
    order: () => Promise.resolve(result),
  };

  const select: QuerySelect<{ name: string; year: number }> = {
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled as never, onrejected),
    eq: () => filter,
    ilike: () => filter,
    gte: () => filter,
    lte: () => filter,
    neq: () => Promise.resolve(result),
    in: () => filter,
    limit: () => Promise.resolve(result),
    range: () => ({
      then: (onfulfilled, onrejected) =>
        Promise.resolve(result).then(onfulfilled as never, onrejected),
      order: () => Promise.resolve(result),
    }),
    order: () => Promise.resolve(result),
  };

  return select;
}

function makeMockDbClient(existingRows: { name: string; year: number }[]): {
  client: DbClient;
  fromSpy: ReturnType<typeof vi.fn>;
} {
  const fromSpy = vi.fn();

  const client: DbClient = {
    isConfigured: () => true,
    from: fromSpy,
    rpc: () => Promise.resolve({ data: [], error: null }),
  };

  fromSpy.mockImplementation((_table: string) => {
    return {
      select: (_columns?: string) => {
        const selectMock = makeSelectMock([]);

        return {
          ...selectMock,
          eq: (column: string, value: unknown) => {
            // Return rows matching the queried name
            const matchingRows = existingRows.filter((row) => {
              if (column === 'name') return row.name === value;
              return true;
            });

            const result: QueryResult<{ name: string; year: number }> = {
              data: matchingRows,
              error: null,
            };

            const filter: QueryFilter<{ name: string; year: number }> = {
              then: (onfulfilled, onrejected) =>
                Promise.resolve(result).then(onfulfilled as never, onrejected),
              eq: () => filter,
              ilike: () => filter,
              gte: () => filter,
              lte: () => filter,
              neq: () => Promise.resolve(result),
              in: () => filter,
              limit: () => Promise.resolve(result),
              range: () => ({
                then: (onfulfilled, onrejected) =>
                  Promise.resolve(result).then(onfulfilled as never, onrejected),
                order: () => Promise.resolve(result),
              }),
              order: () => Promise.resolve(result),
            };

            return filter;
          },
          in: (column: string, values: unknown[]) => {
            // Return rows whose name is in the provided values array
            const matchingRows = existingRows.filter((row) => {
              if (column === 'name') return (values as string[]).includes(row.name);
              return true;
            });
            return makeSelectMock(matchingRows);
          },
          delete: () => ({
            neq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
      insert: () =>
        Promise.resolve({
          data: [],
          error: null,
          select: () => Promise.resolve({ data: [], error: null }),
        }),
      delete: () => ({
        neq: () => Promise.resolve({ data: [], error: null }),
      }),
    };
  });

  return { client, fromSpy };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('filterExistingMovies', () => {
  afterEach(() => {
    resetDbClient();
    vi.unstubAllEnvs();
  });

  it('returns all movies as new when none exist in DB', async () => {
    const { client } = makeMockDbClient([]);
    setDbClient(client);

    const records: MovieRecord[] = [
      { name: 'Casablanca', year: 1942 } as MovieRecord,
      { name: 'The Godfather', year: 1972 } as MovieRecord,
    ];

    const { newMovies, existingMovies } = await filterExistingMovies(records);

    expect(newMovies).toHaveLength(2);
    expect(existingMovies).toHaveLength(0);
  });

  it('correctly identifies existing movies and separates new ones', async () => {
    const { client } = makeMockDbClient([{ name: 'Casablanca', year: 1942 }]);
    setDbClient(client);

    const records: MovieRecord[] = [
      { name: 'Casablanca', year: 1942 } as MovieRecord,
      { name: 'The Godfather', year: 1972 } as MovieRecord,
    ];

    const { newMovies, existingMovies } = await filterExistingMovies(records);

    expect(newMovies).toHaveLength(1);
    expect(newMovies[0].name).toBe('The Godfather');
    expect(existingMovies).toHaveLength(1);
    expect(existingMovies[0]).toEqual({ name: 'Casablanca', year: 1942, index: 0 });
  });

  it('preserves original indices in existingMovies', async () => {
    const { client } = makeMockDbClient([
      { name: 'Casablanca', year: 1942 },
      { name: 'Alien', year: 1979 },
    ]);
    setDbClient(client);

    const records: MovieRecord[] = [
      { name: 'Casablanca', year: 1942 } as MovieRecord,
      { name: 'The Godfather', year: 1972 } as MovieRecord,
      { name: 'Alien', year: 1979 } as MovieRecord,
    ];

    const { existingMovies } = await filterExistingMovies(records);

    expect(existingMovies).toHaveLength(2);
    expect(existingMovies[0].index).toBe(0);
    expect(existingMovies[1].index).toBe(2);
  });

  it('returns empty arrays for empty input', async () => {
    const { client, fromSpy } = makeMockDbClient([]);
    setDbClient(client);

    const { newMovies, existingMovies } = await filterExistingMovies([]);

    expect(newMovies).toHaveLength(0);
    expect(existingMovies).toHaveLength(0);
    // Should not touch the DB at all for empty input
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('makes a single DB query regardless of record count', async () => {
    const { client, fromSpy } = makeMockDbClient([]);
    setDbClient(client);

    // 4 records but only 2 unique names
    const records: MovieRecord[] = [
      { name: 'Casablanca', year: 1942 } as MovieRecord,
      { name: 'Casablanca', year: 1942 } as MovieRecord, // duplicate name
      { name: 'The Godfather', year: 1972 } as MovieRecord,
      { name: 'The Godfather', year: 1974 } as MovieRecord, // same name, different year
    ];

    await filterExistingMovies(records);

    // Should issue exactly 1 DB query (single IN query), not one per record or per unique name
    expect(fromSpy).toHaveBeenCalledTimes(1);
  });

  it('uses (name, year) to distinguish movies with same name but different years', async () => {
    // Only the 1942 version exists in DB
    const { client } = makeMockDbClient([{ name: 'Casablanca', year: 1942 }]);
    setDbClient(client);

    const records: MovieRecord[] = [
      { name: 'Casablanca', year: 1942 } as MovieRecord,
      { name: 'Casablanca', year: 2020 } as MovieRecord, // remake, should be new
    ];

    const { newMovies, existingMovies } = await filterExistingMovies(records);

    expect(existingMovies).toHaveLength(1);
    expect(existingMovies[0].year).toBe(1942);
    expect(newMovies).toHaveLength(1);
    expect(newMovies[0].year).toBe(2020);
  });
});

describe('clearAllMovies', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetDbClient();
    vi.unstubAllEnvs();
  });

  it('throws in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    await expect(clearAllMovies()).rejects.toThrow(
      'clearAllMovies() is not allowed in production. Use targeted deletions instead.',
    );
  });

  it('does not call the database in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const fromSpy = vi.fn();
    const client: DbClient = {
      isConfigured: () => true,
      from: fromSpy,
      rpc: () => Promise.resolve({ data: [], error: null }),
    };
    setDbClient(client);

    await expect(clearAllMovies()).rejects.toThrow();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('deletes all movies and returns 0 in non-production environment', async () => {
    vi.stubEnv('NODE_ENV', 'test');

    const fromSpy = vi.fn().mockImplementation((_table: string) => ({
      select: () => ({
        then: (onfulfilled: (v: QueryResult<unknown>) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled),
        eq: () => ({}),
        neq: () => Promise.resolve({ data: [], error: null }),
        limit: () => Promise.resolve({ data: [], error: null }),
        range: () => ({ then: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      delete: () => ({
        neq: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: [], error: null }),
    }));

    const client: DbClient = {
      isConfigured: () => true,
      from: fromSpy,
      rpc: () => Promise.resolve({ data: [], error: null }),
    };
    setDbClient(client);

    const result = await clearAllMovies();
    expect(result).toBe(0);
    expect(fromSpy).toHaveBeenCalled();
  });

  it('works in development environment', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const fromSpy = vi.fn().mockImplementation(() => ({
      select: () => ({
        then: (onfulfilled: (v: QueryResult<unknown>) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled),
        eq: () => ({}),
        neq: () => Promise.resolve({ data: [], error: null }),
        limit: () => Promise.resolve({ data: [], error: null }),
        range: () => ({ then: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      delete: () => ({
        neq: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: [], error: null }),
    }));

    const client: DbClient = {
      isConfigured: () => true,
      from: fromSpy,
      rpc: () => Promise.resolve({ data: [], error: null }),
    };
    setDbClient(client);

    // Should not throw
    await expect(clearAllMovies()).resolves.toBe(0);
  });
});
