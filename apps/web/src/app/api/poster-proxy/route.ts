import { NextRequest, NextResponse } from 'next/server';

import { applyRateLimit } from '@/lib/rateLimit';

const ALLOWED_HOST = 'image.tmdb.org';
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

  const res = await fetch(url, {
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
