import { NextRequest, NextResponse } from 'next/server';

import { applyRateLimit } from '@/lib/rateLimit';

const ALLOWED_HOST = 'image.tmdb.org';
const ALLOWED_PATHNAME = /^\/(?:t\/p|original)\/[A-Za-z0-9/_\-.~%]+$/;
const ALLOWED_QUERY_KEYS = new Set(['language']);
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export async function GET(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST || parsed.protocol !== 'https:') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const normalizedPathname = decodeURIComponent(parsed.pathname);
  if (
    !ALLOWED_PATHNAME.test(parsed.pathname) ||
    normalizedPathname.includes('..') ||
    normalizedPathname.includes('\\') ||
    normalizedPathname.includes('//')
  ) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const safeSearchParams = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (key === 'language' && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(value)) {
      safeSearchParams.set(key, value);
    }
  }

  // Reconstruct URL from fixed host + sanitized path/query only.
  const safeUrl = new URL(`https://${ALLOWED_HOST}${parsed.pathname}`);
  safeUrl.search = safeSearchParams.toString();

  const res = await fetch(safeUrl, {
    next: { revalidate: 86400 },
    redirect: 'error',
  });

  if (!res.ok) return new NextResponse('Upstream error', { status: res.status });

  const upstreamType = res.headers.get('Content-Type')?.split(';')[0].trim() ?? '';
  const contentType = ALLOWED_CONTENT_TYPES.has(upstreamType) ? upstreamType : 'image/jpeg';

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
