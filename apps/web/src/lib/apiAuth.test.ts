import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hashApiKey, validateApiKey } from '@/lib/apiAuth';

const ORIGINAL_ENV = { ...process.env };

describe('validateApiKey', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...ORIGINAL_ENV };
  });

  it('falls back to X-API-Key when Authorization header is malformed', async () => {
    process.env.API_KEY_HMAC_SECRET = 'test-secret';
    process.env.VALID_API_KEYS = hashApiKey('valid-key');

    const req = new Request('http://localhost/api/test', {
      headers: {
        Authorization: 'Token malformed',
        'X-API-Key': 'valid-key',
      },
    });

    await expect(validateApiKey(req)).resolves.toBeTruthy();
  });

  it('rejects requests when VALID_API_KEYS is set but API_KEY_HMAC_SECRET is missing', async () => {
    delete process.env.API_KEY_HMAC_SECRET;
    process.env.VALID_API_KEYS = 'abc123';

    const req = new Request('http://localhost/api/test', {
      headers: { 'X-API-Key': 'any-key' },
    });

    await expect(validateApiKey(req)).resolves.toBeNull();
  });
});
