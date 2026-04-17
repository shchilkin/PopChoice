import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import logger from '@/lib/logger';

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
export function validateApiKey(req: Request): string | null {
  const rawKeys = process.env.VALID_API_KEYS;

  // Development mode: auth is disabled when VALID_API_KEYS is not configured.
  if (!rawKeys || rawKeys.trim() === '') {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(
        'VALID_API_KEYS is not set — API authentication is disabled. Set this variable in production.',
      );
      return 'dev-unauthenticated';
    }
    // In production with no keys configured, deny all requests to prevent an
    // accidentally open API from consuming quota.
    logger.error(
      'VALID_API_KEYS is not configured in production — all API requests will be rejected.',
    );
    return null;
  }

  // Parse the set of valid hashed keys once per call (keys rarely change at runtime).
  const validKeyHashes = new Set(
    rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  );

  const derivationSecret = getConfiguredHmacSecret();
  if (!derivationSecret) {
    logger.error(
      'API_KEY_HMAC_SECRET must be set when VALID_API_KEYS is configured — rejecting API requests.',
    );
    return null;
  }

  // Extract the raw key from the request headers.
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');

  let candidateKey: string | null = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      const bearerToken = parts[1].trim();
      if (bearerToken) {
        candidateKey = bearerToken;
      }
    }
  }

  if (!candidateKey && apiKeyHeader) {
    const trimmedApiKeyHeader = apiKeyHeader.trim();
    if (trimmedApiKeyHeader) {
      candidateKey = trimmedApiKeyHeader;
    }
  }

  if (!candidateKey) {
    logger.warn({ ip: getRequestIp(req) }, 'API auth failed: no key provided');
    return null;
  }

  // HMAC-SHA-256 with a server-side secret: API keys are high-entropy random tokens
  // (not passwords), so bcrypt/scrypt are unnecessary. The HMAC secret adds defense-in-depth.
  // timingSafeEqual prevents timing-based key enumeration.
  const candidateHash = hashApiKeyWithSecret(candidateKey, derivationSecret);
  const candidateHashBuf = Buffer.from(candidateHash, 'hex');

  const matched = [...validKeyHashes].some((storedHash) => {
    if (storedHash.length !== candidateHash.length) return false;
    try {
      return timingSafeEqual(Buffer.from(storedHash, 'hex'), candidateHashBuf);
    } catch {
      return false;
    }
  });

  if (!matched) {
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

/**
 * Secret used to derive API key digests in utility contexts.
 * When absent, a random secret is used in non-production environments.
 */
const fallbackHmacSecret: string = randomBytes(32).toString('hex');

/**
 * Returns the scrypt hex digest of a plaintext API key.
 * Use this to pre-derive key digests before storing them in `VALID_API_KEYS`.
 *
 * **Important:** set `API_KEY_HMAC_SECRET` to the same value used when the hashes
 * in `VALID_API_KEYS` were generated, otherwise validation will fail.
 */
export function hashApiKey(plaintext: string): string {
  const secret = getConfiguredHmacSecret();
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
  return scryptSync(plaintext, secret, 32).toString('hex');
}

function getConfiguredHmacSecret(): string | null {
  const configuredSecret = process.env.API_KEY_HMAC_SECRET?.trim();
  return configuredSecret ? configuredSecret : null;
}

/** Best-effort extraction of the client IP for logging purposes. */
function getRequestIp(req: Request): string | null {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? null;
}
