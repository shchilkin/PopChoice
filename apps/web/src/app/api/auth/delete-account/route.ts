import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { verifyPassword } from '@/lib/auth/password';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const deleteAccountSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

// Auth endpoints are expensive (scrypt) — use a tighter limit than the default.
const AUTH_RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req, AUTH_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = deleteAccountSchema.safeParse(body);
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
    logger.error('Database not configured — cannot delete account.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  // Look up user by email to retrieve their password hash.
  const selectResult = await db
    .from<{ id: number; password_hash: string }>('users')
    .select('id, password_hash')
    .eq('email', normalizedEmail);

  if (selectResult.error) {
    logger.error({ error: selectResult.error.message }, 'Failed to query user for deletion');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const user = selectResult.data?.[0];

  // Always run the password verification to avoid a timing-based user-enumeration
  // attack: if no user is found we verify against a dummy hash that will always fail.
  const DUMMY_HASH = 'deadbeef:deadbeef';
  const storedHash = user?.password_hash ?? DUMMY_HASH;
  const passwordValid = await verifyPassword(password, storedHash);

  if (!user || !passwordValid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  // Delete the user record.
  const deleteResult = await db.from('users').delete().eq('id', user.id);

  if (deleteResult.error) {
    logger.error({ error: deleteResult.error.message }, 'Failed to delete user account');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  logger.info({ userId: user.id }, 'User account deleted');
  return NextResponse.json({ ok: true }, { status: 200 });
}
