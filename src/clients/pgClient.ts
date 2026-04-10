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

// Register int8 (bigint/bigserial, OID 20) parser so that bigint columns are
// returned as JS numbers rather than strings.  Safety checks guard against
// precision loss and non-numeric input: NaN is rejected immediately, and values
// outside the safe-integer range throw so the problem surfaces clearly rather
// than silently corrupting data.
// Optional chaining guards against environments where pg is mocked without the types object.
pg.types?.setTypeParser(20, (val: string) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) {
    throw new Error(`int8 value ${val} is not a valid integer`);
  }
  if (n > Number.MAX_SAFE_INTEGER || n < Number.MIN_SAFE_INTEGER) {
    throw new Error(
      `int8 value ${val} is outside the safe integer range and cannot be safely represented as a JS number`,
    );
  }
  return n;
});

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
// Identifier validation – defence-in-depth against SQL injection.
// All identifiers (table names, column names, function names, param keys)
// are validated before being interpolated into SQL strings.
// ---------------------------------------------------------------------------

const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafeIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER_RE.test(value)) {
    throw new Error(`Unsafe ${label}: "${value}"`);
  }
}

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a value to a non-negative integer for safe SQL interpolation.
 * Returns 0 for NaN, Infinity, or negative values.
 */
function safeNonNegativeInt(value: number): number {
  const n = Math.trunc(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

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
  assertSafeIdentifier(table, 'table name');
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
  useWindowCount: boolean;
  countText?: string;
  countValues?: unknown[];
} {
  const values: unknown[] = [];
  let idx = 1;

  // Column list
  const cols = state.headOnly ? '1' : state.columns;

  // When both data rows and a total count are needed, embed the count as a
  // window function column to avoid a second round-trip to the database.
  const needsWindowCount = state.countMode === 'exact' && !state.headOnly;
  const selectCols = needsWindowCount ? `${cols}, COUNT(*) OVER() AS _total_count` : cols;

  let sql = `SELECT ${selectCols} FROM "${state.table}"`;

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
    const limit = safeNonNegativeInt(state.rangeTo - state.rangeFrom + 1);
    const offset = safeNonNegativeInt(state.rangeFrom);
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
  } else if (state.limitVal !== null) {
    sql += ` LIMIT ${safeNonNegativeInt(state.limitVal)}`;
  }

  // Build a separate COUNT(*) query used as fallback when the window-function
  // path returns zero rows (OFFSET past end of result set), or for head-only queries.
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

  return { text: sql, values, useWindowCount: needsWindowCount, countText, countValues };
}

// ---------------------------------------------------------------------------
// Execute a SELECT and return a QueryResult
// ---------------------------------------------------------------------------

async function executeSelect<T>(pool: PgPool, state: QueryState): Promise<QueryResult<T>> {
  try {
    const { text, values, useWindowCount, countText, countValues } = buildSelectSQL(state);

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
      return { data: null, error: null };
    }

    const result = await pool.query(text, values);

    if (useWindowCount) {
      // Extract the injected _total_count window column and strip it from rows.
      type RowWithCount = T & { _total_count?: string | number };
      const rows = result.rows as RowWithCount[];

      if (rows.length > 0) {
        const count = parseInt(String(rows[0]._total_count ?? '0'), 10);
        const data = rows.map(({ _total_count: _, ...rest }) => rest as T);
        return { data, error: null, count };
      }

      // The OFFSET is past the end of the result set — the window function cannot
      // return a count. Fall back to a separate COUNT(*) query.
      // Any error thrown here is caught by the outer try/catch and returned as
      // a QueryResult error, consistent with the rest of this function.
      const fallbackCount =
        countText != null
          ? parseInt((await pool.query(countText, countValues)).rows[0]?.count ?? '0', 10)
          : 0;
      return { data: [], error: null, count: fallbackCount };
    }

    return {
      data: result.rows as T[],
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}

// ---------------------------------------------------------------------------
// Lazy PromiseLike wrapper – defers executeSelect until .then() is called.
// ---------------------------------------------------------------------------

function lazyResult<T>(pool: PgPool, state: QueryState): PromiseLike<QueryResult<T>> {
  return {
    then: (onfulfilled, onrejected) => executeSelect<T>(pool, state).then(onfulfilled, onrejected),
  };
}

// ---------------------------------------------------------------------------
// Chainable builder that mirrors the Supabase query surface
// ---------------------------------------------------------------------------

function createTerminal<T>(pool: PgPool, state: QueryState): QueryTerminal<T> {
  return {
    then: (onfulfilled, onrejected) => executeSelect<T>(pool, state).then(onfulfilled, onrejected),
    order: (column: string, options?: { ascending?: boolean }) => {
      assertSafeIdentifier(column, 'column name');
      state.orderBy = { column, ascending: options?.ascending ?? true };
      return lazyResult<T>(pool, state);
    },
  };
}

function createFilter<T>(pool: PgPool, state: QueryState): QueryFilter<T> {
  return {
    then: (onfulfilled, onrejected) => executeSelect<T>(pool, state).then(onfulfilled, onrejected),
    eq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '=', value });
      return createFilter<T>(pool, state);
    },
    neq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '!=', value });
      return lazyResult<T>(pool, state);
    },
    limit: (count: number) => {
      state.limitVal = count;
      return lazyResult<T>(pool, state);
    },
    range: (from: number, to: number) => {
      state.rangeFrom = from;
      state.rangeTo = to;
      return createTerminal<T>(pool, state);
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      assertSafeIdentifier(column, 'column name');
      state.orderBy = { column, ascending: options?.ascending ?? true };
      return lazyResult<T>(pool, state);
    },
  };
}

function createSelect<T>(pool: PgPool, state: QueryState): QuerySelect<T> {
  return {
    then: (onfulfilled, onrejected) => executeSelect<T>(pool, state).then(onfulfilled, onrejected),
    eq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '=', value });
      return createFilter<T>(pool, state);
    },
    neq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '!=', value });
      return lazyResult<T>(pool, state);
    },
    limit: (count: number) => {
      state.limitVal = count;
      return lazyResult<T>(pool, state);
    },
    range: (from: number, to: number) => {
      state.rangeFrom = from;
      state.rangeTo = to;
      return createTerminal<T>(pool, state);
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      assertSafeIdentifier(column, 'column name');
      state.orderBy = { column, ascending: options?.ascending ?? true };
      return lazyResult<T>(pool, state);
    },
  };
}

function createInsert<T>(pool: PgPool, table: string, rows: T | T[]): QueryInsert<T> {
  const rowArray = Array.isArray(rows) ? rows : [rows];

  async function doInsert(returning: string | null): Promise<QueryResult<T>> {
    if (rowArray.length === 0) {
      return { data: [], error: null };
    }

    try {
      // Get column names from the first row and validate
      const columns = Object.keys(rowArray[0] as Record<string, unknown>);
      columns.forEach((c) => assertSafeIdentifier(c, 'column name'));
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
        // Validate RETURNING column names and quote identifiers consistently.
        const returningClause =
          returning === '*'
            ? '*'
            : returning
                .split(',')
                .map((c) => c.trim())
                .map((c) => {
                  assertSafeIdentifier(c, 'column name');
                  return `"${c}"`;
                })
                .join(', ');
        sql += ` RETURNING ${returningClause}`;
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

  let returning: string | null = null;
  let insertPromise: Promise<QueryResult<T>> | null = null;

  function executeInsert(): Promise<QueryResult<T>> {
    if (!insertPromise) {
      insertPromise = doInsert(returning);
    }
    return insertPromise;
  }

  return {
    then: (onfulfilled, onrejected) => executeInsert().then(onfulfilled, onrejected),
    select: (columns?: string) => {
      returning = columns || '*';
      return {
        then: (onfulfilled, onrejected) => executeInsert().then(onfulfilled, onrejected),
      } as PromiseLike<QueryResult<T>>;
    },
  };
}

// ---------------------------------------------------------------------------
// DELETE builder
// ---------------------------------------------------------------------------

function createDelete<T>(pool: PgPool, table: string): QueryDelete<T> {
  return {
    neq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      const sql = `DELETE FROM "${table}" WHERE "${column}" != $1`;
      return {
        then: (onfulfilled, onrejected) =>
          pool
            .query(sql, [value])
            .then(() => ({ data: [] as T[], error: null }) as QueryResult<T>)
            .catch(
              (err: unknown) =>
                ({
                  data: null,
                  error: { message: err instanceof Error ? err.message : String(err) },
                }) as QueryResult<T>,
            )
            .then(onfulfilled, onrejected),
      } as PromiseLike<QueryResult<T>>;
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
      _pool = new Pool({ connectionString, allowExitOnIdle: true });
    }
    return _pool;
  }

  return {
    isConfigured: () => Boolean(process.env.DATABASE_URL),

    from: <T = unknown>(table: string): TableRef<T> => {
      assertSafeIdentifier(table, 'table name');

      return {
        select: (
          columns?: string,
          options?: { count?: 'exact'; head?: boolean },
        ): QuerySelect<T> => {
          const state = defaultState(table);
          if (columns && columns !== '*') {
            const colNames = columns.split(',').map((c) => c.trim());
            colNames.forEach((c) => assertSafeIdentifier(c, 'column name'));
            state.columns = colNames.map((c) => `"${c}"`).join(', ');
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
      };
    },
    rpc: async (
      fn: string,
      params?: Record<string, unknown>,
    ): Promise<{ data: unknown[] | null; error: { message: string } | null }> => {
      try {
        assertSafeIdentifier(fn, 'function name');
        const pool = getPool();

        // Build the function call with named parameters
        const paramEntries = params ? Object.entries(params) : [];
        const placeholders: string[] = [];
        const values: unknown[] = [];

        paramEntries.forEach(([key, val], i) => {
          assertSafeIdentifier(key, 'parameter name');
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
