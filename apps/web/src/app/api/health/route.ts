import { NextResponse } from 'next/server';
import pg from 'pg';
import { createClient } from 'redis';

import { getBuildInfo } from '@/lib/buildInfo';
import logger from '@/lib/logger';

const { Pool } = pg;
const CHECK_TIMEOUT_MS = 2_000;
const HEALTH_CACHE_TTL_MS = 5_000;

type CheckStatus = 'ok' | 'error';

type HealthResponse = {
  status: CheckStatus;
  checks: {
    postgres: CheckStatus;
    redis: CheckStatus;
  };
  build: {
    version: string;
    channel: string;
    commit: string | null;
  };
  timestamp: string;
};

type CachedHealthResponse = {
  body: HealthResponse;
  expiresAt: number;
  status: 200 | 503;
};

type HealthErrorMetadata = {
  name: string;
  code?: string;
  causeCode?: string;
};

let cachedHealthResponse: CachedHealthResponse | null = null;

function healthErrorMetadata(error: unknown): HealthErrorMetadata {
  if (!(error instanceof Error)) {
    return { name: typeof error };
  }

  const errorWithMetadata = error as Error & {
    code?: unknown;
    cause?: { code?: unknown };
  };
  const metadata: HealthErrorMetadata = { name: error.name };

  if (typeof errorWithMetadata.code === 'string') {
    metadata.code = errorWithMetadata.code;
  }

  if (typeof errorWithMetadata.cause?.code === 'string') {
    metadata.causeCode = errorWithMetadata.cause.code;
  }

  return metadata;
}

function logHealthCheckWarning(message: string, error: unknown): void {
  logger.warn({ error: healthErrorMetadata(error) }, message);
}

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
    logHealthCheckWarning('Health check failed: PostgreSQL unavailable', error);
    return 'error';
  } finally {
    await pool.end().catch((error: unknown) => {
      logHealthCheckWarning('Health check failed to close PostgreSQL pool', error);
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
    logHealthCheckWarning('Health check failed: Redis unavailable', error);
    return 'error';
  } finally {
    if (client.isOpen) {
      await client.quit().catch((error: unknown) => {
        logHealthCheckWarning('Health check failed to close Redis client', error);
      });
    } else {
      client.destroy();
    }
  }
}

async function getHealthResponse(): Promise<CachedHealthResponse> {
  const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);
  const status: CheckStatus = postgres === 'ok' && redis === 'ok' ? 'ok' : 'error';
  const buildInfo = getBuildInfo();
  const body: HealthResponse = {
    status,
    checks: {
      postgres,
      redis,
    },
    build: {
      version: buildInfo.version,
      channel: buildInfo.channel,
      commit: buildInfo.commitShortSha,
    },
    timestamp: new Date().toISOString(),
  };

  return {
    body,
    expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
    status: status === 'ok' ? 200 : 503,
  };
}

export function resetHealthCheckCacheForTests(): void {
  cachedHealthResponse = null;
}

export async function GET(): Promise<Response> {
  const now = Date.now();
  if (!cachedHealthResponse || cachedHealthResponse.expiresAt <= now) {
    cachedHealthResponse = await getHealthResponse();
  }

  return NextResponse.json(cachedHealthResponse.body, {
    status: cachedHealthResponse.status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
