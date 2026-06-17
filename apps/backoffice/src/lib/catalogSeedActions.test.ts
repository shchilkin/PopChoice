import { describe, expect, it, vi } from 'vitest';

import { getCatalogSeedStatus, performCatalogSeedAction } from './catalogSeedActions';

function formData(action = 'trigger_movie_seed') {
  const data = new FormData();
  data.set('action', action);
  return data;
}

function authHeaders() {
  return new Headers({
    authorization: `Basic ${Buffer.from('operator:secret').toString('base64')}`,
  });
}

function testEnv(env: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: 'test', ...env };
}

describe('catalog seed actions', () => {
  it('reports whether the movie seed queue can be reached from backoffice', () => {
    expect(getCatalogSeedStatus(testEnv({ REDIS_URL: 'redis://redis:6379' }))).toEqual({
      queueConfigured: true,
      queueName: 'movie-seed',
    });

    expect(getCatalogSeedStatus(testEnv())).toEqual({
      queueConfigured: false,
      queueName: 'movie-seed',
    });
  });

  it('queues the curated movie seed job with the operator username', async () => {
    const enqueueSeed = vi.fn().mockResolvedValue({
      jobId: 'curated-movie-seed',
      status: 'queued',
    });

    const result = await performCatalogSeedAction({
      enqueueSeed,
      env: testEnv({ REDIS_URL: 'redis://redis:6379' }),
      formData: formData(),
      headers: authHeaders(),
    });

    expect(result.status).toBe('triggered');
    expect(result.message).toContain('curated-movie-seed');
    expect(enqueueSeed).toHaveBeenCalledWith({ requestedBy: 'operator' });
  });

  it('reports an existing active seed job as triggered', async () => {
    const enqueueSeed = vi.fn().mockResolvedValue({
      jobId: 'curated-movie-seed',
      status: 'deduped',
    });

    const result = await performCatalogSeedAction({
      enqueueSeed,
      env: testEnv({ REDIS_URL: 'redis://redis:6379' }),
      formData: formData(),
      headers: authHeaders(),
    });

    expect(result).toMatchObject({ status: 'triggered' });
    expect(result.message).toContain('already queued or running');
  });

  it('does not enqueue when REDIS_URL is missing', async () => {
    const enqueueSeed = vi.fn();

    const result = await performCatalogSeedAction({
      enqueueSeed,
      env: testEnv(),
      formData: formData(),
      headers: authHeaders(),
    });

    expect(result).toMatchObject({ status: 'unavailable' });
    expect(enqueueSeed).not.toHaveBeenCalled();
  });

  it('rejects unsupported seed actions', async () => {
    const enqueueSeed = vi.fn();

    const result = await performCatalogSeedAction({
      enqueueSeed,
      env: testEnv({ REDIS_URL: 'redis://redis:6379' }),
      formData: formData('delete_catalog'),
      headers: authHeaders(),
    });

    expect(result).toMatchObject({ status: 'failed' });
    expect(enqueueSeed).not.toHaveBeenCalled();
  });
});
