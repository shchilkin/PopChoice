import { NextRequest, NextResponse } from 'next/server';

import { RegisterUserError, registerSchema, registerUser } from '@/features/auth/register';
import { readAuthJsonRequest } from '@/lib/auth/request';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import logger from '@/lib/logger';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  const request = await readAuthJsonRequest(req, registerSchema, { requireCsrf: false });
  if (request.response) return request.response;

  try {
    const userId = await registerUser(request.data);
    const sessionToken = createSessionToken(userId);
    if (!sessionToken) {
      logger.error({ userId }, 'Session secret is not configured — cannot sign in new user.');
      return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
    }

    const response = NextResponse.json({ ok: true }, { status: 201 });
    setSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    if (error instanceof RegisterUserError) {
      return NextResponse.json(error.payload, { status: error.status });
    }
    throw error;
  }
}
