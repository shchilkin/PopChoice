import { NextRequest, NextResponse } from 'next/server';

import { getDbClient } from '@/clients/dbClient';
import { verifyPassword } from '@/lib/auth/password';
import { readEmailPasswordAuthRequest } from '@/lib/auth/request';
import { clearSessionCookie } from '@/lib/auth/session';
import logger from '@/lib/logger';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  const request = await readEmailPasswordAuthRequest(req, {
    csrfFailureLogMessage: 'Account deletion rejected: CSRF check failed',
  });
  if (request.response) return request.response;

  const { normalizedEmail, password } = request.data;

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
  // The dummy is formatted identically to real hashes (32-byte hex salt : 32-byte hex hash)
  // so that scrypt runs the same key derivation path and length comparison reaches
  // `timingSafeEqual` rather than short-circuiting early on a length mismatch.
  const DUMMY_HASH =
    '00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000';
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
  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}
