import type { RedisOptions } from 'ioredis';

export function redisOptionsFromUrl(redisUrl: string, overrides: RedisOptions = {}): RedisOptions {
  const url = new URL(redisUrl);

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }

  const dbPath = url.pathname.replace(/^\/+/, '');
  const db = dbPath ? Number.parseInt(dbPath, 10) : undefined;

  if (dbPath && Number.isNaN(db)) {
    throw new Error('REDIS_URL database index must be a number');
  }

  const family = url.searchParams.get('family');
  const parsedFamily = family ? Number.parseInt(family, 10) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : 6379,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(db !== undefined ? { db } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    ...(parsedFamily !== undefined && !Number.isNaN(parsedFamily) ? { family: parsedFamily } : {}),
    ...overrides,
  };
}
