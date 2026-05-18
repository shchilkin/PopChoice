import { createHmac, randomBytes } from 'node:crypto';

import logger from '@/lib/logger';

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';
const PASSWORD_RESET_SUBJECT = 'Reset your PopChoice password';

export function createPasswordResetToken(): string {
  return randomBytes(32).toString('base64url');
}

function getPasswordResetTokenHashSecret(): string {
  const secret = process.env.API_KEY_HMAC_SECRET?.trim() || process.env.AUTH_SESSION_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Password reset token hashing secret is not configured.');
  }

  return 'popchoice-dev-password-reset-token-secret';
}

export function hashPasswordResetToken(token: string): string {
  return createHmac('sha256', getPasswordResetTokenHashSecret()).update(token).digest('hex');
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

function buildPasswordResetEmail(resetUrl: string): { html: string; text: string } {
  const text = [
    'Reset your PopChoice password',
    '',
    'Use the link below to choose a new password. This link expires in 30 minutes.',
    '',
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #18181b; line-height: 1.5;">
      <h1 style="font-size: 24px; margin: 0 0 16px;">Reset your PopChoice password</h1>
      <p>Use the link below to choose a new password. This link expires in 30 minutes.</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #facc15; color: #111827; text-decoration: none; font-weight: 700;">
          Reset password
        </a>
      </p>
      <p style="color: #71717a;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  return { html, text };
}

async function readResendError(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return undefined;
  }
}

function redactResetUrl(resetUrl: string): string {
  try {
    const url = new URL(resetUrl);
    if (url.searchParams.has('token')) {
      url.searchParams.set('token', '[redacted]');
    }
    return url.toString();
  } catch {
    return '[redacted]';
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  if (shouldExposePasswordResetUrl()) {
    logger.info({ email, resetUrl: redactResetUrl(resetUrl) }, 'Password reset link generated');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  if (!apiKey || !from) {
    logger.warn(
      { email, missingApiKey: !apiKey, missingFrom: !from },
      'Password reset requested, but Resend email delivery is not configured.',
    );
    return;
  }

  const emailBody = buildPasswordResetEmail(resetUrl);
  const payload: Record<string, unknown> = {
    from,
    to: email,
    subject: PASSWORD_RESET_SUBJECT,
    html: emailBody.html,
    text: emailBody.text,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  try {
    const response = await fetch(RESEND_EMAILS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error(
        { email, status: response.status, response: await readResendError(response) },
        'Failed to send password reset email through Resend.',
      );
      return;
    }

    logger.info({ email }, 'Password reset email sent.');
  } catch (err) {
    logger.error({ err, email }, 'Failed to send password reset email through Resend.');
  }
}
