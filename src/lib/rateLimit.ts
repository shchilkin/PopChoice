import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let initialized = false;

async function initializeRedisClient(): Promise<RedisClient | null> {
  if (initialized) return redisClient;
  initialized = true;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('REDIS_URL not set. Rate limiting disabled.');
      return null;
    }

    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();

    console.log('Rate limiter initialized with Redis');
    return redisClient;
  } catch (error) {
    console.error('Failed to initialize rate limiter:', error);
    return null;
  }
}

export async function applyRateLimit(req: Request): Promise<Response | null> {
  const client = await initializeRedisClient();
  if (!client) return null;

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
    req.headers.get('x-real-ip') ||
    'unknown';

  try {
    const key = `rl:movie-recommendation:${ip}`;

    // Use a pipeline (MULTI/EXEC) to atomically increment and set expiry
    const results = await client.multi().incr(key).expire(key, 60).exec();
    const count = results[0] as number;

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
    redisClient = null;
    initialized = false;
  }
}
