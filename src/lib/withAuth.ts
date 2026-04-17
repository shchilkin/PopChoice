import { NextRequest, NextResponse } from 'next/server';

import { validateApiKey } from '@/lib/apiAuth';
import logger from '@/lib/logger';

type RouteHandler = (req: NextRequest, clientId: string) => Promise<Response> | Response;
const CSRF_COOKIE = '__csrf';

/**
 * Higher-order function that wraps a Next.js API route handler with authentication.
 *
 * API key authentication is required for all protected routes:
 *
 * - **API key** — sent via `Authorization: Bearer <key>` or `X-API-Key: <key>`
 *   and validated against HMAC-hashed values in the `VALID_API_KEYS`
 *   environment variable.
 * - **CSRF token** (optional, additional safeguard) — when a CSRF cookie/header
 *   pair is present, both must match exactly.
 *
 * The wrapped handler receives a `clientId` string identifying the caller.
 *
 * Responses:
 *   - `401 Unauthorized` — missing/invalid API key or invalid CSRF pair.
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
    // 1. Require API key auth for all callers.
    const clientId = validateApiKey(req);
    if (clientId === null) {
      return NextResponse.json(
        { error: 'Unauthorized: a valid API key is required.' },
        { status: 401 },
      );
    }

    // 2. Optional CSRF verification (defense in depth for browser requests).
    const csrfHeader = req.headers.get('x-csrf-token');
    const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
    if (csrfHeader || csrfCookie) {
      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        logger.warn('Auth failed: CSRF header/cookie mismatch');
        return NextResponse.json({ error: 'Unauthorized: invalid CSRF token.' }, { status: 401 });
      }
      logger.debug('CSRF check passed for API-key-authenticated request');
    }

    return handler(req, clientId);
  };
}
