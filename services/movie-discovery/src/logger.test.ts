import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger.js';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts sensitive top-level fields in structured logs', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('Discovery run started', {
      token: 'secret-token',
      api_key: 'tmdb-secret',
      status: 'running',
      count: 3,
    });

    expect(logSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(logSpy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.token).toBe('[REDACTED]');
    expect(payload.api_key).toBe('[REDACTED]');
    expect(payload.status).toBe('running');
    expect(payload.count).toBe(3);
  });
});
