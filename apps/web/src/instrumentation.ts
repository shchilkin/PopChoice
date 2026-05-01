/**
 * Next.js instrumentation hook.
 *
 * This file is executed once when the Next.js server starts (both in
 * development and production). It is the canonical place to run startup
 * validation such as environment variable checks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Validate required environment variables at server startup so the app
  // fails fast on misconfiguration rather than at request time.
  // The import has side-effects: it validates process.env and throws in
  // production if required variables are missing.
  await import('./lib/env');
}
