import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock rate limit — pass-through by default, overridden in rate-limit test.
vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

// Mock password helpers to avoid expensive scrypt in unit tests.
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(() => Promise.resolve('salt:hash')),
}));

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(),
}));

import { getDbClient } from '@/clients/dbClient';
import { applyRateLimit } from '@/lib/rateLimit';

import { POST } from './route';

import type { DbClient } from '@/clients/dbClient';

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

function makeMockDb(overrides: Record<string, unknown> = {}): DbClient {
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
  };

  const insertChain = {
    select: vi.fn().mockReturnValue(Promise.resolve({ data: [{ id: 1 }], error: null })),
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn(() => selectChain),
        insert: vi.fn(() => insertChain),
      };
    }
    return { select: vi.fn(), insert: vi.fn() };
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
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'alice@example.com', password: 'password123' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 on successful registration', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
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

  it('returns 422 when email exceeds 254 characters', async () => {
    // 249 'a' chars + '@b.com' = 255 chars total, which exceeds the 254-char max
    const longEmail = `${'a'.repeat(249)}@b.com`;
    const res = await POST(makeRequest({ email: longEmail, password: 'password123' }));
    expect(res.status).toBe(422);
  });

  it('returns 422 when password is too short', async () => {
    const res = await POST(makeRequest({ email: 'alice@example.com', password: 'short' }));
    expect(res.status).toBe(422);
  });

  it('returns 422 when password exceeds 128 characters', async () => {
    const longPassword = 'a'.repeat(129);
    const res = await POST(makeRequest({ email: 'alice@example.com', password: longPassword }));
    expect(res.status).toBe(422);
  });

  it('returns 400 when request body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already taken (pre-check)', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(Promise.resolve({ data: [{ id: 99 }], error: null })),
    };
    const db = makeMockDb({
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
        insert: vi.fn(),
      })),
    });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data).toEqual({ error: 'email_taken' });
  });

  it('returns 409 when insert fails with unique-constraint violation (race condition)', async () => {
    const insertChain = {
      select: vi.fn().mockReturnValue(
        Promise.resolve({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' },
        }),
      ),
    };
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
    };
    const db = makeMockDb({
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
        insert: vi.fn(() => insertChain),
      })),
    });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data).toEqual({ error: 'email_taken' });
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

  it('returns 503 when the pre-check query fails', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockReturnValue(Promise.resolve({ data: null, error: { message: 'connection refused' } })),
    };
    const db = makeMockDb({
      from: vi.fn(() => ({
        select: vi.fn(() => selectChain),
        insert: vi.fn(),
      })),
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
