type SameOriginHeaders = Pick<Headers, 'get'>;

export type SameOriginRequestParts = {
  headers: SameOriginHeaders;
  url: string;
};

function normalizedOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function headerValues(value: string | null): string[] {
  return (
    value
      ?.split(',')
      .map((part) => part.trim())
      .filter(Boolean) ?? []
  );
}

function firstHeaderValue(value: string | null): string | null {
  return headerValues(value).at(0) ?? null;
}

function lastHeaderValue(value: string | null): string | null {
  return headerValues(value).at(-1) ?? null;
}

function protocolFromRequestUrl(url: string): string {
  const origin = normalizedOrigin(url);
  if (!origin) return 'http';

  return new URL(url).protocol.replace(/:$/, '');
}

function requestOrigin(url: string): string | null {
  return normalizedOrigin(url);
}

function forwardedOrigin({ headers, url }: SameOriginRequestParts): string | null {
  const forwardedHost = lastHeaderValue(headers.get('x-forwarded-host'));
  const host = forwardedHost ?? headers.get('host');
  if (!host) return null;

  const forwardedProto = firstHeaderValue(headers.get('x-forwarded-proto'));
  const protocol = forwardedProto || protocolFromRequestUrl(url);

  return normalizedOrigin(`${protocol}://${host}`);
}

export function expectedSameOrigins(request: SameOriginRequestParts): Set<string> {
  const origins = new Set<string>();
  const directOrigin = requestOrigin(request.url);
  if (directOrigin) origins.add(directOrigin);

  const proxyOrigin = forwardedOrigin(request);
  if (proxyOrigin) origins.add(proxyOrigin);

  return origins;
}

function headerOriginMatches(value: string | null, expectedOrigins: Set<string>): boolean {
  if (!value) return false;

  const normalized = normalizedOrigin(value);
  return normalized !== null && expectedOrigins.has(normalized);
}

export function hasMatchingOriginEvidence(
  headers: SameOriginHeaders,
  expectedOrigins: Set<string>,
): boolean {
  const origin = headers.get('origin');
  if (origin) return headerOriginMatches(origin, expectedOrigins);

  return headerOriginMatches(headers.get('referer'), expectedOrigins);
}
