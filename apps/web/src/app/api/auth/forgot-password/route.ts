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
import { readAuthJsonRequest } from '@/lib/auth/request';
import logger from '@/lib/logger';

const forgotPasswordSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().email().max(254),
  ),
});

export async function POST(req: NextRequest): Promise<Response> {
  const request = await readAuthJsonRequest(req, forgotPasswordSchema, {
    csrfFailureLogMessage: 'Password reset request rejected: CSRF check failed',
  });
  if (request.response) return request.response;

  const normalizedEmail = request.data.email.toLowerCase().trim();
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
