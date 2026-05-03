import { NextRequest, NextResponse } from 'next/server';

import { RegisterUserError, registerSchema, registerUser } from '@/features/auth/register';
import { applyRateLimit } from '@/lib/rateLimit';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

// Auth endpoints are expensive (scrypt) — use a tighter limit than the default.
const AUTH_RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };

export async function POST(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req, AUTH_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  try {
    await registerUser(parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RegisterUserError) {
      return NextResponse.json(error.payload, { status: error.status });
    }
    throw error;
  }
}
