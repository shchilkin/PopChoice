import { NextRequest, NextResponse } from 'next/server';

import { clearSessionCookie, getSessionFromRequest, SESSION_COOKIE } from '@/lib/auth/session';

export async function GET(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (session) {
    return NextResponse.json({ authenticated: true, userId: session.sub }, { status: 200 });
  }

  const response = NextResponse.json({ authenticated: false }, { status: 200 });
  if (req.cookies.get(SESSION_COOKIE)?.value) {
    clearSessionCookie(response);
  }

  return response;
}
