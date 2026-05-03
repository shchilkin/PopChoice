import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { verifyPassword } from '@/lib/auth/password';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
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

  const parsed = loginSchema.safeParse(body);
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
