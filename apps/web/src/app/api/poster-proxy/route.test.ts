import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// Mock rate limit (pass-through)
vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

import { GET } from './route';

const VALID_URL = 'https://image.tmdb.org/t/p/w500/poster.jpg';

describe('GET /api/poster-proxy', () => {
  it('returns 400 when url param is missing', async () => {
    const req = new NextRequest('http://localhost/api/poster-proxy');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when url param is not a valid URL', async () => {
    const req = new NextRequest('http://localhost/api/poster-proxy?url=not-a-url');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when hostname is not image.tmdb.org', async () => {
    const url = encodeURIComponent('https://evil.example.com/image.jpg');
    const req = new NextRequest(`http://localhost/api/poster-proxy?url=${url}`);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when protocol is http (not https)', async () => {
    const url = encodeURIComponent('http://image.tmdb.org/t/p/w500/poster.jpg');
    const req = new NextRequest(`http://localhost/api/poster-proxy?url=${url}`);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when image.tmdb.org appears in path but hostname differs', async () => {
    const url = encodeURIComponent('https://evil.com/image.tmdb.org/poster.jpg');
    const req = new NextRequest(`http://localhost/api/poster-proxy?url=${url}`);
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('proxies a valid TMDB image and returns image content', async () => {
    const fakeBuffer = new Uint8Array([1, 2, 3]).buffer;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: () => Promise.resolve(fakeBuffer),
    } as unknown as Response);

    const url = encodeURIComponent(VALID_URL);
    const req = new NextRequest(`http://localhost/api/poster-proxy?url=${url}`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('returns upstream error status when upstream fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => null },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as unknown as Response);

    const url = encodeURIComponent(VALID_URL);
    const req = new NextRequest(`http://localhost/api/poster-proxy?url=${url}`);
    const res = await GET(req);

    expect(res.status).toBe(404);
  });
});
