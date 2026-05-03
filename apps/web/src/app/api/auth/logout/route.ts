import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth/session';
import { withAuth } from '@/lib/withAuth';

async function postHandler(): Promise<Response> {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearSessionCookie(response);
  return response;
}

export const POST = withAuth(postHandler);
