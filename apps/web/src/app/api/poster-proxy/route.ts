import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST = 'image.tmdb.org';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const res = await fetch(url, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) return new NextResponse('Upstream error', { status: res.status });

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
