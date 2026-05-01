/**
 * Environment variable validation.
 *
 * Validates required environment variables at module load time so the
 * application fails fast on misconfiguration rather than at request time.
 *
 * - In production (`NODE_ENV === 'production'`), missing required variables
 *   throw an error and crash the process immediately.
 * - In development/test, missing variables emit a warning to let the app
 *   start without all services configured.
 *
 * Import this module from `instrumentation.ts` so it runs at server startup.
 */

import z from 'zod';

import logger from './logger';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Variables that MUST be present in production. In development they are
 * optional (warnings only) so developers can start the app without every
 * service configured.
 */
const requiredInProduction = (schema: z.ZodString) =>
  isProduction ? schema : schema.optional();

const envSchema = z.object({
  /** OpenAI API key — required in production for AI features. */
  OPENAI_API_KEY: requiredInProduction(z.string().min(1)),

  /** API key HMAC secret — required in production for request authentication. */
  API_KEY_HMAC_SECRET: requiredInProduction(z.string().min(1)),

  /** Comma-separated list of valid API keys — required in production. */
  VALID_API_KEYS: requiredInProduction(z.string().min(1)),

  /** PostgreSQL connection string — optional (app degrades gracefully without a DB). */
  DATABASE_URL: z.string().min(1).optional(),

  /** TMDB API key — optional (TMDB fallback is skipped when absent). */
  TMDB_API_KEY: z.string().min(1).optional(),

  /** Redis connection string — optional (rate limiting is skipped when absent). */
  REDIS_URL: z.string().min(1).optional(),

  /** Public base URL — optional. */
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const result = envSchema.safeParse(process.env);

if (!result.success) {
  // Classify issues: a variable is "missing" if the env key is not set at all.
  const missing = result.error.issues
    .filter((i) => {
      const key = i.path[0];
      return typeof key === 'string' && process.env[key] === undefined;
    })
    .map((i) => String(i.path[0]));

  const invalid = result.error.issues
    .filter((i) => {
      const key = i.path[0];
      return !(typeof key === 'string' && process.env[key] === undefined);
    })
    .map((i) => `${i.path.join('.')}: ${i.message}`);

  if (missing.length > 0 && isProduction) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Set these variables before starting the server.',
    );
  }

  if (missing.length > 0) {
    logger.warn({ missing }, 'Missing recommended environment variables — some features may be unavailable');
  }

  if (invalid.length > 0) {
    const msg = `Invalid environment variable values: ${invalid.join('; ')}`;
    if (isProduction) {
      throw new Error(msg);
    }
    logger.warn({ invalid }, msg);
  }
} else {
  // Warn about optional variables that are absent even when validation passes.
  const optionalVars = ['DATABASE_URL', 'TMDB_API_KEY', 'REDIS_URL'] as const;
  const absentOptional = optionalVars.filter((v) => !process.env[v]);
  if (absentOptional.length > 0) {
    logger.warn(
      { absent: absentOptional },
      'Optional environment variables not set — related features will be unavailable',
    );
  }
}

export {};
