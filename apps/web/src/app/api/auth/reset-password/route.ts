import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { hashPassword } from '@/lib/auth/password';
import { createAccountRecoveryTokenDigest } from '@/lib/auth/passwordReset';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { isSameOriginBrowserRequest } from '@/lib/withAuth';

const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  password: z.string().min(8).max(128),
});

const AUTH_RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };
const CSRF_COOKIE = '__csrf';

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req, AUTH_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  const csrfHeader = req.headers.get('x-csrf-token');
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie || !isSameOriginBrowserRequest(req)) {
    logger.warn('Password reset confirmation rejected: CSRF check failed');
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot reset password.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const newPasswordHash = await hashPassword(parsed.data.password);
  const tokenHash = createAccountRecoveryTokenDigest(parsed.data.token);

  const result = await db.rpc('consume_password_reset_token', {
    p_token_hash: tokenHash,
    p_new_password_hash: newPasswordHash,
  });

  if (result.error) {
    logger.error({ error: result.error.message }, 'Failed to consume password reset token');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  if (!result.data?.[0]) {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });
  }

  logger.info('Password reset completed');
  return NextResponse.json({ ok: true }, { status: 200 });
}
