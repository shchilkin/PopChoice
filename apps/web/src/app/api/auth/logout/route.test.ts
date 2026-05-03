import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hashApiKey } from '@/lib/apiAuth';
import { SESSION_COOKIE } from '@/lib/auth/session';

import { POST } from './route';

const ORIGINAL_ENV = { ...process.env };

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.stubEnv('NODE_ENV', 'test');
    process.env.API_KEY_HMAC_SECRET = 'test-secret';
    process.env.VALID_API_KEYS = hashApiKey('valid-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...ORIGINAL_ENV };
  });

  it('clears the session cookie for same-origin browser requests', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost',
          'X-CSRF-Token': 'csrf-token',
          Cookie: '__csrf=csrf-token',
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=`);
  });
});
