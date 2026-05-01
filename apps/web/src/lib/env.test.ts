/**
 * Tests for the environment variable validation module (`src/lib/env.ts`).
 *
 * The module validates process.env at import time as a side-effect, so each
 * test isolates its environment by dynamically re-importing the module after
 * manipulating process.env.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Ensure logger is mocked so tests don't emit real log output.
vi.mock('./logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Snapshot of the original environment so we can restore it after each test. */
const ORIGINAL_ENV = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  // Clear the current env and apply fresh values for this test.
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

const REQUIRED_PRODUCTION_VARS = {
  OPENAI_API_KEY: 'sk-test',
  API_KEY_HMAC_SECRET: 'hmac-secret',
  VALID_API_KEYS: 'key1,key2',
  NODE_ENV: 'production',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('env validation — development (NODE_ENV=development)', () => {
  beforeEach(() => {
    vi.resetModules();
    setEnv({ NODE_ENV: 'development', OPENAI_API_KEY: 'sk-test' });
  });

  afterEach(() => {
    restoreEnv();
  });

  it('does NOT throw when required production variables are absent in development', async () => {
    // Remove all required-in-production vars
    setEnv({ NODE_ENV: 'development' });

    await expect(import('./env')).resolves.toBeDefined();
  });

  it('loads without error when all required variables are present', async () => {
    setEnv({ ...REQUIRED_PRODUCTION_VARS, NODE_ENV: 'development' });

    await expect(import('./env')).resolves.toBeDefined();
  });
});

describe('env validation — production (NODE_ENV=production)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv();
  });

  it('does NOT throw when all required variables are present', async () => {
    setEnv(REQUIRED_PRODUCTION_VARS);

    await expect(import('./env')).resolves.toBeDefined();
  });

  it('throws when OPENAI_API_KEY is missing in production', async () => {
    const { OPENAI_API_KEY: _removedOpenAI, ...rest } = REQUIRED_PRODUCTION_VARS;
    setEnv(rest);

    await expect(import('./env')).rejects.toThrow(/OPENAI_API_KEY/);
  });

  it('throws when API_KEY_HMAC_SECRET is missing in production', async () => {
    const { API_KEY_HMAC_SECRET: _removedHmacSecret, ...rest } = REQUIRED_PRODUCTION_VARS;
    setEnv(rest);

    await expect(import('./env')).rejects.toThrow(/API_KEY_HMAC_SECRET/);
  });

  it('throws when VALID_API_KEYS is missing in production', async () => {
    const { VALID_API_KEYS: _removedApiKeys, ...rest } = REQUIRED_PRODUCTION_VARS;
    setEnv(rest);

    await expect(import('./env')).rejects.toThrow(/VALID_API_KEYS/);
  });

  it('throws when multiple required variables are missing', async () => {
    setEnv({ NODE_ENV: 'production' });

    await expect(import('./env')).rejects.toThrow(
      /Missing required environment variables/,
    );
  });
});
