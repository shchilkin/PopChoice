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

type WhereClause = QueryState['wheres'][number];

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

  // Column list
  const cols = state.headOnly ? '1' : state.columns;

  // When both data rows and a total count are needed, embed the count as a
  // window function column to avoid a second round-trip to the database.
  const needsWindowCount = state.countMode === 'exact' && !state.headOnly;
  const selectCols = needsWindowCount ? `${cols}, COUNT(*) OVER() AS _total_count` : cols;

  let sql = `SELECT ${selectCols} FROM "${state.table}"`;
  sql += buildWhereSQL(state.wheres, values);

  // ORDER BY
  if (state.orderBy) {
    sql += ` ORDER BY "${state.orderBy.column}" ${state.orderBy.ascending ? 'ASC' : 'DESC'}`;
  }

  sql += buildLimitSQL(state);

  // Build a separate COUNT(*) query used as fallback when the window-function
  // path returns zero rows (OFFSET past end of result set), or for head-only queries.
  const countQuery = buildCountQuery(state);

  return {
    countText: countQuery?.text,
    countValues: countQuery?.values,
    text: sql,
    useWindowCount: needsWindowCount,
    values,
  };
}

function buildWhereSQL(wheres: WhereClause[], values: unknown[]) {
  const clauses = buildWhereClauses(wheres, values);
  return clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
}

function buildWhereClauses(wheres: WhereClause[], values: unknown[]) {
  const index = { value: 1 };
  return wheres.map((where) => buildWhereClause(where, values, index));
}

function buildWhereClause(where: WhereClause, values: unknown[], index: { value: number }) {
  if (where.op === 'IN') {
    values.push(where.value as unknown[]);
    return `"${where.column}" = ANY($${index.value++})`;
  }

  const placeholder = `$${index.value++}`;
  values.push(where.value);
  return where.op === 'ILIKE'
    ? `"${where.column}" ILIKE ${placeholder} ESCAPE '\\'`
    : `"${where.column}" ${where.op} ${placeholder}`;
}

function buildLimitSQL(state: QueryState) {
  const rangeSQL = buildRangeSQL(state);
  return rangeSQL ?? buildLimitOnlySQL(state);
}

function buildRangeSQL(state: QueryState) {
  if (state.rangeFrom === null || state.rangeTo === null) {
    return null;
  }

  const limit = safeNonNegativeInt(state.rangeTo - state.rangeFrom + 1);
  const offset = safeNonNegativeInt(state.rangeFrom);
  return ` LIMIT ${limit} OFFSET ${offset}`;
}

function buildLimitOnlySQL(state: QueryState) {
  return state.limitVal === null ? '' : ` LIMIT ${safeNonNegativeInt(state.limitVal)}`;
}

function buildCountQuery(state: QueryState) {
  if (state.countMode !== 'exact') {
    return null;
  }

  const values: unknown[] = [];
  return {
    text: `SELECT COUNT(*) as count FROM "${state.table}"${buildWhereSQL(state.wheres, values)}`,
    values,
  };
}

// ---------------------------------------------------------------------------
// Execute a SELECT and return a QueryResult
// ---------------------------------------------------------------------------

async function executeSelect<T>(pool: PgPool, state: QueryState): Promise<QueryResult<T>> {
  try {
    const { text, values, useWindowCount, countText, countValues } = buildSelectSQL(state);

    if (state.headOnly) {
      return executeHeadOnlySelect(pool, countText, countValues);
    }

    const result = await pool.query(text, values);

    if (useWindowCount) {
      return executeWindowCountSelect<T>(pool, result.rows, countText, countValues);
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

async function executeHeadOnlySelect<T>(
  pool: PgPool,
  countText: string | undefined,
  countValues: unknown[] | undefined,
): Promise<QueryResult<T>> {
  if (!countText) {
    return { data: null, error: null };
  }

  return { count: await queryCount(pool, countText, countValues), data: null, error: null };
}

async function executeWindowCountSelect<T>(
  pool: PgPool,
  rows: unknown[],
  countText: string | undefined,
  countValues: unknown[] | undefined,
): Promise<QueryResult<T>> {
  type RowWithCount = T & { _total_count?: string | number };
  const rowsWithCount = rows as RowWithCount[];

  if (rowsWithCount.length > 0) {
    const count = parseInt(String(rowsWithCount[0]._total_count ?? '0'), 10);
    const data = rowsWithCount.map(({ _total_count: _, ...rest }) => rest as T);
    return { count, data, error: null };
  }

  const fallbackCount = countText ? await queryCount(pool, countText, countValues) : 0;
  return { count: fallbackCount, data: [], error: null };
}

async function queryCount(pool: PgPool, countText: string, countValues: unknown[] | undefined) {
  const countResult = await pool.query(countText, countValues);
  return parseInt(countResult.rows[0]?.count ?? '0', 10);
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
    ilike: (column: string, value: string) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: 'ILIKE', value });
      return createFilter<T>(pool, state);
    },
    gte: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '>=', value });
      return createFilter<T>(pool, state);
    },
    lte: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '<=', value });
      return createFilter<T>(pool, state);
    },
    neq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '!=', value });
      return lazyResult<T>(pool, state);
    },
    in: (column: string, values: unknown[]) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: 'IN', value: values });
      return createFilter<T>(pool, state);
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
    ilike: (column: string, value: string) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: 'ILIKE', value });
      return createFilter<T>(pool, state);
    },
    gte: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '>=', value });
      return createFilter<T>(pool, state);
    },
    lte: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '<=', value });
      return createFilter<T>(pool, state);
    },
    neq: (column: string, value: unknown) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: '!=', value });
      return lazyResult<T>(pool, state);
    },
    in: (column: string, values: unknown[]) => {
      assertSafeIdentifier(column, 'column name');
      state.wheres.push({ column, op: 'IN', value: values });
      return createFilter<T>(pool, state);
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
      const columns = getInsertColumns(rowArray);
      const { values, valuePlaceholders } = buildInsertValues(rowArray, columns);
      const sql = buildInsertSQL(table, columns, valuePlaceholders, returning);
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

function getInsertColumns<T>(rowArray: T[]) {
  const columns = Object.keys(rowArray[0] as Record<string, unknown>);
  columns.forEach((column) => assertSafeIdentifier(column, 'column name'));
  return columns;
}

function buildInsertValues<T>(rowArray: T[], columns: string[]) {
  const values: unknown[] = [];
  const index = { value: 1 };
  const valuePlaceholders = rowArray.map((row) =>
    buildInsertRowValues(row, columns, values, index),
  );

  return { values, valuePlaceholders };
}

function buildInsertRowValues<T>(
  row: T,
  columns: string[],
  values: unknown[],
  index: { value: number },
) {
  const record = row as Record<string, unknown>;
  const placeholders = columns.map((column) => {
    values.push(normalizeInsertValue(column, record[column]));
    return `$${index.value++}`;
  });

  return `(${placeholders.join(', ')})`;
}

function normalizeInsertValue(column: string, value: unknown) {
  return column === 'embedding' && Array.isArray(value)
    ? `[${(value as number[]).join(',')}]`
    : value;
}

function buildInsertSQL(
  table: string,
  columns: string[],
  valuePlaceholders: string[],
  returning: string | null,
) {
  const colList = columns.map((column) => `"${column}"`).join(', ');
  const returningClause = buildReturningClause(returning);
  return `INSERT INTO "${table}" (${colList}) VALUES ${valuePlaceholders.join(', ')}${returningClause}`;
}

function buildReturningClause(returning: string | null) {
  return returning ? ` RETURNING ${formatReturningColumns(returning)}` : '';
}

function formatReturningColumns(returning: string) {
  return returning === '*' ? '*' : returning.split(',').map(formatReturningColumn).join(', ');
}

function formatReturningColumn(column: string) {
  const trimmed = column.trim();
  assertSafeIdentifier(trimmed, 'column name');
  return `"${trimmed}"`;
}

// ---------------------------------------------------------------------------
// DELETE builder
// ---------------------------------------------------------------------------

function createDelete<T>(pool: PgPool, table: string): QueryDelete<T> {
  function makeDeleteByColumn(
    column: string,
    op: '=' | '!=',
    value: unknown,
  ): PromiseLike<QueryResult<T>> {
    assertSafeIdentifier(column, 'column name');
    const sql = `DELETE FROM "${table}" WHERE "${column}" ${op} $1`;
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
  }

  return {
    eq: (column: string, value: unknown) => makeDeleteByColumn(column, '=', value),
    neq: (column: string, value: unknown) => makeDeleteByColumn(column, '!=', value),
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

    query: async <T = unknown>(
      text: string,
      values: readonly unknown[] = [],
    ): Promise<{ rows: T[]; rowCount: number | null }> => {
      const result = await getPool().query(text, [...values]);
      return { rows: result.rows as T[], rowCount: result.rowCount };
    },

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
        const sql = `SELECT * FROM "${fn}"(${callArgs})`;

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
