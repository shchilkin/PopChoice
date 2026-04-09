import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
// Stores the in-flight init attempt so concurrent calls share one connection attempt.
// Reset to null on failure so the next request can retry.
let initPromise: Promise<RedisClient | null> | null = null;

function doInitialize(): Promise<RedisClient | null> {
  return (async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('REDIS_URL not set. Rate limiting disabled.');
      return null;
    }

    try {
      const client = createClient({ url: redisUrl });
      await client.connect();
      redisClient = client;
      console.log('Rate limiter initialized with Redis');
      return client;
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
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
  const client = await getRedisClient();
  if (!client) return null;

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
    req.headers.get('x-real-ip')?.trim() ||
    null;

  // Skip rate limiting when the client IP cannot be determined to avoid
  // accidentally throttling all traffic into a shared 'unknown' bucket.
  if (!ip) return null;

  try {
    const key = `rl:movie-recommendation:${ip}`;

    // Use an atomic INCR then conditionally EXPIRE to implement a fixed window.
    // INCR is atomic in Redis so exactly one request will ever see count === 1.
    const count = await client.incr(key);

    // Set the 60-second window only on the very first request; subsequent
    // requests in the same window leave the existing TTL untouched so the
    // window stays fixed rather than rolling on every call.
    if (count === 1) {
      await client.expire(key, 60);
    }

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
    console.error('Rate limit check failed:', error);
    return null;
  }
}

export async function closeRateLimiter(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
  redisClient = null;
  initPromise = null;
}
