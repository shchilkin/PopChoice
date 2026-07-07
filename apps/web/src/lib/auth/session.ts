import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import logger from '@/lib/logger';

import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'pc_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  sub: string;
  exp: number;
};

const fallbackSessionSecret = randomBytes(32).toString('hex');
let hasLoggedMissingSessionSecretWarning = false;
let hasLoggedMissingSessionSecretError = false;

export function createSessionToken(userId: string): string | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  if (!isValidSignature(encodedPayload, signature, secret)) {
    return null;
  }

  try {
    return parseValidSessionPayload(encodedPayload);
  } catch {
    return null;
  }
}

function isValidSignature(encodedPayload: string, signature: string, secret: string): boolean {
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(signValue(encodedPayload, secret));

  return (
    signatureBuffer.length === expectedSignatureBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  );
}

function parseValidSessionPayload(encodedPayload: string): SessionPayload | null {
  const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as
    | SessionPayload
    | undefined;

  return isValidSessionPayload(parsed) ? parsed : null;
}

function isValidSessionPayload(payload: SessionPayload | undefined): payload is SessionPayload {
  return Boolean(payload?.sub && typeof payload.exp === 'number' && !isExpired(payload.exp));
}

function isExpired(exp: number): boolean {
  return exp <= Math.floor(Date.now() / 1000);
}

export function getSessionFromRequest(req: Pick<NextRequest, 'cookies'>): SessionPayload | null {
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return null;
  }

  return verifySessionToken(sessionToken);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

function signValue(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function getSessionSecret(): string | null {
  const configuredSecret =
    process.env.AUTH_SESSION_SECRET?.trim() || process.env.API_KEY_HMAC_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    if (!hasLoggedMissingSessionSecretError) {
      logger.error(
        'AUTH_SESSION_SECRET or API_KEY_HMAC_SECRET must be set in production to issue login sessions.',
      );
      hasLoggedMissingSessionSecretError = true;
    }
    return null;
  }

  if (!hasLoggedMissingSessionSecretWarning) {
    logger.warn(
      'AUTH_SESSION_SECRET is not set — using an ephemeral development secret for login sessions.',
    );
    hasLoggedMissingSessionSecretWarning = true;
  }

  return fallbackSessionSecret;
}
