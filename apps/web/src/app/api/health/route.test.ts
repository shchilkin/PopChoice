import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPgQuery = vi.fn();
const mockPgEnd = vi.fn();
const mockPgPool = vi.fn(function MockPool() {
  return {
    query: mockPgQuery,
    end: mockPgEnd,
  };
});

const mockRedisConnect = vi.fn();
const mockRedisPing = vi.fn();
const mockRedisQuit = vi.fn();
const mockRedisDestroy = vi.fn();
const mockRedisClient = {
  connect: mockRedisConnect,
  ping: mockRedisPing,
  quit: mockRedisQuit,
  destroy: mockRedisDestroy,
  isOpen: true,
};
const mockCreateClient = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mock('pg', () => ({
  default: { Pool: mockPgPool },
  Pool: mockPgPool,
}));

vi.mock('redis', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/logger', () => ({
  default: {
    warn: (...args: Parameters<typeof mockLoggerWarn>) => mockLoggerWarn(...args),
  },
}));

const { GET } = await import('./route');

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@db:5432/popchoice');
    vi.stubEnv('REDIS_URL', 'redis://redis:6379');

    mockPgQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    mockPgEnd.mockResolvedValue(undefined);
    mockRedisConnect.mockResolvedValue(undefined);
    mockRedisPing.mockResolvedValue('PONG');
    mockRedisQuit.mockResolvedValue('OK');
    mockRedisDestroy.mockReturnValue(undefined);
    mockRedisClient.isOpen = true;
    mockCreateClient.mockReturnValue(mockRedisClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns 200 when PostgreSQL and Redis are reachable', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toMatchObject({
      status: 'ok',
      checks: {
        postgres: 'ok',
        redis: 'ok',
      },
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(mockPgQuery).toHaveBeenCalledWith('SELECT 1');
    expect(mockRedisPing).toHaveBeenCalled();
  });

  it('returns 503 when PostgreSQL is unavailable', async () => {
    mockPgQuery.mockRejectedValueOnce(new Error('postgres password is super-secret'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'error',
      checks: {
        postgres: 'error',
        redis: 'ok',
      },
    });
  });

  it('returns 503 when Redis is unavailable', async () => {
    mockRedisPing.mockRejectedValueOnce(new Error('redis://secret@redis:6379 failed'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 'error',
      checks: {
        postgres: 'ok',
        redis: 'error',
      },
    });
  });

  it('does not expose raw dependency errors in the response', async () => {
    mockPgQuery.mockRejectedValueOnce(new Error('postgres://user:secret@db:5432/popchoice'));
    mockRedisPing.mockRejectedValueOnce(new Error('redis://secret@redis:6379'));

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('postgres://');
    expect(serialized).not.toContain('redis://');
  });
});
