import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/auth/passwordReset', () => ({
  buildPasswordResetUrl: vi.fn(() => 'http://localhost/reset-password?token=reset-token'),
  createPasswordResetToken: vi.fn(() => 'reset-token'),
  getPasswordResetExpiry: vi.fn(() => '2030-01-01T00:00:00.000Z'),
  hashPasswordResetToken: vi.fn((token: string) => `hash:${token}`),
  sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
  shouldExposePasswordResetUrl: vi.fn(() => true),
}));

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(),
}));

import { getDbClient } from '@/clients/dbClient';
import {
  hashPasswordResetToken,
  sendPasswordResetEmail,
  shouldExposePasswordResetUrl,
} from '@/lib/auth/passwordReset';
import { applyRateLimit } from '@/lib/rateLimit';

import { POST } from './route';

import type { DbClient } from '@/clients/dbClient';

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
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

function makeMockDb(
  options: { user?: { id: number } | null; insertError?: boolean } = {},
): DbClient {
  const user = options.user === undefined ? { id: 1 } : options.user;
  const insertMock = vi.fn().mockResolvedValue({
    data: [],
    error: options.insertError ? { message: 'insert failed' } : null,
  });
  const limitMock = vi.fn().mockResolvedValue({
    data: user ? [user] : [],
    error: null,
  });
  const eqMock = vi.fn(() => ({ limit: limitMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn((table: string) => {
    if (table === 'users') {
      return { select: selectMock, insert: vi.fn(), delete: vi.fn() };
    }
    if (table === 'password_reset_tokens') {
      return { select: vi.fn(), insert: insertMock, delete: vi.fn() };
    }
    return { select: vi.fn(), insert: vi.fn(), delete: vi.fn() };
  });

  return {
    isConfigured: vi.fn(() => true),
    from: fromMock,
    rpc: vi.fn(),
  } as unknown as DbClient;
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb());
    vi.mocked(shouldExposePasswordResetUrl).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a reset token and returns a generic success response', async () => {
    const db = makeMockDb();
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest({ email: 'Alice@Example.com ' }));

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({
      ok: true,
      resetUrl: 'http://localhost/reset-password?token=reset-token',
    });
    expect(hashPasswordResetToken).toHaveBeenCalledWith('reset-token');
    expect(db.from).toHaveBeenCalledWith('password_reset_tokens');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      'alice@example.com',
      'http://localhost/reset-password?token=reset-token',
    );
  });

  it('does not reveal whether the email exists', async () => {
    const db = makeMockDb({ user: null });
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest({ email: 'missing@example.com' }));

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('does not expose the reset URL in production responses', async () => {
    vi.mocked(shouldExposePasswordResetUrl).mockReturnValue(false);

    const res = await POST(makeRequest({ email: 'alice@example.com' }));

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 403 when CSRF header is missing', async () => {
    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify({ email: 'alice@example.com' }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(422);
  });

  it('returns 503 when database is not configured', async () => {
    vi.mocked(getDbClient).mockReturnValue({
      isConfigured: vi.fn(() => false),
      from: vi.fn(),
      rpc: vi.fn(),
    });

    const res = await POST(makeRequest({ email: 'alice@example.com' }));
    expect(res.status).toBe(503);
  });

  it('returns 503 when token storage fails', async () => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb({ insertError: true }));

    const res = await POST(makeRequest({ email: 'alice@example.com' }));

    expect(res.status).toBe(503);
  });

  it('returns 429 when rate limit is triggered', async () => {
    vi.mocked(applyRateLimit).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests.' }), { status: 429 }),
    );

    const res = await POST(makeRequest({ email: 'alice@example.com' }));
    expect(res.status).toBe(429);
  });
});
