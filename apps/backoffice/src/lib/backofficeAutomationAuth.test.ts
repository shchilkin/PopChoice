import { describe, expect, it } from 'vitest';

import { verifyBackofficeAutomationBearer } from './backofficeAutomationAuth';

function headers(token?: string): Headers {
  return new Headers(token ? { authorization: `Bearer ${token}` } : undefined);
}

function env(values: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: 'test', ...values };
}

describe('verifyBackofficeAutomationBearer', () => {
  it('fails closed when the automation token is not configured', () => {
    expect(verifyBackofficeAutomationBearer({ env: env(), headers: headers('secret') })).toEqual({
      message: 'BACKOFFICE_AUTOMATION_TOKEN is not configured for backoffice.',
      ok: false,
      statusCode: 503,
    });
  });

  it('rejects missing and invalid bearer tokens', () => {
    const processEnv = env({ BACKOFFICE_AUTOMATION_TOKEN: 'secret' });
    const missingTokenResult = verifyBackofficeAutomationBearer({
      env: processEnv,
      headers: headers(),
    });

    expect(missingTokenResult.ok).toBe(false);
    if (!missingTokenResult.ok) {
      expect(missingTokenResult.statusCode).toBe(401);
    }
    expect(
      verifyBackofficeAutomationBearer({ env: processEnv, headers: headers('wrong') }),
    ).toEqual({
      message: 'Invalid automation bearer token.',
      ok: false,
      statusCode: 401,
    });
  });

  it('accepts the configured bearer token', () => {
    expect(
      verifyBackofficeAutomationBearer({
        env: env({ BACKOFFICE_AUTOMATION_TOKEN: 'secret' }),
        headers: headers('secret'),
      }),
    ).toEqual({ ok: true });
  });
});
