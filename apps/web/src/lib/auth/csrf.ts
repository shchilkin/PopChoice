import { isSameOriginBrowserRequest } from '@/lib/withAuth';

import type { NextRequest } from 'next/server';

const CSRF_COOKIE = '__csrf';

export function hasValidSameOriginCsrfPair(req: NextRequest): boolean {
  const csrfHeader = req.headers.get('x-csrf-token');
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
  return Boolean(
    csrfHeader && csrfCookie && csrfHeader === csrfCookie && isSameOriginBrowserRequest(req),
  );
}
