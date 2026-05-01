import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import logger from '@/lib/logger';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

/**
 * Hashes a plaintext password using scrypt with a random per-user salt.
 * Returns a `salt:hash` string safe to store in the database.
 */
async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await new Promise<string>((resolve, reject) => {
    scrypt(plaintext, salt, 32, { N: 16_384, r: 8, p: 1 }, (err, derivedKey) => {
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
 * Uses timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const separatorIndex = stored.indexOf(':');
  if (separatorIndex === -1) return false;
  const salt = stored.slice(0, separatorIndex);
  const storedHash = stored.slice(separatorIndex + 1);
  const candidateHash = await new Promise<string>((resolve, reject) => {
    scrypt(plaintext, salt, 32, { N: 16_384, r: 8, p: 1 }, (err, derivedKey) => {
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

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot register user.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  // Check for duplicate email
  const existing = await db.from('users').select('id').eq('email', normalizedEmail);
  if (existing.error) {
    logger.error({ error: existing.error.message }, 'Failed to query users table');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }
  if (existing.data && existing.data.length > 0) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const result = await db
    .from('users')
    .insert({ email: normalizedEmail, password_hash: passwordHash })
    .select('id');

  if (result.error) {
    // Catch unique-constraint violation race condition
    if (result.error.message.includes('unique') || result.error.message.includes('duplicate')) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }
    logger.error({ error: result.error.message }, 'Failed to insert user');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  logger.info({ email: normalizedEmail }, 'New user registered');
  return NextResponse.json({ ok: true }, { status: 201 });
}
