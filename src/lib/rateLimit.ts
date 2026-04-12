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

const RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

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

    // Atomically increment the counter and apply a TTL when the key has no
    // expiry — all inside Redis via a Lua script. Running both operations
    // in a single script prevents the key from ever being left without a TTL
    // (e.g. if a separate EXPIRE call were to fail after a successful INCR,
    // or if a prior EXPIRE was never applied). TTL < 0 means the key exists
    // but has no expiry (-1) or does not exist yet (-2 after INCR is impossible,
    // but guard anyway). The script returns {count, remaining_ttl} so
    // Retry-After reflects the actual remaining window rather than always
    // the full window.
    const [count, ttl] = (await client.eval(
      `
        local current = redis.call('INCR', KEYS[1])
        local remaining = redis.call('TTL', KEYS[1])
        if remaining < 0 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
          remaining = tonumber(ARGV[1])
        end
        return {current, remaining}
      `,
      {
        keys: [key],
        arguments: [String(RATE_LIMIT_WINDOW_SECONDS)],
      },
    )) as [number, number];

    if (count > RATE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: `Too many requests. Maximum ${RATE_LIMIT} requests per ${RATE_LIMIT_WINDOW_SECONDS} seconds allowed.`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(ttl),
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
          },
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
