import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import {
  buildPasswordResetUrl,
  createAccountRecoveryToken,
  createAccountRecoveryTokenDigest,
  getPasswordResetExpiry,
  sendPasswordResetEmail,
  shouldExposePasswordResetUrl,
} from '@/lib/auth/passwordReset';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { isSameOriginBrowserRequest } from '@/lib/withAuth';

const forgotPasswordSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().email().max(254),
  ),
});

const AUTH_RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };
const CSRF_COOKIE = '__csrf';

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req, AUTH_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  const csrfHeader = req.headers.get('x-csrf-token');
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie || !isSameOriginBrowserRequest(req)) {
    logger.warn('Password reset request rejected: CSRF check failed');
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot create password reset token.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const userResult = await db
    .from<{ id: number }>('users')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (userResult.error) {
    logger.error({ error: userResult.error.message }, 'Failed to look up user for password reset');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const user = userResult.data?.[0] ?? null;
  let resetUrl: string | undefined;

  if (user) {
    const token = createAccountRecoveryToken();
    const tokenHash = createAccountRecoveryTokenDigest(token);
    resetUrl = buildPasswordResetUrl(req, token);

    const insertResult = await db.from('password_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: getPasswordResetExpiry(),
    });

    if (insertResult.error) {
      logger.error(
        { error: insertResult.error.message, userId: user.id },
        'Failed to store password reset token',
      );
      return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
    }

    await sendPasswordResetEmail(normalizedEmail, resetUrl);
  }

  const payload: { ok: true; resetUrl?: string } = { ok: true };
  if (resetUrl && shouldExposePasswordResetUrl()) {
    payload.resetUrl = resetUrl;
  }

  return NextResponse.json(payload, { status: 202 });
}
