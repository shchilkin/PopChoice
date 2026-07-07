import { timingSafeEqual } from 'crypto';

export type BackofficeAutomationAuthResult =
  | { ok: true }
  | { message: string; ok: false; statusCode: 401 | 503 };

function timingSafeTokenEquals(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}

export function verifyBackofficeAutomationBearer({
  env = process.env,
  headers,
}: {
  env?: NodeJS.ProcessEnv;
  headers: Headers;
}): BackofficeAutomationAuthResult {
  const expectedToken = env.BACKOFFICE_AUTOMATION_TOKEN?.trim();
  if (!expectedToken) {
    return {
      message: 'BACKOFFICE_AUTOMATION_TOKEN is not configured for backoffice.',
      ok: false,
      statusCode: 503,
    };
  }

  const authorization = headers.get('authorization') ?? '';
  const [scheme, ...tokenParts] = authorization.split(/\s+/);
  const candidateToken = tokenParts.join(' ').trim();

  if (scheme !== 'Bearer' || !candidateToken) {
    return { message: 'Missing automation bearer token.', ok: false, statusCode: 401 };
  }

  if (!timingSafeTokenEquals(candidateToken, expectedToken)) {
    return { message: 'Invalid automation bearer token.', ok: false, statusCode: 401 };
  }

  return { ok: true };
}
