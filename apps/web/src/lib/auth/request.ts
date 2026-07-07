import { NextRequest, NextResponse } from 'next/server';
import z, { type ZodType } from 'zod';

import { hasValidSameOriginCsrfPair } from '@/lib/auth/csrf';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

// Auth endpoints are expensive (scrypt) — use a tighter limit than the default.
const AUTH_RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };

type AuthJsonRequestResult<T> =
  | { data: T; response?: never }
  | { data?: never; response: Response };
type AuthJsonRequestOptions = {
  csrfFailureLogMessage?: string;
  requireCsrf?: boolean;
};

const emailPasswordAuthSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

type EmailPasswordAuthData = z.infer<typeof emailPasswordAuthSchema> & {
  normalizedEmail: string;
};

export async function readAuthJsonRequest<T>(
  req: NextRequest,
  schema: ZodType<T>,
  { csrfFailureLogMessage, requireCsrf = true }: AuthJsonRequestOptions = {},
): Promise<AuthJsonRequestResult<T>> {
  const rateLimitResponse = await applyRateLimit(req, AUTH_RATE_LIMIT);
  if (rateLimitResponse) return { response: rateLimitResponse };

  if (requireCsrf && !hasValidSameOriginCsrfPair(req)) {
    if (csrfFailureLogMessage) {
      logger.warn(csrfFailureLogMessage);
    }
    return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      ),
    };
  }

  return { data: parsed.data };
}

export function readEmailPasswordAuthRequest(
  req: NextRequest,
  options: AuthJsonRequestOptions = {},
): Promise<AuthJsonRequestResult<EmailPasswordAuthData>> {
  return readAuthJsonRequest(req, emailPasswordAuthSchema, options).then((result) => {
    if (result.response) return result;
    return {
      data: {
        ...result.data,
        normalizedEmail: result.data.email.toLowerCase().trim(),
      },
    };
  });
}
