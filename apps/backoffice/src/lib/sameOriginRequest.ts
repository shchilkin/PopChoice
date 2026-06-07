import type { NextRequest } from 'next/server';

import { expectedSameOrigins, hasMatchingOriginEvidence } from './sameOriginRequestOrigins';

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizedSafeOrigin(value: string): string | null {
  const origin = normalizedOrigin(value);
  if (!origin) return null;

  const { host } = new URL(origin);
  return isBindableHost(host) ? null : origin;
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

export function isSameOriginRequest(request: NextRequest): boolean {
  return hasMatchingOriginEvidence(request.headers, expectedSameOrigins(request));
}

function requestProtocol(request: NextRequest): string {
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  if (forwardedProto) return forwardedProto;

  const origin = normalizedOrigin(request.url);
  return origin ? new URL(request.url).protocol.replace(/:$/, '') : 'http';
}

function isBindableHost(host: string): boolean {
  const hostname = host
    .split(':')[0]
    ?.replace(/^\[|\]$/g, '')
    .toLowerCase();
  return hostname === '0.0.0.0' || hostname === '::' || hostname === '';
}

export function backofficeRedirectUrl(
  request: NextRequest,
  path: string,
  { trustRequestEvidence = false }: { trustRequestEvidence?: boolean } = {},
): URL {
  const forwardedHost = lastHeaderValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost ?? request.headers.get('host');
  if (host && !isBindableHost(host)) {
    return new URL(path, `${requestProtocol(request)}://${host}`);
  }

  if (trustRequestEvidence) {
    const origin = request.headers.get('origin');
    const normalizedRequestOrigin = origin ? normalizedSafeOrigin(origin) : null;
    if (normalizedRequestOrigin) return new URL(path, normalizedRequestOrigin);

    const referer = request.headers.get('referer');
    const normalizedReferer = referer ? normalizedSafeOrigin(referer) : null;
    if (normalizedReferer) return new URL(path, normalizedReferer);
  }

  const requestUrl = new URL(request.url);
  if (!isBindableHost(requestUrl.host)) {
    return new URL(path, requestUrl);
  }

  return new URL(path, 'http://localhost');
}
