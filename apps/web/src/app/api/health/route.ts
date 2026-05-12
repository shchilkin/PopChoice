import { NextResponse } from 'next/server';
import pg from 'pg';
import { createClient } from 'redis';

import logger from '@/lib/logger';

const { Pool } = pg;
const CHECK_TIMEOUT_MS = 2_000;

type CheckStatus = 'ok' | 'error';

type HealthResponse = {
  status: CheckStatus;
  checks: {
    postgres: CheckStatus;
    redis: CheckStatus;
  };
  timestamp: string;
};

async function checkPostgres(): Promise<CheckStatus> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return 'error';

  const pool = new Pool({
    connectionString,
    allowExitOnIdle: true,
    connectionTimeoutMillis: CHECK_TIMEOUT_MS,
    max: 1,
  });

  try {
    await pool.query('SELECT 1');
    return 'ok';
  } catch (error) {
    logger.warn({ err: error }, 'Health check failed: PostgreSQL unavailable');
    return 'error';
  } finally {
    await pool.end().catch((error: unknown) => {
      logger.warn({ err: error }, 'Health check failed to close PostgreSQL pool');
    });
  }
}

async function checkRedis(): Promise<CheckStatus> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return 'error';

  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: CHECK_TIMEOUT_MS,
      reconnectStrategy: false,
    },
  });

  try {
    await client.connect();
    await client.ping();
    return 'ok';
  } catch (error) {
    logger.warn({ err: error }, 'Health check failed: Redis unavailable');
    return 'error';
  } finally {
    if (client.isOpen) {
      await client.quit().catch((error: unknown) => {
        logger.warn({ err: error }, 'Health check failed to close Redis client');
      });
    } else {
      client.destroy();
    }
  }
}

export async function GET(): Promise<Response> {
  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const status: CheckStatus = postgres === 'ok' && redis === 'ok' ? 'ok' : 'error';
  const body: HealthResponse = {
    status,
    checks: {
      postgres,
      redis,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
