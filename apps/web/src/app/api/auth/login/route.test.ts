import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock rate limit — pass-through by default, overridden in rate-limit test.
vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

// Mock password helpers to avoid expensive scrypt in unit tests.
vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(),
}));

import { getDbClient } from '@/clients/dbClient';
import { verifyPassword } from '@/lib/auth/password';
import { applyRateLimit } from '@/lib/rateLimit';

import { POST } from './route';

import type { DbClient } from '@/clients/dbClient';

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

function makeMockDb(overrides: Record<string, unknown> = {}): DbClient {
  const filterChain = {
    limit: vi.fn().mockReturnValue(
      Promise.resolve({ data: [{ id: 1, password_hash: 'salt:hash' }], error: null }),
    ),
  };

  const selectChain = {
    eq: vi.fn(() => filterChain),
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn(() => selectChain),
        insert: vi.fn(),
        delete: vi.fn(),
      };
    }
    return { select: vi.fn(), insert: vi.fn(), delete: vi.fn() };
  });

  return {
    isConfigured: vi.fn(() => true),
    from: fromMock,
    rpc: vi.fn(),
    ...overrides,
  } as unknown as DbClient;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'alice@example.com', password: 'password123' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb());
    vi.mocked(verifyPassword).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 on successful login', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it('returns 422 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'password123' }));
    expect(res.status).toBe(422);
  });

  it('returns 422 when email is invalid', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', password: 'password123' }));
    expect(res.status).toBe(422);
  });

  it('returns 422 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'alice@example.com' }));
    expect(res.status).toBe(422);
  });

  it('returns 400 when request body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not found', async () => {
    const filterChain = { limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    const selectChain = { eq: vi.fn(() => filterChain) };
    const db = makeMockDb({
      from: vi.fn(() => ({ select: vi.fn(() => selectChain), insert: vi.fn(), delete: vi.fn() })),
    });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'invalid_credentials' });
  });

  it('returns 401 when password is incorrect', async () => {
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'invalid_credentials' });
  });

  it('returns 503 when database is not configured', async () => {
    vi.mocked(getDbClient).mockReturnValue({
      isConfigured: vi.fn(() => false),
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
  });

  it('returns 503 when database query fails', async () => {
    const filterChain = {
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };
    const selectChain = { eq: vi.fn(() => filterChain) };
    const db = makeMockDb({
      from: vi.fn(() => ({ select: vi.fn(() => selectChain), insert: vi.fn(), delete: vi.fn() })),
    });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
  });

  it('returns 429 when rate limit is triggered', async () => {
    vi.mocked(applyRateLimit).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests.' }), { status: 429 }),
    );

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
  });
});
