import { NextRequest, NextResponse } from 'next/server';

import { proxyPosterImage } from '@/integrations/tmdb';
import { applyRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const result = await proxyPosterImage(req.nextUrl.searchParams.get('url'));
  if (!result.ok) {
    return new NextResponse(result.message, { status: result.status });
  }

  return new NextResponse(result.body, {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
