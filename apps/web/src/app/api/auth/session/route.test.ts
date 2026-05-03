import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSessionToken, SESSION_COOKIE } from '@/lib/auth/session';

import { GET } from './route';

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    vi.stubEnv('API_KEY_HMAC_SECRET', 'test-session-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns anonymous when no session cookie is present', async () => {
    const response = await GET(new NextRequest('http://localhost/api/auth/session'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });

  it('returns the authenticated user when the session cookie is valid', async () => {
    const sessionToken = createSessionToken('42');
    expect(sessionToken).toBeTruthy();

    const response = await GET(
      new NextRequest('http://localhost/api/auth/session', {
        headers: {
          Cookie: `${SESSION_COOKIE}=${sessionToken}`,
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true, userId: '42' });
  });

  it('clears the cookie when the session token is invalid', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/auth/session', {
        headers: {
          Cookie: `${SESSION_COOKIE}=invalid-token`,
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=`);
  });
});
