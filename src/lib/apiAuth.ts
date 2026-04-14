import { createHash, timingSafeEqual } from 'node:crypto';

import logger from '@/lib/logger';

/**
 * Validates an API key extracted from a request's Authorization or X-API-Key header.
 *
 * Supported header formats:
 *   - `Authorization: Bearer <key>`
 *   - `X-API-Key: <key>`
 *
 * Keys are stored as SHA-256 hashes in the `VALID_API_KEYS` environment variable
 * (comma-separated). In development, when `VALID_API_KEYS` is not set, all requests
 * are allowed through and a warning is logged.
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

  // Extract the raw key from the request headers.
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');

  let candidateKey: string | null = null;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      candidateKey = parts[1];
    }
  } else if (apiKeyHeader) {
    candidateKey = apiKeyHeader.trim();
  }

  if (!candidateKey) {
    logger.warn({ ip: getRequestIp(req) }, 'API auth failed: no key provided');
    return null;
  }

  // Hash the candidate key and compare against the stored hashes.
  // SHA-256 is appropriate here: API keys are high-entropy random tokens (not passwords),
  // so bcrypt/scrypt are unnecessary. timingSafeEqual prevents timing-based key enumeration.
  // codeql[js/insufficient-password-hash] -- intentional: hashing random API tokens, not passwords
  const candidateHash = hashApiKey(candidateKey);
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
 * Returns the SHA-256 hex digest of a plaintext API key.
 * Use this to pre-hash keys before storing them in `VALID_API_KEYS`.
 */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
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
