import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getDbClient } from '@/clients/dbClient';
import { hashPassword } from '@/lib/auth/password';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

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

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const db = getDbClient();
  if (!db.isConfigured()) {
    logger.error('Database not configured — cannot register user.');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const passwordHash = await hashPassword(password);

  // Let the DB unique index be the authoritative guard — no pre-check SELECT needed.
  const result = await db
    .from('users')
    .insert({ email: normalizedEmail, password_hash: passwordHash })
    .select('id');

  if (result.error) {
    // Catch unique-constraint violation race condition
    if (result.error.message.includes('unique') || result.error.message.includes('duplicate')) {
      return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    }
    logger.error({ error: result.error.message }, 'Failed to insert user');
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 503 });
  }

  const userId = (result.data?.[0] as { id?: unknown })?.id;
  logger.info({ userId }, 'New user registered');
  return NextResponse.json({ ok: true }, { status: 201 });
}
