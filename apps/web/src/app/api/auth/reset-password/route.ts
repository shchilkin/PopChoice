import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { hashPassword } from '@/lib/auth/password';
import { createAccountRecoveryTokenDigest } from '@/lib/auth/passwordReset';
import { readAuthJsonRequest } from '@/lib/auth/request';
import logger from '@/lib/logger';

const resetPasswordSchema = z.object({
  token: z.string().min(20).max(512),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest): Promise<Response> {
  const request = await readAuthJsonRequest(req, resetPasswordSchema, {
    csrfFailureLogMessage: 'Password reset confirmation rejected: CSRF check failed',
  });
  if (request.response) return request.response;

  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot reset password.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const newPasswordHash = await hashPassword(request.data.password);
  const tokenHash = createAccountRecoveryTokenDigest(request.data.token);

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
