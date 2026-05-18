import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(() => Promise.resolve('new-password-hash')),
}));

vi.mock('@/lib/auth/passwordReset', () => ({
  hashPasswordResetToken: vi.fn((token: string) => `hash:${token}`),
}));

vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(),
}));

import { getDbClient } from '@/clients/dbClient';
import { hashPassword } from '@/lib/auth/password';
import { hashPasswordResetToken } from '@/lib/auth/passwordReset';
import { applyRateLimit } from '@/lib/rateLimit';

import { POST } from './route';

import type { DbClient } from '@/clients/dbClient';

const validBody = { token: 'reset-token-with-enough-length', password: 'new-password' };

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
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

function makeMockDb(result: { data?: unknown[] | null; error?: { message: string } | null } = {}) {
  return {
    isConfigured: vi.fn(() => true),
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue({
      data: result.data === undefined ? [{ user_id: 1 }] : result.data,
      error: result.error ?? null,
    }),
  } as unknown as DbClient;
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb());
    vi.mocked(hashPassword).mockResolvedValue('new-password-hash');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('consumes a valid reset token and updates the password', async () => {
    const db = makeMockDb();
    vi.mocked(getDbClient).mockReturnValue(db);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(hashPassword).toHaveBeenCalledWith('new-password');
    expect(hashPasswordResetToken).toHaveBeenCalledWith('reset-token-with-enough-length');
    expect(db.rpc).toHaveBeenCalledWith('consume_password_reset_token', {
      p_token_hash: 'hash:reset-token-with-enough-length',
      p_new_password_hash: 'new-password-hash',
    });
  });

  it('returns 400 when token is invalid or expired', async () => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb({ data: [] }));

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_or_expired_token' });
  });

  it('returns 403 when CSRF header is missing', async () => {
    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it('returns 422 when password is too short', async () => {
    const res = await POST(
      makeRequest({ token: 'reset-token-with-enough-length', password: 'short' }),
    );

    expect(res.status).toBe(422);
  });

  it('returns 422 when token is missing', async () => {
    const res = await POST(makeRequest({ password: 'new-password' }));
    expect(res.status).toBe(422);
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

  it('returns 503 when token consume RPC fails', async () => {
    vi.mocked(getDbClient).mockReturnValue(makeMockDb({ error: { message: 'rpc failed' } }));

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
