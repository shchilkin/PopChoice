import { describe, expect, it } from 'vitest';

import { redisOptionsFromUrl } from './redisConnection';

describe('redisOptionsFromUrl', () => {
  it('parses Redis URLs into ioredis options without using legacy URL strings', () => {
    expect(
      redisOptionsFromUrl('redis://user:p%40ss@127.0.0.1:56379/2?family=4', {
        maxRetriesPerRequest: null,
      }),
    ).toEqual({
      db: 2,
      family: 4,
      host: '127.0.0.1',
      maxRetriesPerRequest: null,
      password: 'p@ss',
      port: 56379,
      username: 'user',
    });
  });

  it('enables TLS for rediss URLs', () => {
    expect(redisOptionsFromUrl('rediss://cache.example.com')).toMatchObject({
      host: 'cache.example.com',
      port: 6379,
      tls: {},
    });
  });

  it('rejects unsupported protocols and invalid database indexes', () => {
    expect(() => redisOptionsFromUrl('http://127.0.0.1:6379')).toThrow(
      'REDIS_URL must use redis:// or rediss://',
    );
    expect(() => redisOptionsFromUrl('redis://127.0.0.1/not-a-number')).toThrow(
      'REDIS_URL database index must be a number',
    );
  });
});
