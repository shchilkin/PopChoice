/**
 * Next.js instrumentation hook.
 *
 * Runs once per server process start (not on every request) in the Node.js
 * runtime. We use it to apply any missing database schema so the app works
 * on fresh databases and on existing databases that pre-date a schema change.
 *
 * The SQL statements are idempotent (IF NOT EXISTS), so re-running them on a
 * fully-initialised database is safe.
 */

import logger from '@/lib/logger';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  try {
    // Dynamic import keeps pg out of the edge runtime bundle.
    const pg = await import('pg');
    const pool = new pg.default.Pool({ connectionString, max: 1, allowExitOnIdle: true });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id bigserial PRIMARY KEY,
        email text NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
        ON users (lower(email));
    `);

    await pool.end();
  } catch (err) {
    // Log but do not crash — the server can still serve requests for routes
    // that do not depend on the users table.
    logger.error({ err }, 'Failed to ensure users schema');
  }
}
