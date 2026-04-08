import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from './config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Required env vars for a minimal valid config. */
const REQUIRED_ENV = {
  TMDB_READ_ACCESS_TOKEN: 'token123',
  OPENAI_API_KEY: 'sk-test',
  DATABASE_URL: 'postgresql://localhost/test',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadConfig', () => {
  beforeEach(() => {
    // Start each test with the minimal required vars in place
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', REQUIRED_ENV.TMDB_READ_ACCESS_TOKEN);
    vi.stubEnv('OPENAI_API_KEY', REQUIRED_ENV.OPENAI_API_KEY);
    vi.stubEnv('DATABASE_URL', REQUIRED_ENV.DATABASE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ---- required vars --------------------------------------------------------

  it('returns config with correct values from required env vars', () => {
    const config = loadConfig();
    expect(config.tmdbReadAccessToken).toBe(REQUIRED_ENV.TMDB_READ_ACCESS_TOKEN);
    expect(config.openaiApiKey).toBe(REQUIRED_ENV.OPENAI_API_KEY);
    expect(config.databaseUrl).toBe(REQUIRED_ENV.DATABASE_URL);
  });

  it('throws when TMDB_READ_ACCESS_TOKEN is missing', () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '');
    expect(() => loadConfig()).toThrow('TMDB_READ_ACCESS_TOKEN');
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
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('DATABASE_URL', '');
    expect(() => loadConfig()).toThrow('Missing required environment variables');
  });

  // ---- optional numeric vars: defaults -------------------------------------

  it('uses default maxPagesPerSource of 3 when not set', () => {
    const config = loadConfig();
    expect(config.maxPagesPerSource).toBe(3);
  });

  it('uses default minVoteCount of 500 when not set', () => {
    const config = loadConfig();
    expect(config.minVoteCount).toBe(500);
  });

  it('uses default minVoteAverage of 6.5 when not set', () => {
    const config = loadConfig();
    expect(config.minVoteAverage).toBe(6.5);
  });

  it('uses default maxMoviesPerRun of 50 when not set', () => {
    const config = loadConfig();
    expect(config.maxMoviesPerRun).toBe(50);
  });

  it('parses custom numeric env vars', () => {
    vi.stubEnv('MAX_PAGES_PER_SOURCE', '5');
    vi.stubEnv('MIN_VOTE_COUNT', '1000');
    vi.stubEnv('MIN_VOTE_AVERAGE', '7.0');
    vi.stubEnv('MAX_MOVIES_PER_RUN', '100');
    const config = loadConfig();
    expect(config.maxPagesPerSource).toBe(5);
    expect(config.minVoteCount).toBe(1000);
    expect(config.minVoteAverage).toBe(7.0);
    expect(config.maxMoviesPerRun).toBe(100);
  });

  // ---- numeric validation: NaN / non-positive ------------------------------

  it('throws on non-numeric MAX_PAGES_PER_SOURCE', () => {
    vi.stubEnv('MAX_PAGES_PER_SOURCE', 'abc');
    expect(() => loadConfig()).toThrow('MAX_PAGES_PER_SOURCE');
  });

  it('throws on zero MAX_MOVIES_PER_RUN', () => {
    vi.stubEnv('MAX_MOVIES_PER_RUN', '0');
    expect(() => loadConfig()).toThrow('MAX_MOVIES_PER_RUN');
  });

  it('throws on negative MIN_VOTE_COUNT', () => {
    vi.stubEnv('MIN_VOTE_COUNT', '-1');
    expect(() => loadConfig()).toThrow('MIN_VOTE_COUNT');
  });

  it('throws on non-numeric MIN_VOTE_AVERAGE', () => {
    vi.stubEnv('MIN_VOTE_AVERAGE', 'high');
    expect(() => loadConfig()).toThrow('MIN_VOTE_AVERAGE');
  });

  // ---- TMDB_SOURCES --------------------------------------------------------

  it('uses all four sources by default', () => {
    const config = loadConfig();
    expect(config.sources).toEqual(['now_playing', 'upcoming', 'top_rated', 'popular']);
  });

  it('uses subset of sources when valid values provided', () => {
    vi.stubEnv('TMDB_SOURCES', 'top_rated,popular');
    const config = loadConfig();
    expect(config.sources).toEqual(['top_rated', 'popular']);
  });

  it('ignores invalid source entries alongside valid ones', () => {
    vi.stubEnv('TMDB_SOURCES', 'top_rated,invalid_source');
    const config = loadConfig();
    expect(config.sources).toEqual(['top_rated']);
  });

  it('throws when all provided TMDB_SOURCES values are invalid', () => {
    vi.stubEnv('TMDB_SOURCES', 'invalid1,invalid2');
    expect(() => loadConfig()).toThrow('TMDB_SOURCES must include at least one valid source');
  });

  // ---- other optional vars -------------------------------------------------

  it('defaults dryRun to false', () => {
    const config = loadConfig();
    expect(config.dryRun).toBe(false);
  });

  it('sets dryRun to true when DRY_RUN=true', () => {
    vi.stubEnv('DRY_RUN', 'true');
    const config = loadConfig();
    expect(config.dryRun).toBe(true);
  });

  it('uses default schedule when SYNC_SCHEDULE not set', () => {
    const config = loadConfig();
    expect(config.schedule).toBe('0 0 * * 0');
  });

  it('uses custom schedule when SYNC_SCHEDULE is provided', () => {
    vi.stubEnv('SYNC_SCHEDULE', '0 3 * * 1');
    const config = loadConfig();
    expect(config.schedule).toBe('0 3 * * 1');
  });

  // ---- TMDB_LANGUAGE -------------------------------------------------------

  it('defaults language to en-US when TMDB_LANGUAGE not set', () => {
    const config = loadConfig();
    expect(config.language).toBe('en-US');
  });

  it('uses custom language when TMDB_LANGUAGE is provided', () => {
    vi.stubEnv('TMDB_LANGUAGE', 'fi-FI');
    const config = loadConfig();
    expect(config.language).toBe('fi-FI');
  });
});
