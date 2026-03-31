/**
 * PostgreSQL (pg/node-postgres) Database Client Implementation
 *
 * Implements the `DbClient` interface using the `pg` Pool, providing a
 * Supabase-compatible chainable query-builder API for seamless backend swaps.
 *
 * ## Prerequisites
 *
 * - A PostgreSQL database with the `vector` extension enabled:
 *   ```sql
 *   CREATE EXTENSION IF NOT EXISTS vector;
 *   ```
 * - The `DATABASE_URL` environment variable pointing to the database.
 *
 * ## Usage
 *
 * ```ts
 * import { createPgDbClient } from '@/clients/pgClient';
 * import { setDbClient } from '@/clients/dbClient';
 *
 * const pgClient = createPgDbClient();
 * setDbClient(pgClient);
 * ```
 */

import pg from 'pg';

import type {
  DbClient,
  QueryDelete,
  QueryFilter,
  QueryInsert,
  QueryResult,
  QuerySelect,
  QueryTerminal,
  TableRef,
} from './dbClient';

const { Pool } = pg;
type PgPool = InstanceType<typeof Pool>;

// ---------------------------------------------------------------------------
// Internal query-state object that accumulates clauses as methods are chained.
// ---------------------------------------------------------------------------

interface QueryState {
  table: string;
  columns: string;
  countMode: 'exact' | null;
  headOnly: boolean;
  wheres: Array<{ column: string; op: string; value: unknown }>;
  orderBy: { column: string; ascending: boolean } | null;
  limitVal: number | null;
  rangeFrom: number | null;
  rangeTo: number | null;
}

function defaultState(table: string): QueryState {
  return {
    table,
    columns: '*',
    countMode: null,
    headOnly: false,
    wheres: [],
    orderBy: null,
    limitVal: null,
    rangeFrom: null,
    rangeTo: null,
  };
}

// ---------------------------------------------------------------------------
// SQL builder helpers
// ---------------------------------------------------------------------------

function buildSelectSQL(state: QueryState): {
  text: string;
  values: unknown[];
  countText?: string;
  countValues?: unknown[];
} {
  const values: unknown[] = [];
  let idx = 1;

  // Column list
  const cols = state.headOnly ? '1' : state.columns;

  let sql = `SELECT ${cols} FROM "${state.table}"`;

  // WHERE clauses
  if (state.wheres.length > 0) {
    const clauses = state.wheres.map((w) => {
      const placeholder = `$${idx++}`;
      values.push(w.value);
      return `"${w.column}" ${w.op} ${placeholder}`;
    });
    sql += ` WHERE ${clauses.join(' AND ')}`;
  }

  // ORDER BY
  if (state.orderBy) {
    sql += ` ORDER BY "${state.orderBy.column}" ${state.orderBy.ascending ? 'ASC' : 'DESC'}`;
  }

  // LIMIT / OFFSET via range
  if (state.rangeFrom !== null && state.rangeTo !== null) {
    const limit = state.rangeTo - state.rangeFrom + 1;
    sql += ` LIMIT ${limit} OFFSET ${state.rangeFrom}`;
  } else if (state.limitVal !== null) {
    sql += ` LIMIT ${state.limitVal}`;
  }

  // Build count query if needed
  let countText: string | undefined;
  let countValues: unknown[] | undefined;
  if (state.countMode === 'exact') {
    let countSQL = `SELECT COUNT(*) as count FROM "${state.table}"`;
    const cValues: unknown[] = [];
    let cIdx = 1;
    if (state.wheres.length > 0) {
      const clauses = state.wheres.map((w) => {
        const placeholder = `$${cIdx++}`;
        cValues.push(w.value);
        return `"${w.column}" ${w.op} ${placeholder}`;
      });
      countSQL += ` WHERE ${clauses.join(' AND ')}`;
    }
    countText = countSQL;
    countValues = cValues;
  }

  return { text: sql, values, countText, countValues };
}

// ---------------------------------------------------------------------------
// Execute a SELECT and return a QueryResult
// ---------------------------------------------------------------------------

async function executeSelect<T>(pool: PgPool, state: QueryState): Promise<QueryResult<T>> {
  try {
    const { text, values, countText, countValues } = buildSelectSQL(state);

    if (state.headOnly) {
      // For head-only queries, we only need the count
      if (countText) {
        const countResult = await pool.query(countText, countValues);
        return {
          data: null,
          error: null,
          count: parseInt(countResult.rows[0]?.count ?? '0', 10),
        };
      }
      return { data: null, error: null, count: 0 };
    }

    const result = await pool.query(text, values);

    let count: number | null = null;
    if (countText && countValues) {
      const countResult = await pool.query(countText, countValues);
      count = parseInt(countResult.rows[0]?.count ?? '0', 10);
    }

    return {
      data: result.rows as T[],
      error: null,
      ...(count !== null ? { count } : {}),
    };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

// ---------------------------------------------------------------------------
// Chainable builder that mirrors the Supabase query surface
// ---------------------------------------------------------------------------

function createTerminal<T>(pool: PgPool, state: QueryState): QueryTerminal<T> {
  const promise = executeSelect<T>(pool, state);
  return {
    then: (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected),
    order: (column: string, options?: { ascending?: boolean }) => {
      state.orderBy = { column, ascending: options?.ascending ?? true };
      return executeSelect<T>(pool, state);
    },
  };
}

function createFilter<T>(pool: PgPool, state: QueryState): QueryFilter<T> {
  const promise = executeSelect<T>(pool, state);
  return {
    then: (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected),
    eq: (column: string, value: unknown) => {
      state.wheres.push({ column, op: '=', value });
      return createFilter<T>(pool, state);
    },
    neq: (column: string, value: unknown) => {
      state.wheres.push({ column, op: '!=', value });
      return executeSelect<T>(pool, state);
    },
    limit: (count: number) => {
      state.limitVal = count;
      return executeSelect<T>(pool, state);
    },
    range: (from: number, to: number) => {
      state.rangeFrom = from;
      state.rangeTo = to;
      return createTerminal<T>(pool, state);
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      state.orderBy = { column, ascending: options?.ascending ?? true };
      return executeSelect<T>(pool, state);
    },
  };
}

function createSelect<T>(pool: PgPool, state: QueryState): QuerySelect<T> {
  const promise = executeSelect<T>(pool, state);
  return {
    then: (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected),
    eq: (column: string, value: unknown) => {
      state.wheres.push({ column, op: '=', value });
      return createFilter<T>(pool, state);
    },
    neq: (column: string, value: unknown) => {
      state.wheres.push({ column, op: '!=', value });
      return executeSelect<T>(pool, state);
    },
    limit: (count: number) => {
      state.limitVal = count;
      return executeSelect<T>(pool, state);
    },
    range: (from: number, to: number) => {
      state.rangeFrom = from;
      state.rangeTo = to;
      return createTerminal<T>(pool, state);
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      state.orderBy = { column, ascending: options?.ascending ?? true };
      return executeSelect<T>(pool, state);
    },
  };
}

// ---------------------------------------------------------------------------
// INSERT builder
// ---------------------------------------------------------------------------

function createInsert<T>(pool: PgPool, table: string, rows: T | T[]): QueryInsert<T> {
  const rowArray = Array.isArray(rows) ? rows : [rows];

  async function doInsert(returning: string | null): Promise<QueryResult<T>> {
    if (rowArray.length === 0) {
      return { data: [], error: null };
    }

    try {
      // Get column names from the first row
      const columns = Object.keys(rowArray[0] as Record<string, unknown>);
      const colList = columns.map((c) => `"${c}"`).join(', ');

      const valuePlaceholders: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      for (const row of rowArray) {
        const record = row as Record<string, unknown>;
        const placeholders: string[] = [];
        for (const col of columns) {
          let val = record[col];
          // Convert embedding arrays to pgvector string format
          if (col === 'embedding' && Array.isArray(val)) {
            val = `[${(val as number[]).join(',')}]`;
          }
          placeholders.push(`$${idx++}`);
          values.push(val);
        }
        valuePlaceholders.push(`(${placeholders.join(', ')})`);
      }

      let sql = `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')}`;
      if (returning) {
        sql += ` RETURNING ${returning}`;
      }

      const result = await pool.query(sql, values);
      return { data: (result.rows as T[]) ?? [], error: null };
    } catch (err) {
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  const promise = doInsert(null);

  return {
    then: (onfulfilled, onrejected) => promise.then(onfulfilled, onrejected),
    select: (columns?: string) => doInsert(columns || '*'),
  };
}

// ---------------------------------------------------------------------------
// DELETE builder
// ---------------------------------------------------------------------------

function createDelete<T>(pool: PgPool, table: string): QueryDelete<T> {
  return {
    neq: (column: string, value: unknown) => {
      const sql = `DELETE FROM "${table}" WHERE "${column}" != $1`;
      return pool
        .query(sql, [value])
        .then(() => ({ data: [] as T[], error: null }))
        .catch((err: unknown) => ({
          data: null,
          error: { message: err instanceof Error ? err.message : String(err) },
        }));
    },
  };
}

// ---------------------------------------------------------------------------
// Public factory: createPgDbClient
// ---------------------------------------------------------------------------

/**
 * Create a `DbClient` backed by PostgreSQL via `pg` Pool.
 *
 * The pool is created lazily on first use and connects via `DATABASE_URL`.
 */
export function createPgDbClient(): DbClient {
  let _pool: PgPool | null = null;

  function getPool(): PgPool {
    if (!_pool) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('Expected env var DATABASE_URL');
      }
      _pool = new Pool({ connectionString });
    }
    return _pool;
  }

  return {
    isConfigured: () => Boolean(process.env.DATABASE_URL),

    from: <T = unknown>(table: string): TableRef<T> => ({
      select: (columns?: string, options?: { count?: 'exact'; head?: boolean }): QuerySelect<T> => {
        const state = defaultState(table);
        if (columns && columns !== '*') {
          state.columns = columns
            .split(',')
            .map((c) => `"${c.trim()}"`)
            .join(', ');
        }
        if (options?.count === 'exact') {
          state.countMode = 'exact';
        }
        if (options?.head) {
          state.headOnly = true;
        }
        return createSelect<T>(getPool(), state);
      },

      insert: (rows: T | T[]): QueryInsert<T> => createInsert<T>(getPool(), table, rows),

      delete: (): QueryDelete<T> => createDelete<T>(getPool(), table),
    }),

    rpc: async (
      fn: string,
      params?: Record<string, unknown>,
    ): Promise<{ data: unknown[] | null; error: { message: string } | null }> => {
      try {
        const pool = getPool();

        // Build the function call with named parameters
        const paramEntries = params ? Object.entries(params) : [];
        const placeholders: string[] = [];
        const values: unknown[] = [];

        paramEntries.forEach(([key, val], i) => {
          let paramVal = val;
          // Convert embedding arrays to pgvector-compatible format
          if (key.includes('embedding') && Array.isArray(paramVal)) {
            paramVal = `[${(paramVal as number[]).join(',')}]`;
          }
          placeholders.push(`${key} := $${i + 1}`);
          values.push(paramVal);
        });

        const callArgs = placeholders.length > 0 ? placeholders.join(', ') : '';
        const sql = `SELECT * FROM ${fn}(${callArgs})`;

        const result = await pool.query(sql, values);
        return { data: result.rows, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : String(err) },
        };
      }
    },
  };
}
