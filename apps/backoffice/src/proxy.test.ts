import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { proxy } from './proxy';

type ProxyRequest = Parameters<typeof proxy>[0];

const ORIGINAL_ENV = {
  OPERATOR_AUTH_PASSWORD: process.env.OPERATOR_AUTH_PASSWORD,
  OPERATOR_AUTH_RATE_LIMIT_MAX: process.env.OPERATOR_AUTH_RATE_LIMIT_MAX,
  OPERATOR_AUTH_REALM: process.env.OPERATOR_AUTH_REALM,
  OPERATOR_AUTH_REQUIRED: process.env.OPERATOR_AUTH_REQUIRED,
  OPERATOR_AUTH_USERNAME: process.env.OPERATOR_AUTH_USERNAME,
};

function restoreEnv(): void {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function request(path: string): ProxyRequest {
  return {
    headers: new Headers({ 'x-real-ip': `198.51.100.${path.length}` }),
    nextUrl: new URL(`https://backoffice.test${path}`),
    url: `https://backoffice.test${path}`,
  } as ProxyRequest;
}

describe('backoffice proxy auth coverage', () => {
  beforeEach(() => {
    process.env.OPERATOR_AUTH_USERNAME = 'operator';
    process.env.OPERATOR_AUTH_PASSWORD = 'secret';
    process.env.OPERATOR_AUTH_REALM = 'PopChoice Operators';
    process.env.OPERATOR_AUTH_REQUIRED = 'true';
    process.env.OPERATOR_AUTH_RATE_LIMIT_MAX = '1000';
  });

  afterEach(() => {
    restoreEnv();
  });

  it.each([
    '/catalog-health/actions',
    '/repair-batches/batch-1/actions',
    '/tmdb-reviews/review-1/actions',
  ])('requires operator auth for mutation URL %s', (path) => {
    const response = proxy(request(path));

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('PopChoice Operators');
  });

  it('lets the automation catalog seed API handle its own bearer token auth', () => {
    const response = proxy(request('/api/operator/catalog-seed'));

    expect(response.status).toBe(200);
    expect(response.headers.get('www-authenticate')).toBeNull();
  });
});
