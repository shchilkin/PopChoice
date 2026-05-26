import { timingSafeEqual } from 'node:crypto';

export type OperatorAuthConfig = {
  username: string;
  password: string;
  realm: string;
};

const DEFAULT_REALM = 'PopChoice Operators';

type OperatorAuthEnv = Record<string, string | undefined>;

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Expected boolean environment value, received "${value}".`);
}

function timingSafeStringEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function escapeBasicAuthRealm(realm: string): string {
  return realm.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export function readOperatorAuthConfig(
  env: OperatorAuthEnv = process.env,
): OperatorAuthConfig | null {
  const username = env.OPERATOR_AUTH_USERNAME?.trim() ?? '';
  const password = env.OPERATOR_AUTH_PASSWORD ?? '';
  const realm = env.OPERATOR_AUTH_REALM?.trim() || DEFAULT_REALM;
  const required = parseBooleanEnv(env.OPERATOR_AUTH_REQUIRED, false);

  if (!username && !password) {
    if (required) {
      throw new Error(
        'OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD must be set when operator auth is required.',
      );
    }

    return null;
  }

  if (!username || !password) {
    throw new Error(
      'Set both OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD, or set neither locally.',
    );
  }

  return { username, password, realm };
}

export function verifyOperatorBasicAuthHeader(
  authorizationHeader: string | string[] | undefined,
  config: OperatorAuthConfig,
): boolean {
  if (Array.isArray(authorizationHeader) || !authorizationHeader?.startsWith('Basic ')) {
    return false;
  }

  const encodedCredentials = authorizationHeader.slice('Basic '.length).trim();

  if (!encodedCredentials) {
    return false;
  }

  let decodedCredentials: string;

  try {
    decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decodedCredentials.indexOf(':');

  if (separatorIndex === -1) {
    return false;
  }

  const username = decodedCredentials.slice(0, separatorIndex);
  const password = decodedCredentials.slice(separatorIndex + 1);

  return (
    timingSafeStringEqual(username, config.username) &&
    timingSafeStringEqual(password, config.password)
  );
}

export function operatorAuthChallenge(realm: string): string {
  return `Basic realm="${escapeBasicAuthRealm(realm)}", charset="UTF-8"`;
}
