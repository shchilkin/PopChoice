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
import { SESSION_COOKIE } from '@/lib/auth/session';
import { applyRateLimit } from '@/lib/rateLimit';

import { POST } from './route';

import type { DbClient } from '@/clients/dbClient';

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

function makeMockDb(overrides: Record<string, unknown> = {}): DbClient {
  const deleteChain = {
    eq: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
    neq: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
  };

  const selectChain = {
    eq: vi.fn().mockReturnValue(
      Promise.resolve({
        data: [{ id: 1, password_hash: 'salt:hash' }],
        error: null,
      }),
    ),
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn(() => selectChain),
        delete: vi.fn(() => deleteChain),
      };
    }
    return {};
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
  return new NextRequest('http://localhost/api/auth/delete-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost',
      'X-CSRF-Token': 'csrf-token',
      Cookie: '__csrf=csrf-token',
    },
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'alice@example.com', password: 'password123' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/delete-account', () => {
  beforeEach(() => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb());
    vi.mocked(verifyPassword).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 on successful account deletion', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(res.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=`);
  });

  it('returns 403 when CSRF header is missing', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
          Cookie: '__csrf=csrf-token',
        },
        body: JSON.stringify(validBody),
      }),
    );
    expect(res.status).toBe(403);
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
    const req = new NextRequest('http://localhost/api/auth/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost',
        'X-CSRF-Token': 'csrf-token',
        Cookie: '__csrf=csrf-token',
      },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not found', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const db = makeMockDb({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
        })),
      })),
    });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'invalid_credentials' });
  });

  it('returns 401 when password is incorrect', async () => {
    vi.mocked(verifyPassword).mockResolvedValue(false);

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

  it('returns 503 when SELECT query fails', async () => {
    const db = makeMockDb({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi
            .fn()
            .mockReturnValue(
              Promise.resolve({ data: null, error: { message: 'connection error' } }),
            ),
        })),
      })),
    });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
  });

  it('returns 503 when DELETE query fails', async () => {
    const db = makeMockDb({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi
            .fn()
            .mockReturnValue(
              Promise.resolve({ data: [{ id: 1, password_hash: 'salt:hash' }], error: null }),
            ),
        })),
        delete: vi.fn(() => ({
          eq: vi
            .fn()
            .mockReturnValue(Promise.resolve({ data: null, error: { message: 'delete failed' } })),
        })),
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

  it('normalizes email to lowercase before lookup', async () => {
    const db = makeMockDb();
    vi.mocked(getDbClient).mockReturnValue(db);

    await POST(makeRequest({ email: 'ALICE@EXAMPLE.COM', password: 'password123' }));

    const fromCall = vi.mocked(db.from).mock.results[0].value as {
      select: ReturnType<typeof vi.fn>;
    };
    const selectCall = fromCall.select.mock.results[0].value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(selectCall.eq).toHaveBeenCalledWith('email', 'alice@example.com');
  });
});
