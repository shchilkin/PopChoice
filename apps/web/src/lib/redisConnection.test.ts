import { describe, expect, it } from 'vitest';

import { redisOptionsFromUrl } from './redisConnection';

describe('redisOptionsFromUrl', () => {
  it('parses redis URLs without relying on ioredis URL parsing', () => {
    expect(
      redisOptionsFromUrl('redis://user@redis:6380/2?family=4', {
        maxRetriesPerRequest: null,
      }),
    ).toEqual({
      host: 'redis',
      port: 6380,
      username: 'user',
      db: 2,
      family: 4,
      maxRetriesPerRequest: null,
    });
  });

  it('enables TLS for rediss URLs', () => {
    expect(redisOptionsFromUrl('rediss://cache.example.com')).toMatchObject({
      host: 'cache.example.com',
      port: 6379,
      tls: {},
    });
  });

  it('rejects unsupported protocols', () => {
    expect(() => redisOptionsFromUrl('http://redis:6379')).toThrow(
      'REDIS_URL must use redis:// or rediss://',
    );
  });
});
