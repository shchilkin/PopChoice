import { describe, expect, it, afterEach } from 'vitest';

import { getDbClient, resetDbClient, setDbClient } from './dbClient';

import type { DbClient, TableRef } from './dbClient';

/**
 * Helper to create a mock DbClient with a fully chainable query builder.
 *
 * The default `from()` implementation covers the complete chainable surface
 * used in the app (`.select().eq().limit()`, `.select().range().order()`,
 * `.insert().select()`, `.delete().neq()`), so the mock can be safely
 * copy/pasted or extended for any test scenario.
 */
function createMockDbClient(overrides?: Partial<DbClient>): DbClient {
  const defaultResult = { data: [], error: null, count: 0 };

  const makeThenable = <T>(result: T) => ({
    then: <TResult1 = T, TResult2 = never>(
      onfulfilled?: ((v: T) => TResult1) | null,
      onrejected?: ((reason: unknown) => TResult2) | null,
    ): Promise<TResult1 | TResult2> => Promise.resolve(result).then(onfulfilled, onrejected),
  });

  const defaultFrom = <T = unknown>(): TableRef<T> => {
    const makeQueryChain = (result = defaultResult) => ({
      eq: () => makeQueryChain(result),
      neq: () => makeThenable(result),
      limit: () => makeThenable(result),
      range: () => ({
        order: () => makeThenable(result),
        ...makeThenable(result),
      }),
      order: () => makeThenable(result),
      ...makeThenable(result),
    });

    return {
      select: () => makeQueryChain(defaultResult),
      insert: () => ({
        select: () => makeThenable(defaultResult),
        ...makeThenable(defaultResult),
      }),
      delete: () => ({
        neq: () => makeThenable(defaultResult),
      }),
    } as unknown as TableRef<T>;
  };

  return {
    isConfigured: overrides?.isConfigured ?? (() => true),
    from: overrides?.from ?? defaultFrom,
    rpc: overrides?.rpc ?? (() => Promise.resolve({ data: [], error: null })),
  };
}

describe('dbClient', () => {
  afterEach(() => {
    resetDbClient();
  });

  it('getDbClient returns a client with isConfigured, from and rpc methods', () => {
    const client = getDbClient();
    expect(client).toBeDefined();
    expect(typeof client.isConfigured).toBe('function');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
  });

  it('setDbClient replaces the global client', () => {
    const mock = createMockDbClient();

    setDbClient(mock);
    const client = getDbClient();
    expect(client).toBe(mock);
  });

  it('resetDbClient restores the default pg client', () => {
    const mock = createMockDbClient();

    setDbClient(mock);
    expect(getDbClient()).toBe(mock);

    resetDbClient();
    const client = getDbClient();
    expect(client).not.toBe(mock);
    expect(typeof client.isConfigured).toBe('function');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
  });

  it('mock client can be used for database operations', async () => {
    const mockData = [{ id: 1, name: 'Test Movie', year: 2023 }];

    const mock = createMockDbClient({
      from: <T = unknown>(): TableRef<T> =>
        ({
          select: () =>
            Promise.resolve({
              data: mockData,
              error: null,
              count: 1,
            }),
          insert: (rows: unknown) => ({
            select: () =>
              Promise.resolve({
                data: Array.isArray(rows) ? rows : [rows],
                error: null,
              }),
            then: <TResult1 = unknown, TResult2 = never>(
              onfulfilled?: ((v: unknown) => TResult1) | null,
              onrejected?: ((reason: unknown) => TResult2) | null,
            ): Promise<TResult1 | TResult2> =>
              Promise.resolve({
                data: Array.isArray(rows) ? rows : [rows],
                error: null,
              }).then(onfulfilled, onrejected),
          }),
          delete: () => ({
            neq: () => Promise.resolve({ data: [], error: null }),
          }),
        }) as unknown as TableRef<T>,
      rpc: (_fn: string, params?: Record<string, unknown>) =>
        Promise.resolve({
          data: [{ id: 1, content: 'matched', similarity: 0.9, ...params }],
          error: null,
        }),
    });

    setDbClient(mock);
    const db = getDbClient();

    // Test select
    const selectResult = await db.from('movies').select('*');
    expect(selectResult.data).toEqual(mockData);
    expect(selectResult.error).toBeNull();

    // Test rpc
    const rpcResult = await db.rpc('match_movies', { query_embedding: [1, 2, 3] });
    expect(rpcResult.data).toBeDefined();
    expect(rpcResult.error).toBeNull();
  });
});
