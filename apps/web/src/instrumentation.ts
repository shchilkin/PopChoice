/**
 * Next.js instrumentation hook.
 *
 * Runs once per server process start (not on every request) in the Node.js
 * runtime.
 *
 * Database schema is managed separately via `npm run migrate:db`.
 * See db/init/ for SQL migration files.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initTracing } = await import('@/lib/tracingSetup');
    initTracing('web');
  }
}
