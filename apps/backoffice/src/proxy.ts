import { NextResponse, type NextRequest } from 'next/server';

type OperatorAuthConfig = {
  username: string;
  password: string;
  realm: string;
};

const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL_MS = 60_000;
const DEFAULT_MAX_ATTEMPT_KEYS = 1_000;
let cleanupTimerStarted = false;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readOperatorAuthConfig(): OperatorAuthConfig | null {
  const username = process.env.OPERATOR_AUTH_USERNAME?.trim() ?? '';
  const password = process.env.OPERATOR_AUTH_PASSWORD ?? '';
  const realm = process.env.OPERATOR_AUTH_REALM?.trim() || 'PopChoice Operators';
  const required = parseBoolean(process.env.OPERATOR_AUTH_REQUIRED, false);

  if (!username && !password) {
    if (required) {
      throw new Error(
        'OPERATOR_AUTH_REQUIRED is enabled, but OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD are missing.',
      );
    }

    return null;
  }

  if (!username || !password) {
    throw new Error('Both OPERATOR_AUTH_USERNAME and OPERATOR_AUTH_PASSWORD must be configured.');
  }

  return { username, password, realm };
}

function pruneExpiredAttempts(now = Date.now()): void {
  for (const [key, state] of failedAttempts.entries()) {
    if (state.resetAt <= now) {
      failedAttempts.delete(key);
    }
  }
}

function enforceAttemptKeyLimit(): void {
  const maxKeys = parsePositiveInteger(
    process.env.OPERATOR_AUTH_RATE_LIMIT_MAX_KEYS,
    DEFAULT_MAX_ATTEMPT_KEYS,
  );

  while (failedAttempts.size > maxKeys) {
    const oldestKey = failedAttempts.keys().next().value as string | undefined;
    if (!oldestKey) return;
    failedAttempts.delete(oldestKey);
  }
}

function startCleanupTimer(): void {
  if (cleanupTimerStarted || typeof globalThis.setInterval !== 'function') return;

  cleanupTimerStarted = true;
  globalThis.setInterval(() => {
    pruneExpiredAttempts();
  }, CLEANUP_INTERVAL_MS);
}

startCleanupTimer();

function escapeBasicAuthRealm(realm: string): string {
  return realm.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function challenge(config: OperatorAuthConfig): string {
  return `Basic realm="${escapeBasicAuthRealm(config.realm)}", charset="UTF-8"`;
}

function decodeBasicAuth(header: string | null): { username: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null;

  try {
    const decoded = atob(header.slice('Basic '.length).trim());
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex < 0) return null;

    return {
      password: decoded.slice(separatorIndex + 1),
      username: decoded.slice(0, separatorIndex),
    };
  } catch {
    return null;
  }
}

function requestKey(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwardedFor = request.headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return forwardedFor?.at(-1) ?? 'unknown';
}

function isRateLimited(key: string): boolean {
  const windowSeconds = parsePositiveInteger(
    process.env.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
    15 * 60,
  );
  const max = parsePositiveInteger(process.env.OPERATOR_AUTH_RATE_LIMIT_MAX, 30);
  const now = Date.now();
  pruneExpiredAttempts(now);
  const state = failedAttempts.get(key);

  if (!state || state.resetAt <= now) {
    failedAttempts.set(key, { count: 0, resetAt: now + windowSeconds * 1000 });
    enforceAttemptKeyLimit();
    return false;
  }

  return state.count >= max;
}

function recordFailure(key: string): void {
  const windowSeconds = parsePositiveInteger(
    process.env.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
    15 * 60,
  );
  const now = Date.now();
  pruneExpiredAttempts(now);
  const state = failedAttempts.get(key);

  if (!state || state.resetAt <= now) {
    failedAttempts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    enforceAttemptKeyLimit();
    return;
  }

  state.count += 1;
}

export function proxy(request: NextRequest) {
  const config = readOperatorAuthConfig();
  if (!config) return NextResponse.next();

  const key = requestKey(request);
  if (isRateLimited(key)) {
    return new Response('Too many backoffice requests, please try again later.', {
      status: 429,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const credentials = decodeBasicAuth(request.headers.get('authorization'));
  if (credentials?.username === config.username && credentials.password === config.password) {
    failedAttempts.delete(key);
    return NextResponse.next();
  }

  recordFailure(key);
  return new Response('Operator authentication required.', {
    status: 401,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'www-authenticate': challenge(config),
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|popcorn.svg|healthz).*)'],
};
