import { z, type ZodIssue } from 'zod';

import type { OperatorAuthConfig } from './operatorAuth.js';

type RuntimeEnv = Record<string, string | undefined>;

const DEFAULT_OPERATOR_AUTH_REALM = 'PopChoice Operators';
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX = 30;
const DEFAULT_BACKOFFICE_PORT = 3000;
const DEFAULT_BULL_BOARD_PORT = 4000;
const DEFAULT_CATALOG_HEALTH_SAMPLE_LIMIT = 5;
const DEFAULT_CATALOG_HEALTH_STALE_DAYS = 180;
const DEFAULT_TMDB_LANGUAGE = 'en-US';

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function optionalNonEmptyString() {
  return z.preprocess(emptyStringToUndefined, z.string().min(1).optional());
}

function booleanEnv(defaultValue: boolean) {
  return z.preprocess((value) => {
    const normalized = emptyStringToUndefined(value);
    if (normalized === undefined) return defaultValue;
    if (typeof normalized === 'boolean') return normalized;

    if (typeof normalized === 'string') {
      const lower = normalized.toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(lower)) return true;
      if (['0', 'false', 'no', 'off'].includes(lower)) return false;
    }

    return normalized;
  }, z.boolean());
}

function positiveIntegerEnv(defaultValue: number) {
  return z.preprocess((value) => {
    const normalized = emptyStringToUndefined(value);
    return normalized === undefined ? defaultValue : normalized;
  }, z.coerce.number().int().positive());
}

function optionalPositiveIntegerEnv() {
  return z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().optional());
}

function requiredUrlEnv(name: string, protocols: string[]) {
  const schema = z
    .string({ error: `${name} is required.` })
    .min(1, `${name} is required.`)
    .refine(
      (value) => {
        try {
          const url = new URL(value);
          return protocols.includes(url.protocol);
        } catch {
          return false;
        }
      },
      { message: `${name} must use one of: ${protocols.join(', ')}` },
    );

  return z.preprocess(emptyStringToUndefined, schema);
}

function optionalUrlEnv(name: string, protocols: string[]) {
  return z.preprocess(emptyStringToUndefined, requiredUrlEnv(name, protocols).optional());
}

const OperatorAuthRuntimeEnvSchema = z
  .object({
    OPERATOR_AUTH_PASSWORD: optionalNonEmptyString(),
    OPERATOR_AUTH_REALM: z.preprocess(
      emptyStringToUndefined,
      z.string().min(1).default(DEFAULT_OPERATOR_AUTH_REALM),
    ),
    OPERATOR_AUTH_REQUIRED: booleanEnv(false),
    OPERATOR_AUTH_USERNAME: optionalNonEmptyString(),
  })
  .superRefine((env, context) => {
    const hasUsername = Boolean(env.OPERATOR_AUTH_USERNAME);
    const hasPassword = Boolean(env.OPERATOR_AUTH_PASSWORD);

    if (env.OPERATOR_AUTH_REQUIRED && !hasUsername && !hasPassword) {
      context.addIssue({
        code: 'custom',
        message:
          'OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD must be set when operator auth is required.',
        path: ['OPERATOR_AUTH_USERNAME'],
      });
      return;
    }

    if (hasUsername !== hasPassword) {
      context.addIssue({
        code: 'custom',
        message:
          'Set both OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD, or set neither locally.',
        path: ['OPERATOR_AUTH_USERNAME'],
      });
    }
  });

type OperatorAuthRuntimeEnv = z.infer<typeof OperatorAuthRuntimeEnvSchema>;

export interface BackofficeRuntimeConfig {
  catalogHealthSampleLimit: number;
  catalogHealthStaleDays: number;
  databaseUrl: string;
  operatorAuth: OperatorAuthConfig | null;
  operatorAuthRateLimitMax: number;
  operatorAuthRateLimitWindowSeconds: number;
  port: number;
  redisUrl?: string;
  tmdbLanguage: string;
}

export interface BullBoardRuntimeConfig {
  operatorAuth: OperatorAuthConfig | null;
  operatorAuthRateLimitMax: number;
  operatorAuthRateLimitWindowSeconds: number;
  port: number;
  redisUrl: string;
}

const BackofficeRuntimeEnvSchema = OperatorAuthRuntimeEnvSchema.extend({
  CATALOG_HEALTH_SAMPLE_LIMIT: positiveIntegerEnv(DEFAULT_CATALOG_HEALTH_SAMPLE_LIMIT),
  CATALOG_HEALTH_STALE_DAYS: positiveIntegerEnv(DEFAULT_CATALOG_HEALTH_STALE_DAYS),
  DATABASE_URL: requiredUrlEnv('DATABASE_URL', ['postgres:', 'postgresql:']),
  OPERATOR_AUTH_RATE_LIMIT_MAX: positiveIntegerEnv(DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX),
  OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS: positiveIntegerEnv(
    DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
  ),
  PORT: positiveIntegerEnv(DEFAULT_BACKOFFICE_PORT),
  REDIS_URL: optionalUrlEnv('REDIS_URL', ['redis:', 'rediss:']),
  TMDB_LANGUAGE: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).default(DEFAULT_TMDB_LANGUAGE),
  ),
});

const BullBoardRuntimeEnvSchema = OperatorAuthRuntimeEnvSchema.extend({
  BULL_BOARD_PORT: optionalPositiveIntegerEnv(),
  OPERATOR_AUTH_RATE_LIMIT_MAX: positiveIntegerEnv(DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX),
  OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS: positiveIntegerEnv(
    DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
  ),
  PORT: optionalPositiveIntegerEnv(),
  REDIS_URL: requiredUrlEnv('REDIS_URL', ['redis:', 'rediss:']),
});

function formatIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : 'env';
  return `${path}: ${issue.message}`;
}

function parseRuntimeEnv<T>(name: string, schema: z.ZodType<T>, env: RuntimeEnv): T {
  const result = schema.safeParse(env);

  if (result.success) return result.data;

  const details = result.error.issues.map(formatIssue).join('; ');
  throw new Error(`${name} runtime config is invalid: ${details}`);
}

function toOperatorAuthConfig(env: OperatorAuthRuntimeEnv): OperatorAuthConfig | null {
  if (!env.OPERATOR_AUTH_USERNAME && !env.OPERATOR_AUTH_PASSWORD) return null;

  return {
    password: env.OPERATOR_AUTH_PASSWORD ?? '',
    realm: env.OPERATOR_AUTH_REALM,
    username: env.OPERATOR_AUTH_USERNAME ?? '',
  };
}

export function readBackofficeRuntimeConfig(
  env: RuntimeEnv = process.env,
): BackofficeRuntimeConfig {
  const parsed = parseRuntimeEnv('Backoffice', BackofficeRuntimeEnvSchema, env);

  return {
    catalogHealthSampleLimit: parsed.CATALOG_HEALTH_SAMPLE_LIMIT,
    catalogHealthStaleDays: parsed.CATALOG_HEALTH_STALE_DAYS,
    databaseUrl: parsed.DATABASE_URL,
    operatorAuth: toOperatorAuthConfig(parsed),
    operatorAuthRateLimitMax: parsed.OPERATOR_AUTH_RATE_LIMIT_MAX,
    operatorAuthRateLimitWindowSeconds: parsed.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
    port: parsed.PORT,
    redisUrl: parsed.REDIS_URL,
    tmdbLanguage: parsed.TMDB_LANGUAGE,
  };
}

export function readBullBoardRuntimeConfig(env: RuntimeEnv = process.env): BullBoardRuntimeConfig {
  const parsed = parseRuntimeEnv('Bull Board', BullBoardRuntimeEnvSchema, env);

  return {
    operatorAuth: toOperatorAuthConfig(parsed),
    operatorAuthRateLimitMax: parsed.OPERATOR_AUTH_RATE_LIMIT_MAX,
    operatorAuthRateLimitWindowSeconds: parsed.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
    port: parsed.PORT ?? parsed.BULL_BOARD_PORT ?? DEFAULT_BULL_BOARD_PORT,
    redisUrl: parsed.REDIS_URL,
  };
}
