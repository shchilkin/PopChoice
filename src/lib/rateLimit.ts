import { isIP } from 'node:net';

import { createClient } from 'redis';

import logger from '@/lib/logger';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
// Stores the in-flight init attempt so concurrent calls share one connection attempt.
// Reset to null on failure so the next request can retry.
let initPromise: Promise<RedisClient | null> | null = null;

function doInitialize(): Promise<RedisClient | null> {
  return (async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn('REDIS_URL not set. Rate limiting disabled.');
      return null;
    }

    try {
      const client = createClient({ url: redisUrl });
      await client.connect();
      redisClient = client;
      logger.info('Rate limiter initialized with Redis');
      return client;
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Redis client');
      // Reset so the next request can attempt reconnection
      initPromise = null;
      return null;
    }
  })();
}

function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient) return Promise.resolve(redisClient);
  if (!initPromise) initPromise = doInitialize();
  return initPromise;
}

export async function applyRateLimit(req: Request): Promise<Response | null> {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const forwardedForClientIp = forwardedFor
    ? (forwardedFor
        .split(',')
        .map((value) => value.trim())
        .find((value) => value !== '' && isIP(value) !== 0) ?? null)
    : null;
  const realIp = req.headers.get('x-real-ip')?.trim() || null;
  const ip = forwardedForClientIp || (realIp && isIP(realIp) !== 0 ? realIp : null);

  // Skip rate limiting when the client IP cannot be determined or is not a
  // valid IP address, to avoid unbounded key cardinality from malformed headers
  // and to avoid throttling all traffic into a shared bucket.
  if (!ip) return null;

  const client = await getRedisClient();
  if (!client) return null;

  try {
    const key = `rl:movie-recommendation:${ip}`;

    // Atomically increment the counter and, on the very first request in the
    // window, set the 60-second TTL — all inside Redis via a Lua script.
    // This prevents the key from being left without a TTL if the separate
    // EXPIRE call were to fail after a successful INCR.
    const count = Number(
      await client.eval(
        `
          local current = redis.call('INCR', KEYS[1])
          if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
          end
          return current
        `,
        {
          keys: [key],
          arguments: ['60'],
        },
      ),
    );

    if (count > 10) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Maximum 10 requests per minute allowed.',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
        },
      );
    }

    return null;
  } catch (error) {
    logger.error({ err: error }, 'Rate limit check failed');
    return null;
  }
}

export async function closeRateLimiter(): Promise<void> {
  const client = redisClient;

  try {
    if (client) {
      await client.quit();
    }
  } finally {
    redisClient = null;
    initPromise = null;
  }
}
