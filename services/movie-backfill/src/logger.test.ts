import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger.js';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts sensitive top-level fields in structured logs', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('Backfill started', {
      apiKey: 'tmdb-secret',
      api_key: 'tmdb-secret-2',
      authorization: 'Bearer tmdb-secret',
      movieTitle: 'Inception',
      count: 5,
    });

    expect(logSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(logSpy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.apiKey).toBe('[REDACTED]');
    expect(payload.api_key).toBe('[REDACTED]');
    expect(payload.authorization).toBe('[REDACTED]');
    expect(payload.movieTitle).toBe('Inception');
    expect(payload.count).toBe(5);
  });
});
