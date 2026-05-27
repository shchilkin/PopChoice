import type { NextRequest } from 'next/server';

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function lastHeaderValue(value: string | null): string | null {
  const last = value
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);

  return last || null;
}

function firstHeaderValue(value: string | null): string | null {
  const first = value
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(0);

  return first || null;
}

function expectedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();
  const requestOrigin = normalizedOrigin(request.url);
  if (requestOrigin) origins.add(requestOrigin);

  const forwardedHost = lastHeaderValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost ?? request.headers.get('host');
  if (!host) return origins;

  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  const requestProtocol = normalizedOrigin(request.url)
    ? new URL(request.url).protocol.replace(/:$/, '')
    : 'http';
  const protocol = forwardedProto || requestProtocol;
  const forwardedOrigin = normalizedOrigin(`${protocol}://${host}`);
  if (forwardedOrigin) origins.add(forwardedOrigin);

  return origins;
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const origins = expectedOrigins(request);
  const origin = request.headers.get('origin');
  if (origin) {
    const normalized = normalizedOrigin(origin);
    return normalized !== null && origins.has(normalized);
  }

  const referer = request.headers.get('referer');
  if (!referer) return false;

  const normalizedReferer = normalizedOrigin(referer);
  return normalizedReferer !== null && origins.has(normalizedReferer);
}
