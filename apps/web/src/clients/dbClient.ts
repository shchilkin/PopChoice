/**
 * Generic Database Client Abstraction
 *
 * Provides a provider-agnostic interface for all database operations used by PopChoice.
 * The default implementation delegates to the PostgreSQL backend via `pgClient.ts`.
 *
 * ## Swapping the database backend
 *
 * 1. Create a class that implements `DbClient`.
 * 2. Call `setDbClient(yourInstance)` before any database operations run
 *    (e.g., in your app bootstrap or test setup).
 *
 * ## Example – using a mock in tests
 *
 * ```ts
 * import { setDbClient, type DbClient } from '@/clients/dbClient';
 *
 * const mock: DbClient = {
 *   isConfigured: () => true,
 *   from: () => ({ ... }),
 *   rpc:  () => Promise.resolve({ data: [], error: null }),
 * };
 * setDbClient(mock);
 * ```
 */

import { createPgDbClient } from './pgClient';

// ---------------------------------------------------------------------------
// Query-builder types (mirror the chainable Supabase API surface used by the
// app so that consumers don't need to change their call-sites).
// ---------------------------------------------------------------------------

/** Result returned at the end of every query chain. */
export interface QueryResult<T = unknown> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

/** Terminal query step – awaitable for a result. */
export interface QueryTerminal<T = unknown> extends PromiseLike<QueryResult<T>> {
  order: (column: string, options?: { ascending?: boolean }) => PromiseLike<QueryResult<T>>;
}

/** Range-able step in the query chain. */
export interface QueryRange<T = unknown> {
  range: (from: number, to: number) => QueryTerminal<T>;
  order: (column: string, options?: { ascending?: boolean }) => PromiseLike<QueryResult<T>>;
}

/** Filterable step in the query chain. */
export interface QueryFilter<T = unknown> extends PromiseLike<QueryResult<T>> {
  eq: (column: string, value: unknown) => QueryFilter<T>;
  ilike: (column: string, value: string) => QueryFilter<T>;
  gte: (column: string, value: unknown) => QueryFilter<T>;
  lte: (column: string, value: unknown) => QueryFilter<T>;
  neq: (column: string, value: unknown) => PromiseLike<QueryResult<T>>;
  in: (column: string, values: unknown[]) => PromiseLike<QueryResult<T>>;
  limit: (count: number) => PromiseLike<QueryResult<T>>;
  range: (from: number, to: number) => QueryTerminal<T>;
  order: (column: string, options?: { ascending?: boolean }) => PromiseLike<QueryResult<T>>;
}

/** Select step – resolves to a result (with optional count). Also supports chaining. */
export interface QuerySelect<T = unknown> extends PromiseLike<QueryResult<T>> {
  eq: (column: string, value: unknown) => QueryFilter<T>;
  ilike: (column: string, value: string) => QueryFilter<T>;
  gte: (column: string, value: unknown) => QueryFilter<T>;
  lte: (column: string, value: unknown) => QueryFilter<T>;
  neq: (column: string, value: unknown) => PromiseLike<QueryResult<T>>;
  in: (column: string, values: unknown[]) => PromiseLike<QueryResult<T>>;
  limit: (count: number) => PromiseLike<QueryResult<T>>;
  range: (from: number, to: number) => QueryTerminal<T>;
  order: (column: string, options?: { ascending?: boolean }) => PromiseLike<QueryResult<T>>;
}

/** Insert step – optionally chain `.select()` to get inserted rows back. */
export interface QueryInsert<T = unknown> extends PromiseLike<QueryResult<T>> {
  select: (columns?: string) => PromiseLike<QueryResult<T>>;
}

/** Delete step. */
export interface QueryDelete<T = unknown> {
  eq: (column: string, value: unknown) => PromiseLike<QueryResult<T>>;
  neq: (column: string, value: unknown) => PromiseLike<QueryResult<T>>;
}

/** Object returned by `dbClient.from(table)`. */
export interface TableRef<T = unknown> {
  select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => QuerySelect<T>;
  insert: (rows: T | T[]) => QueryInsert<T>;
  delete: () => QueryDelete<T>;
}

// ---------------------------------------------------------------------------
// DbClient interface
// ---------------------------------------------------------------------------

/**
 * Generic database client interface.
 *
 * Provides a provider-agnostic API for all database operations used by PopChoice,
 * making it trivial to drop in a different implementation.
 */
export interface DbClient {
  /**
   * Whether the client is ready to execute queries.
   *
   * The default pg implementation checks for the DATABASE_URL env var;
   * custom implementations can override this (e.g., always return `true`).
   */
  isConfigured: () => boolean;

  /** Return a chainable query builder for the given table. */
  from: <T = unknown>(table: string) => TableRef<T>;

  /** Call a stored procedure / RPC function. */
  rpc: (
    fn: string,
    params?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}

// ---------------------------------------------------------------------------
// Singleton with setter (dependency injection)
// ---------------------------------------------------------------------------

let _client: DbClient = createPgDbClient();

/**
 * Get the current database client instance.
 *
 * By default this returns the pg-backed client. Call {@link setDbClient}
 * to replace it (e.g., in tests or when migrating to a different backend).
 */
export function getDbClient(): DbClient {
  return _client;
}

/**
 * Replace the global database client.
 *
 * Useful for:
 * - Injecting a mock in tests
 * - Swapping to a different DB provider at startup
 */
export function setDbClient(client: DbClient): void {
  _client = client;
}

/**
 * Reset the database client back to the default pg implementation.
 *
 * Primarily useful in test teardown.
 */
export function resetDbClient(): void {
  _client = createPgDbClient();
}
