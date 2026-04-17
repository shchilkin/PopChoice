import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from './config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Required env vars for a minimal valid config. */
const REQUIRED_ENV = {
  TMDB_API_KEY: 'token123',
  OPENAI_API_KEY: 'sk-test',
  DATABASE_URL: 'postgresql://localhost/test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadConfig', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_API_KEY', REQUIRED_ENV.TMDB_API_KEY);
    vi.stubEnv('OPENAI_API_KEY', REQUIRED_ENV.OPENAI_API_KEY);
    vi.stubEnv('DATABASE_URL', REQUIRED_ENV.DATABASE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ---- required vars --------------------------------------------------------

  it('returns config with correct values from required env vars', () => {
    const config = loadConfig();
    expect(config.tmdbApiKey).toBe(REQUIRED_ENV.TMDB_API_KEY);
    expect(config.openaiApiKey).toBe(REQUIRED_ENV.OPENAI_API_KEY);
    expect(config.databaseUrl).toBe(REQUIRED_ENV.DATABASE_URL);
  });

  it('throws when TMDB_API_KEY is missing', () => {
    vi.stubEnv('TMDB_API_KEY', '');
    expect(() => loadConfig()).toThrow('TMDB_API_KEY');
  });

  it('throws when OPENAI_API_KEY is missing', () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(() => loadConfig()).toThrow('OPENAI_API_KEY');
  });

  it('throws when DATABASE_URL is missing', () => {
    vi.stubEnv('DATABASE_URL', '');
    expect(() => loadConfig()).toThrow('DATABASE_URL');
  });

  it('throws listing all missing required vars at once', () => {
    vi.stubEnv('TMDB_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('DATABASE_URL', '');
    expect(() => loadConfig()).toThrow('Missing required environment variables');
  });

  // ---- optional vars: defaults ----------------------------------------------

  it('defaults dryRun to false', () => {
    expect(loadConfig().dryRun).toBe(false);
  });

  it('sets dryRun to true when DRY_RUN=true', () => {
    vi.stubEnv('DRY_RUN', 'true');
    expect(loadConfig().dryRun).toBe(true);
  });

  it('defaults batchSize to 5', () => {
    expect(loadConfig().batchSize).toBe(5);
  });

  it('parses custom BATCH_SIZE', () => {
    vi.stubEnv('BATCH_SIZE', '10');
    expect(loadConfig().batchSize).toBe(10);
  });

  it('throws on non-positive BATCH_SIZE', () => {
    vi.stubEnv('BATCH_SIZE', '0');
    expect(() => loadConfig()).toThrow('BATCH_SIZE');
  });

  it('throws on non-numeric BATCH_SIZE', () => {
    vi.stubEnv('BATCH_SIZE', 'abc');
    expect(() => loadConfig()).toThrow('BATCH_SIZE');
  });

  it('defaults maxMovies to 0 (unlimited)', () => {
    expect(loadConfig().maxMovies).toBe(0);
  });

  it('parses custom MAX_MOVIES', () => {
    vi.stubEnv('MAX_MOVIES', '50');
    expect(loadConfig().maxMovies).toBe(50);
  });

  it('throws on negative MAX_MOVIES', () => {
    vi.stubEnv('MAX_MOVIES', '-1');
    expect(() => loadConfig()).toThrow('MAX_MOVIES');
  });
});
