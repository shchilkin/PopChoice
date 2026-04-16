import { NextRequest, NextResponse } from 'next/server';

import { validateApiKey } from '@/lib/apiAuth';
import { verifyCsrfToken } from '@/lib/csrf';
import logger from '@/lib/logger';

type RouteHandler = (req: NextRequest, clientId: string) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps a Next.js API route handler with authentication.
 *
 * Two authentication methods are supported (checked in order):
 *
 * 1. **CSRF token** — for same-origin frontend requests. The middleware in
 *    `src/middleware.ts` issues a `__csrf` cookie on page loads; client code
 *    reads the cookie and echoes it in the `X-CSRF-Token` request header.
 * 2. **API key** — for external consumers. The key is sent via `Authorization:
 *    Bearer <key>` or `X-API-Key: <key>` and validated against HMAC-hashed
 *    values in the `VALID_API_KEYS` environment variable.
 *
 * The wrapped handler receives a `clientId` string identifying the caller.
 *
 * Responses:
 *   - `401 Unauthorized` — neither a valid CSRF token nor API key was supplied.
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
  return async function authMiddleware(req: NextRequest): Promise<NextResponse> {
    // 1. Try CSRF token (same-origin frontend).
    const csrfHeader = req.headers.get('x-csrf-token');
    if (csrfHeader && verifyCsrfToken(csrfHeader)) {
      logger.debug('Auth succeeded via CSRF token');
      return handler(req, 'csrf-verified');
    }

    // 2. Fall back to API key (external consumers).
    const clientId = validateApiKey(req);
    if (clientId !== null) {
      return handler(req, clientId);
    }

    return NextResponse.json(
      { error: 'Unauthorized: a valid CSRF token or API key is required.' },
      { status: 401 },
    );
  };
}
