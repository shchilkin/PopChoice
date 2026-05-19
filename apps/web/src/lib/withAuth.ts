import { NextRequest, NextResponse } from 'next/server';

import { validateApiKey } from '@/lib/apiAuth';
import { getSessionFromRequest } from '@/lib/auth/session';
import logger from '@/lib/logger';

type RouteHandler = (req: NextRequest, clientId: string) => Promise<Response> | Response;
const CSRF_COOKIE = '__csrf';

/**
 * Higher-order function that wraps a Next.js API route handler with authentication.
 *
 * Protected routes allow either of these authentication paths:
 *
 * - **API key** — sent via `Authorization: Bearer <key>` or `X-API-Key: <key>`
 *   and validated against scrypt-derived digests in the `VALID_API_KEYS`
 *   environment variable.
 * - **Browser session path** — when no API key is provided, same-origin browser
 *   requests may authenticate with a matching CSRF cookie/header pair and an
 *   optional signed session cookie.
 *
 * The wrapped handler receives a `clientId` string identifying the caller.
 *
 * Responses:
 *   - `401 Unauthorized` — missing/invalid API key and no valid same-origin
 *     CSRF pair, or invalid CSRF pair when provided.
 *   - Delegates to the inner handler on success.
 *
 * @example
 * ```ts
 * export const POST = withAuth(async (req, clientId) => {
 *   // clientId is guaranteed to be a non-null string here
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function withAuth(handler: RouteHandler) {
  return async function authMiddleware(req: NextRequest): Promise<Response> {
    // 1. Validate CSRF pair whenever either CSRF artifact is present.
    const csrfHeader = req.headers.get('x-csrf-token');
    const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
    if (csrfHeader || csrfCookie) {
      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        logger.warn('Auth failed: invalid CSRF header/cookie pair');
        return NextResponse.json({ error: 'Unauthorized: invalid CSRF token.' }, { status: 401 });
      }
    }

    const hasApiKeyCredential = Boolean(
      req.headers.get('authorization') || req.headers.get('x-api-key'),
    );
    const shouldUseDevAuthBypass =
      process.env.NODE_ENV !== 'production' && !process.env.VALID_API_KEYS;

    // 2. Prefer API key auth for external/service callers when a key is actually supplied.
    if (hasApiKeyCredential || shouldUseDevAuthBypass) {
      const clientId = await validateApiKey(req);
      if (clientId !== null) {
        return handler(req, clientId);
      }
    }

    // 3. Same-origin browser fallback with a valid CSRF pair.
    if (csrfHeader && csrfCookie && isSameOriginBrowserRequest(req)) {
      const session = getSessionFromRequest(req);
      if (session) {
        logger.debug({ userId: session.sub }, 'Auth succeeded via browser session');
        return handler(req, `user:${session.sub}`);
      }

      logger.debug('Auth succeeded via same-origin CSRF browser fallback');
      return handler(req, 'browser-csrf');
    }

    if (csrfHeader || csrfCookie) {
      logger.warn('Auth failed: cross-origin CSRF fallback attempt');
      return NextResponse.json({ error: 'Unauthorized: invalid CSRF token.' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Unauthorized: valid API key or same-origin CSRF token is required.' },
      { status: 401 },
    );
  };
}

/**
 * Returns the canonical public origin of the app.
 * Resolution order:
 *  1. `NEXT_PUBLIC_BASE_URL` — explicit override (any platform).
 *  2. `RAILWAY_PUBLIC_DOMAIN` — automatically injected by Railway; avoids
 *     comparing against the internal `.railway.internal` address.
 *  3. `req.nextUrl.origin` — local dev and other platforms.
 */
function getExpectedOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;

  // Use Railway's public domain if available
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }

  return req.nextUrl.origin;
}

export function isSameOriginBrowserRequest(req: NextRequest): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site');
  const secFetchMode = req.headers.get('sec-fetch-mode');
  const originHeader = req.headers.get('origin');
  if (originHeader) {
    if (originHeader !== getExpectedOrigin(req)) {
      return false;
    }
    return secFetchSite === null || secFetchSite === 'same-origin';
  }

  // Some same-origin browser fetches omit Origin, so allow an explicit browser
  // same-origin fetch signal instead.
  return secFetchSite === 'same-origin' && (secFetchMode === null || secFetchMode === 'cors');
}
