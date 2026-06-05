const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';
const TMDB_IMAGE_HOST = 'image.tmdb.org';
const ALLOWED_PATHNAME = /^\/(?:t\/p|original)\/[A-Za-z0-9/_\-.~%]+$/;
const ALLOWED_QUERY_KEYS = new Set(['language']);
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export async function getPopularPosterUrls(apiKey: string): Promise<string[]> {
  const pages = await Promise.allSettled(
    [1, 2].map((page) =>
      fetch(`${TMDB_API_BASE}/movie/popular?page=${page}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 86400 },
      })
        .then((r) => {
          if (!r.ok) throw new Error(`TMDB responded with ${r.status}`);
          return r.json() as Promise<{ results: Array<{ poster_path: string | null }> }>;
        })
        .then((data) => data.results ?? []),
    ),
  );

  return pages
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .map((m) => m.poster_path)
    .filter((p): p is string => Boolean(p))
    .map((path) => `${TMDB_IMAGE_BASE}${path}`);
}

type PosterProxyFailure = {
  ok: false;
  status: number;
  message: string;
};

type PosterProxySuccess = {
  ok: true;
  body: ArrayBuffer;
  contentType: string;
  upstreamStatus: number;
};

export type PosterProxyResult = PosterProxyFailure | PosterProxySuccess;

function posterProxyFailure(status: number, message: string): PosterProxyFailure {
  return { ok: false, status, message };
}

function parsePosterUrl(url: string | null): URL | PosterProxyFailure {
  if (!url) {
    return posterProxyFailure(400, 'Missing url');
  }

  try {
    return new URL(url);
  } catch {
    return posterProxyFailure(400, 'Invalid url');
  }
}

function validatePosterOrigin(parsed: URL): PosterProxyFailure | undefined {
  if (parsed.hostname !== TMDB_IMAGE_HOST || parsed.protocol !== 'https:') {
    return posterProxyFailure(403, 'Forbidden');
  }
  return undefined;
}

function decodePosterPathname(pathname: string): string | PosterProxyFailure {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return posterProxyFailure(400, 'Invalid url');
  }
}

function validatePosterPath(parsed: URL): PosterProxyFailure | undefined {
  const normalizedPathname = decodePosterPathname(parsed.pathname);
  if (isPosterProxyFailure(normalizedPathname)) return normalizedPathname;
  if (
    !ALLOWED_PATHNAME.test(parsed.pathname) ||
    normalizedPathname.includes('..') ||
    normalizedPathname.includes('\\') ||
    normalizedPathname.includes('//')
  ) {
    return posterProxyFailure(403, 'Forbidden');
  }
  return undefined;
}

function isPosterProxyFailure(value: unknown): value is PosterProxyFailure {
  return Boolean(value && typeof value === 'object' && 'ok' in value && value.ok === false);
}

function buildSafePosterUrl(parsed: URL): URL {
  const safeSearchParams = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;
    if (key === 'language' && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(value)) {
      safeSearchParams.set(key, value);
    }
  }

  const safeUrl = new URL(`https://${TMDB_IMAGE_HOST}${parsed.pathname}`);
  safeUrl.search = safeSearchParams.toString();
  return safeUrl;
}

function validatePosterUrl(url: string | null): URL | PosterProxyFailure {
  const parsed = parsePosterUrl(url);
  if (isPosterProxyFailure(parsed)) return parsed;

  return validatePosterOrigin(parsed) ?? validatePosterPath(parsed) ?? buildSafePosterUrl(parsed);
}

export async function proxyPosterImage(url: string | null): Promise<PosterProxyResult> {
  const safeUrl = validatePosterUrl(url);
  if (isPosterProxyFailure(safeUrl)) return safeUrl;

  const res = await fetch(safeUrl, {
    next: { revalidate: 86400 },
    redirect: 'error',
  });

  if (!res.ok) {
    return posterProxyFailure(res.status, 'Upstream error');
  }

  const upstreamType = res.headers.get('Content-Type')?.split(';')[0].trim() ?? '';
  const contentType = ALLOWED_CONTENT_TYPES.has(upstreamType) ? upstreamType : 'image/jpeg';

  return {
    ok: true,
    body: await res.arrayBuffer(),
    contentType,
    upstreamStatus: res.status,
  };
}
