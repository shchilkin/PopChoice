import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE = '__csrf';

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Next.js middleware that issues a CSRF cookie on every non-API request.
 *
 * The cookie is `SameSite=Lax`, `Secure` in production, and readable by
 * client-side JavaScript so the frontend can echo it back in the
 * `X-CSRF-Token` header on API calls.
 *
 * API route protection is handled by the `withAuth` wrapper in
 * `src/lib/withAuth.ts`, which prefers API key authentication and supports a
 * same-origin CSRF fallback for browser requests.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only issue the cookie on non-API navigation requests that don't already
  // carry a valid CSRF cookie — avoids re-generating on every static asset.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  if (existing) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false, // client JS must be able to read the token
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours (matches token TTL)
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images so middleware
     * runs on page navigations but not on every asset request.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
