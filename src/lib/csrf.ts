import { createHmac, randomBytes } from 'node:crypto';

/** Tokens are valid for 24 hours. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Server-side secret used to sign CSRF tokens. In production this should be a
 * stable value set via the `CSRF_SECRET` environment variable. In development a
 * random secret is generated per process restart (tokens won't survive restarts
 * but that's acceptable for local work).
 */
const secret: string = process.env.CSRF_SECRET || randomBytes(32).toString('hex');

function sign(payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Generate a signed CSRF token.
 *
 * Format: `<timestamp>.<nonce>.<signature>`
 *
 * The signature covers the timestamp and nonce so the token cannot be forged
 * without the server-side secret.
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString(36);
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

/**
 * Verify a CSRF token.
 *
 * Returns `true` when the token has a valid signature and has not expired.
 */
export function verifyCsrfToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [timestamp, nonce, sig] = parts;
  const payload = `${timestamp}.${nonce}`;

  // Verify signature.
  const expected = sign(payload);
  if (sig.length !== expected.length) return false;

  // Constant-time comparison via manual byte check (avoid importing
  // timingSafeEqual just for this — the tokens aren't cryptographic secrets).
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  // Check expiry.
  const issuedAt = parseInt(timestamp, 36);
  if (Number.isNaN(issuedAt)) return false;
  return Date.now() - issuedAt < TOKEN_TTL_MS;
}
