import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

import logger from '@/lib/logger';
import { getClientIp } from '@/lib/requestIp';

/**
 * Validates an API key extracted from a request's Authorization or X-API-Key header.
 *
 * Supported header formats:
 *   - `Authorization: Bearer <key>`
 *   - `X-API-Key: <key>`
 *
 * Keys are stored as scrypt digests in the `VALID_API_KEYS` environment variable
 * (comma-separated). The derivation secret is read from `API_KEY_HMAC_SECRET` and
 * must be configured whenever `VALID_API_KEYS` is set.
 * In development, when `VALID_API_KEYS` is not set, all requests are allowed through
 * and a warning is logged.
 *
 * @returns A client identifier string on success, or `null` on failure.
 */
let hasLoggedMissingKeysWarning = false;
let hasLoggedMissingKeysError = false;
let hasLoggedMissingSecretError = false;
let cachedValidKeys: { rawKeys: string; hashBuffers: Buffer[] } | null = null;

export async function validateApiKey(req: Request): Promise<string | null> {
  const rawKeys = process.env.VALID_API_KEYS;
  const configuredKeys = rawKeys?.trim() ? rawKeys : null;

  if (!configuredKeys) return resolveMissingApiKeysClientId();

  const validHashBuffers = getValidHashBuffers(configuredKeys);
  const derivationSecret = getConfiguredDerivationSecret();

  if (!derivationSecret) {
    logMissingDerivationSecret();
    return null;
  }

  const candidateKey = extractCandidateApiKey(req.headers);
  if (!candidateKey) {
    logger.warn({ ip: getRequestIp(req) }, 'API auth failed: no key provided');
    return null;
  }

  // Derive a digest with scrypt + a server-side secret, then compare with
  // timingSafeEqual to reduce both brute-force and timing attack risk.
  const candidateHash = await hashApiKeyWithSecretAsync(candidateKey, derivationSecret);
  const candidateHashBuf = Buffer.from(candidateHash, 'hex');

  if (!hasMatchingApiKeyHash(validHashBuffers, candidateHashBuf)) {
    // Log the first 8 characters of the hash (not the key itself) for audit trail.
    logger.warn(
      { keyPrefix: candidateHash.substring(0, 8), ip: getRequestIp(req) },
      'API auth failed: invalid key',
    );
    return null;
  }

  // Use the first 12 characters of the hash as a stable, non-sensitive client identifier.
  const clientId = `client:${candidateHash.substring(0, 12)}`;
  logger.debug({ clientId }, 'API auth succeeded');
  return clientId;
}

function resolveMissingApiKeysClientId(): string | null {
  if (process.env.NODE_ENV !== 'production') {
    logMissingKeysWarning();
    return 'dev-unauthenticated';
  }

  logMissingKeysProductionError();
  return null;
}

function logMissingKeysWarning() {
  if (hasLoggedMissingKeysWarning) return;
  logger.warn(
    'VALID_API_KEYS is not set — API authentication is disabled. Set this variable in production.',
  );
  hasLoggedMissingKeysWarning = true;
}

function logMissingKeysProductionError() {
  if (hasLoggedMissingKeysError) return;
  logger.error(
    'VALID_API_KEYS is not configured in production — all API requests will be rejected.',
  );
  hasLoggedMissingKeysError = true;
}

function logMissingDerivationSecret() {
  if (hasLoggedMissingSecretError) return;
  logger.error(
    'API_KEY_HMAC_SECRET must be set when VALID_API_KEYS is configured — rejecting API requests.',
  );
  hasLoggedMissingSecretError = true;
}

function extractCandidateApiKey(headers: Headers): string | null {
  return extractBearerToken(headers.get('authorization')) ?? extractApiKeyHeader(headers);
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

  return parts[1].trim() || null;
}

function extractApiKeyHeader(headers: Headers): string | null {
  return headers.get('x-api-key')?.trim() || null;
}

function hasMatchingApiKeyHash(storedHashes: Buffer[], candidateHash: Buffer): boolean {
  return storedHashes.some((storedHash) => isSameHash(storedHash, candidateHash));
}

function isSameHash(storedHash: Buffer, candidateHash: Buffer): boolean {
  if (storedHash.length !== candidateHash.length) return false;
  try {
    return timingSafeEqual(storedHash, candidateHash);
  } catch {
    return false;
  }
}

/**
 * Secret used to derive API key digests in utility contexts.
 * When absent, a random secret is used in non-production environments.
 */
const fallbackHmacSecret: string = randomBytes(32).toString('hex');

/**
 * Returns the scrypt hex digest of a plaintext API key.
 * Use this to pre-derive key digests before storing them in `VALID_API_KEYS`.
 *
 * **Important:** set `API_KEY_HMAC_SECRET` to the same value used when the digests
 * in `VALID_API_KEYS` were generated, otherwise validation will fail.
 */
export function hashApiKey(plaintext: string): string {
  const secret = getConfiguredDerivationSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('API_KEY_HMAC_SECRET must be set in production.');
    }
    logger.warn(
      'API_KEY_HMAC_SECRET is not set — using an ephemeral dev secret for hashApiKey output.',
    );
    return hashApiKeyWithSecret(plaintext, fallbackHmacSecret);
  }

  return hashApiKeyWithSecret(plaintext, secret);
}

function hashApiKeyWithSecret(plaintext: string, secret: string): string {
  // scrypt defaults recommended by OWASP for interactive verification workloads.
  // These settings balance security and API latency.
  return scryptSync(plaintext, secret, 32, { N: 16_384, r: 8, p: 1 }).toString('hex');
}

async function hashApiKeyWithSecretAsync(plaintext: string, secret: string): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(plaintext, secret, 32, { N: 16_384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(Buffer.from(derivedKey).toString('hex'));
    });
  });
}

function getValidHashBuffers(rawKeys: string): Buffer[] {
  if (cachedValidKeys?.rawKeys === rawKeys) {
    return cachedValidKeys.hashBuffers;
  }

  const invalidHashes: string[] = [];
  const parsed = rawKeys
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .flatMap((hash) => {
      if (!/^[0-9a-fA-F]+$/.test(hash) || hash.length % 2 !== 0) {
        invalidHashes.push(hash);
        return [];
      }
      try {
        return [Buffer.from(hash, 'hex')];
      } catch {
        invalidHashes.push(hash);
        return [];
      }
    });

  if (invalidHashes.length > 0) {
    logger.warn(
      { invalidHashCount: invalidHashes.length },
      'Some VALID_API_KEYS entries are invalid hex digests and were ignored.',
    );
  }

  cachedValidKeys = { rawKeys, hashBuffers: parsed };
  return parsed;
}

function getConfiguredDerivationSecret(): string | null {
  const configuredSecret = process.env.API_KEY_HMAC_SECRET?.trim();
  return configuredSecret ? configuredSecret : null;
}

/** Best-effort extraction of the client IP for logging purposes. */
function getRequestIp(req: Request): string | null {
  return getClientIp(req);
}
