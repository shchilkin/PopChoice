import { describe, expect, it } from 'vitest';

import {
  operatorAuthChallenge,
  readOperatorAuthConfig,
  verifyOperatorBasicAuthHeader,
} from '../../../../packages/shared/src/operatorAuth.js';

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

describe('operator auth helpers', () => {
  it('allows disabled operator auth outside production', () => {
    expect(readOperatorAuthConfig({ NODE_ENV: 'development' })).toBeNull();
  });

  it('requires credentials when operator auth is explicitly required', () => {
    expect(() => readOperatorAuthConfig({ OPERATOR_AUTH_REQUIRED: '1' })).toThrow(
      /OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD/,
    );
  });

  it('requires username and password to be configured together', () => {
    expect(() => readOperatorAuthConfig({ OPERATOR_AUTH_USERNAME: 'admin' })).toThrow(/Set both/);
  });

  it('accepts matching Basic credentials', () => {
    const config = readOperatorAuthConfig({
      OPERATOR_AUTH_USERNAME: 'admin',
      OPERATOR_AUTH_PASSWORD: 'secret',
    });

    expect(config).not.toBeNull();
    expect(verifyOperatorBasicAuthHeader(basicAuth('admin', 'secret'), config!)).toBe(true);
  });

  it('rejects missing, malformed, or wrong credentials', () => {
    const config = { username: 'admin', password: 'secret', realm: 'PopChoice' };

    expect(verifyOperatorBasicAuthHeader(undefined, config)).toBe(false);
    expect(verifyOperatorBasicAuthHeader('Bearer token', config)).toBe(false);
    expect(verifyOperatorBasicAuthHeader('Basic not-base64', config)).toBe(false);
    expect(verifyOperatorBasicAuthHeader(basicAuth('admin', 'wrong'), config)).toBe(false);
  });

  it('escapes the Basic Auth realm', () => {
    expect(operatorAuthChallenge('Ops "secure" \\ prod')).toBe(
      'Basic realm="Ops \\"secure\\" \\\\ prod", charset="UTF-8"',
    );
  });
});
