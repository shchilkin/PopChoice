import { createHash, randomBytes } from 'node:crypto';

import logger from '@/lib/logger';

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export function createPasswordResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getPasswordResetExpiry(now = new Date()): string {
  return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS).toISOString();
}

export function buildPasswordResetUrl(req: Request, token: string): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const baseUrl =
    configuredBaseUrl && /^https?:\/\//.test(configuredBaseUrl)
      ? configuredBaseUrl
      : new URL(req.url).origin;

  const url = new URL('/reset-password', baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

export function shouldExposePasswordResetUrl(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (shouldExposePasswordResetUrl()) {
    logger.info({ email, resetUrl }, 'Password reset link generated');
    return;
  }

  logger.warn(
    { email },
    'Password reset requested, but email delivery is not configured for production.',
  );
}
