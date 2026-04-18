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

  it('allows same-origin requests with matching CSRF header/cookie when API key is missing', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(
      new NextRequest('http://localhost/api/movies', {
        headers: {
          Origin: 'http://localhost',
          'X-CSRF-Token': 'csrf-token',
          Cookie: '__csrf=csrf-token',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('rejects cross-origin CSRF fallback when API key is missing', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(
      new NextRequest('http://localhost/api/movies', {
        headers: {
          Origin: 'http://example.com',
          'X-CSRF-Token': 'csrf-token',
          Cookie: '__csrf=csrf-token',
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows CSRF fallback when Origin is absent but fetch headers indicate same-origin', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);

    const response = await wrapped(
      new NextRequest('http://localhost/api/movies', {
        headers: {
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'X-CSRF-Token': 'csrf-token',
          Cookie: '__csrf=csrf-token',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
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
