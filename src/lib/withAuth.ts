import { NextRequest, NextResponse } from 'next/server';

import { validateApiKey } from '@/lib/apiAuth';

type RouteHandler = (req: NextRequest, clientId: string) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps a Next.js API route handler with API key authentication.
 *
 * The wrapped handler receives the validated `clientId` as its second argument so it can
 * be forwarded to rate limiting or audit logging.
 *
 * Responses:
 *   - `401 Unauthorized` — no API key supplied or key is missing/malformed.
 *   - `403 Forbidden`    — key is valid but the client has exceeded its rate limit.
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
    const clientId = validateApiKey(req);

    if (clientId === null) {
      return NextResponse.json(
        { error: 'Unauthorized: a valid API key is required.' },
        { status: 401 },
      );
    }

    return handler(req, clientId);
  };
}
