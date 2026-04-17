import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hashApiKey } from '@/lib/apiAuth';
import { withAuth } from '@/lib/withAuth';

const ORIGINAL_ENV = { ...process.env };

describe('withAuth', () => {
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

  it('returns 401 when API key is missing', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(new NextRequest('http://localhost/api/movies'));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows request when API key is valid', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(
      new NextRequest('http://localhost/api/movies', {
        headers: { 'X-API-Key': 'valid-key' },
      }),
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('returns 401 when CSRF header/cookie pair is present but mismatched', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(
      new NextRequest('http://localhost/api/movies', {
        headers: {
          'X-API-Key': 'valid-key',
          'X-CSRF-Token': 'header-token',
          Cookie: '__csrf=cookie-token',
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
