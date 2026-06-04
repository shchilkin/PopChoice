import { NextRequest, NextResponse } from 'next/server';

import { getDbClient } from '@/clients/dbClient';
import { verifyPassword } from '@/lib/auth/password';
import { readEmailPasswordAuthRequest } from '@/lib/auth/request';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import logger from '@/lib/logger';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  const request = await readEmailPasswordAuthRequest(req, {
    csrfFailureLogMessage: 'Login attempt rejected: CSRF check failed',
  });
  if (request.response) return request.response;

  const { normalizedEmail, password } = request.data;

  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot log in user.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const result = await db
    .from('users')
    .select('id, password_hash')
    .eq('email', normalizedEmail)
    .limit(1);

  if (result.error) {
    logger.error({ error: result.error.message }, 'Failed to look up user for login');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const user = (result.data?.[0] as { id: unknown; password_hash: string } | undefined) ?? null;

  // Use a constant-time comparison even for "user not found" to prevent
  // user enumeration via timing differences.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const sessionToken = createSessionToken(String(user.id));
  if (!sessionToken) {
    logger.error({ userId: user.id }, 'Session secret is not configured — cannot log in user.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  setSessionCookie(response, sessionToken);

  logger.info({ userId: user.id }, 'User logged in');
  return response;
}
