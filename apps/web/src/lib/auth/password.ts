/**
 * Password hashing and verification utilities.
 *
 * Uses Node.js built-in `crypto.scrypt` with a per-user random salt.
 * The stored format is `salt:hash` (both hex-encoded).
 *
 * scrypt parameters follow OWASP recommendations for interactive logins:
 *   N = 32768 (2^15), r = 8, p = 1
 *
 * Import from this module rather than from route files to avoid
 * bundling issues and circular dependencies.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_OPTIONS = { N: 32_768, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;

/**
 * Hashes a plaintext password with a fresh random salt.
 * Returns a `salt:hash` string safe to store in the database.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await new Promise<string>((resolve, reject) => {
    scrypt(plaintext, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString('hex'));
    });
  });
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored `salt:hash` value.
 * Uses `timingSafeEqual` to prevent timing attacks.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const separatorIndex = stored.indexOf(':');
  if (separatorIndex === -1) return false;
  const salt = stored.slice(0, separatorIndex);
  const storedHash = stored.slice(separatorIndex + 1);
  const candidateHash = await new Promise<string>((resolve, reject) => {
    scrypt(plaintext, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString('hex'));
    });
  });
  const storedBuf = Buffer.from(storedHash, 'hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  if (storedBuf.length !== candidateBuf.length) return false;
  return timingSafeEqual(storedBuf, candidateBuf);
}
