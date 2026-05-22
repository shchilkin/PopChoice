import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { setDbClient, getDbClient, resetDbClient } from './dbClient';
import { createPgDbClient } from './pgClient';

// ---------------------------------------------------------------------------
// Mock the `pg` module so we never open a real connection.
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock('pg', () => {
  const MockPool = vi.fn().mockImplementation(function () {
    return { query: mockQuery };
  });
  return { default: { Pool: MockPool }, Pool: MockPool };
});

describe('pgClient', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/testdb');
    mockQuery.mockReset();
  });

  afterEach(() => {
    resetDbClient();
    vi.unstubAllEnvs();
  });

  // -----------------------------------------------------------------------
  // isConfigured
  // -----------------------------------------------------------------------

  it('isConfigured returns true when DATABASE_URL is set', () => {
    const client = createPgDbClient();
    expect(client.isConfigured()).toBe(true);
  });

  it('isConfigured returns false when DATABASE_URL is missing', () => {
    vi.stubEnv('DATABASE_URL', '');
    const client = createPgDbClient();
    expect(client.isConfigured()).toBe(false);
  });

  // -----------------------------------------------------------------------
  // DbClient contract (can be injected via setDbClient)
  // -----------------------------------------------------------------------

  it('can be injected via setDbClient and retrieved via getDbClient', () => {
    const client = createPgDbClient();
    setDbClient(client);
    expect(getDbClient()).toBe(client);
  });

  // -----------------------------------------------------------------------
  // SELECT queries
  // -----------------------------------------------------------------------

  it('from().select() executes a basic SELECT query', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test Movie' }] });

    const client = createPgDbClient();
    const result = await client.from('movies').select('*');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM "movies"', []);
    expect(result.data).toEqual([{ id: 1, name: 'Test Movie' }]);
    expect(result.error).toBeNull();
  });

  it('from().select() with specific columns', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test Movie' }] });

    const client = createPgDbClient();
    await client.from('movies').select('id, name');

    expect(mockQuery).toHaveBeenCalledWith('SELECT "id", "name" FROM "movies"', []);
  });

  it('from().select().eq() adds WHERE clause', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Casablanca' }] });

    const client = createPgDbClient();
    const result = await client.from('movies').select('*').eq('name', 'Casablanca');

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM "movies" WHERE "name" = $1', [
      'Casablanca',
    ]);
    expect(result.data).toEqual([{ id: 1, name: 'Casablanca' }]);
  });

  it('from().select().eq().eq() supports multiple WHERE clauses', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    await client.from('movies').select('id').eq('name', 'Test').eq('year', 2023);

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT "id" FROM "movies" WHERE "name" = $1 AND "year" = $2',
      ['Test', 2023],
    );
  });

  it('from().select() supports ILIKE and range filters', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    await client
      .from('movies')
      .select('id, name')
      .ilike('name', '%godfather%')
      .gte('year', 1970)
      .lte('year', 1975)
      .range(0, 49)
      .order('id', { ascending: true });

    expect(mockQuery).toHaveBeenCalledWith(
      `SELECT "id", "name" FROM "movies" WHERE "name" ILIKE $1 ESCAPE '\\' AND "year" >= $2 AND "year" <= $3 ORDER BY "id" ASC LIMIT 50 OFFSET 0`,
      ['%godfather%', 1970, 1975],
    );
  });

  it('from().select().in() adds a WHERE "col" = ANY($1) clause', async () => {
    mockQuery.mockResolvedValue({ rows: [{ name: 'Casablanca', year: 1942 }] });

    const client = createPgDbClient();
    const result = await client
      .from('movies')
      .select('name, year')
      .in('name', ['Casablanca', 'The Godfather']);

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT "name", "year" FROM "movies" WHERE "name" = ANY($1)',
      [['Casablanca', 'The Godfather']],
    );
    expect(result.data).toEqual([{ name: 'Casablanca', year: 1942 }]);
    expect(result.error).toBeNull();
  });

  it('from().select().limit() adds LIMIT', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const client = createPgDbClient();
    await client.from('movies').select('id').eq('name', 'Test').limit(1);

    expect(mockQuery).toHaveBeenCalledWith('SELECT "id" FROM "movies" WHERE "name" = $1 LIMIT 1', [
      'Test',
    ]);
  });

  it('from().select().range().order() adds LIMIT, OFFSET, and ORDER BY', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 2, name: 'Movie B' }],
    });

    const client = createPgDbClient();
    const result = await client
      .from('movies')
      .select('id, name')
      .range(10, 19)
      .order('id', { ascending: true });

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT "id", "name" FROM "movies" ORDER BY "id" ASC LIMIT 10 OFFSET 10',
      [],
    );
    expect(result.data).toEqual([{ id: 2, name: 'Movie B' }]);
  });

  it('from().select() with count: exact and head: true returns count only', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

    const client = createPgDbClient();
    const result = await client.from('movies').select('*', { count: 'exact', head: true });

    expect(mockQuery).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM "movies"', []);
    expect(result.count).toBe(42);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('from().select() with count: exact on a data query uses window function', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { id: 1, name: 'Test Movie', _total_count: '42' },
        { id: 2, name: 'Another Movie', _total_count: '42' },
      ],
    });

    const client = createPgDbClient();
    const result = await client
      .from('movies')
      .select('id, name', { count: 'exact' })
      .range(0, 49)
      .order('id', { ascending: true });

    // Only one query should be issued (the window-function query).
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('COUNT(*) OVER() AS _total_count');
    expect(sql).toContain('ORDER BY "id" ASC');
    expect(sql).toContain('LIMIT 50 OFFSET 0');

    // count is extracted from the first row; _total_count must not appear in data.
    expect(result.count).toBe(42);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).not.toHaveProperty('_total_count');
    expect(result.data?.[1]).not.toHaveProperty('_total_count');
    expect(result.data).toEqual([
      { id: 1, name: 'Test Movie' },
      { id: 2, name: 'Another Movie' },
    ]);
  });

  it('from().select() with count: exact falls back to COUNT query when offset exceeds result set', async () => {
    // First call: main query returns no rows (OFFSET past end of result set).
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      // Second call: fallback COUNT(*) query.
      .mockResolvedValueOnce({ rows: [{ count: '100' }] });

    const client = createPgDbClient();
    const result = await client
      .from('movies')
      .select('id, name', { count: 'exact' })
      .range(1000, 1049)
      .order('id', { ascending: true });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    // Second query must be a plain COUNT.
    const [secondSql] = mockQuery.mock.calls[1];
    expect(secondSql).toBe('SELECT COUNT(*) as count FROM "movies"');
    expect(result.data).toEqual([]);
    expect(result.count).toBe(100);
    expect(result.error).toBeNull();
  });

  it('from().select() handles query errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('connection refused'));

    const client = createPgDbClient();
    const result = await client.from('movies').select('*');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'connection refused' });
  });

  // -----------------------------------------------------------------------
  // INSERT queries
  // -----------------------------------------------------------------------

  it('from().insert() executes an INSERT query', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    const result = await client.from('movies').insert({ name: 'New Movie', year: 2024 });

    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO "movies" ("name", "year") VALUES ($1, $2)',
      ['New Movie', 2024],
    );
    expect(result.error).toBeNull();
  });

  it('from().insert().select() returns inserted rows', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 5 }] });

    const client = createPgDbClient();
    const result = await client
      .from('movies')
      .insert({ name: 'New Movie', year: 2024 })
      .select('id');

    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO "movies" ("name", "year") VALUES ($1, $2) RETURNING "id"',
      ['New Movie', 2024],
    );
    expect(result.data).toEqual([{ id: 5 }]);
  });

  it('from().insert() converts embedding arrays to pgvector format', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    await client.from('movies').insert({
      name: 'Embedded Movie',
      embedding: [0.1, 0.2, 0.3],
    });

    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO "movies" ("name", "embedding") VALUES ($1, $2)',
      ['Embedded Movie', '[0.1,0.2,0.3]'],
    );
  });

  it('from().insert() handles batch inserts', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    await client.from('movies').insert([
      { name: 'Movie A', year: 2023 },
      { name: 'Movie B', year: 2024 },
    ]);

    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO "movies" ("name", "year") VALUES ($1, $2), ($3, $4)',
      ['Movie A', 2023, 'Movie B', 2024],
    );
  });

  it('from().insert() handles errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('unique constraint violation'));

    const client = createPgDbClient();
    const result = await client.from('movies').insert({ name: 'Duplicate', year: 2024 });

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'unique constraint violation' });
  });

  // -----------------------------------------------------------------------
  // DELETE queries
  // -----------------------------------------------------------------------

  it('from().delete().neq() executes a DELETE query', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    const result = await client.from('movies').delete().neq('id', 0);

    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM "movies" WHERE "id" != $1', [0]);
    expect(result.error).toBeNull();
  });

  it('from().delete().eq() executes a DELETE query with equality filter', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    const result = await client.from('users').delete().eq('id', 42);

    expect(mockQuery).toHaveBeenCalledWith('DELETE FROM "users" WHERE "id" = $1', [42]);
    expect(result.error).toBeNull();
  });

  it('from().delete().eq() handles errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('foreign key violation'));

    const client = createPgDbClient();
    const result = await client.from('users').delete().eq('id', 42);

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'foreign key violation' });
  });

  // -----------------------------------------------------------------------
  // RPC (stored procedure calls)
  // -----------------------------------------------------------------------

  it('rpc() calls a PostgreSQL function with named parameters', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { id: 1, name: 'Casablanca', similarity: 0.95 },
        { id: 2, name: 'The Godfather', similarity: 0.89 },
      ],
    });

    const client = createPgDbClient();
    const result = await client.rpc('match_movies', {
      query_embedding: [0.1, 0.2, 0.3],
      match_threshold: 0.1,
      match_count: 6,
    });

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM "match_movies"(query_embedding := $1, match_threshold := $2, match_count := $3)',
      ['[0.1,0.2,0.3]', 0.1, 6],
    );
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it('rpc() handles errors gracefully', async () => {
    mockQuery.mockRejectedValue(new Error('function not found'));

    const client = createPgDbClient();
    const result = await client.rpc('nonexistent_function');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'function not found' });
  });

  it('rpc() works with no parameters', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: 42 }] });

    const client = createPgDbClient();
    await client.rpc('get_count');

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM "get_count"()', []);
  });

  // -----------------------------------------------------------------------
  // Lazy execution – queries should not fire until awaited
  // -----------------------------------------------------------------------

  it('from().select() does not execute until awaited', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    // Build the query chain without awaiting
    const query = client.from('movies').select('*').eq('name', 'Test');
    expect(mockQuery).not.toHaveBeenCalled();

    // Now await – this should trigger the query
    await query;
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('terminal methods (order, limit, neq) do not execute until awaited', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();

    // .order() should be lazy
    const orderQuery = client.from('movies').select('*').order('name');
    expect(mockQuery).not.toHaveBeenCalled();
    await orderQuery;
    expect(mockQuery).toHaveBeenCalledTimes(1);

    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });

    // .limit() should be lazy
    const limitQuery = client.from('movies').select('*').limit(5);
    expect(mockQuery).not.toHaveBeenCalled();
    await limitQuery;
    expect(mockQuery).toHaveBeenCalledTimes(1);

    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });

    // .neq() should be lazy
    const neqQuery = client.from('movies').select('*').neq('id', 0);
    expect(mockQuery).not.toHaveBeenCalled();
    await neqQuery;
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('from().insert().select() does not execute until awaited', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const client = createPgDbClient();
    const query = client.from('movies').insert({ name: 'Movie', year: 2024 }).select('id');
    expect(mockQuery).not.toHaveBeenCalled();

    await query;
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('from().delete().neq() does not execute until awaited', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const client = createPgDbClient();
    const query = client.from('movies').delete().neq('id', 0);
    expect(mockQuery).not.toHaveBeenCalled();

    await query;
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('from().insert().select() executes exactly one INSERT', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const client = createPgDbClient();
    const result = await client.from('movies').insert({ name: 'Movie', year: 2024 }).select('id');

    // Only one INSERT query should have been executed (with RETURNING)
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO "movies" ("name", "year") VALUES ($1, $2) RETURNING "id"',
      ['Movie', 2024],
    );
    expect(result.data).toEqual([{ id: 1 }]);
  });

  // -----------------------------------------------------------------------
  // Integration-style: works as a drop-in for Supabase client
  // -----------------------------------------------------------------------

  it('works as a drop-in replacement via setDbClient', async () => {
    const pgClient = createPgDbClient();
    setDbClient(pgClient);

    const db = getDbClient();
    expect(db.isConfigured()).toBe(true);
    expect(typeof db.from).toBe('function');
    expect(typeof db.rpc).toBe('function');

    // Verify it produces the expected SQL for a typical app flow
    mockQuery.mockResolvedValue({ rows: [{ count: '10' }] });
    const countResult = await db.from('movies').select('*', { count: 'exact', head: true });
    expect(countResult.count).toBe(10);
  });
});
