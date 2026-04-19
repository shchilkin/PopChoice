import { NextRequest } from 'next/server';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock dependencies early
vi.mock('@/lib/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/withAuth', () => ({
  withAuth: vi.fn((handler) => async (req: NextRequest) => {
    if (req.headers.get('x-test-auth') === 'deny') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return handler(req);
  }),
}));

vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

// 2. Now import the module under test
import { applyRateLimit } from '@/lib/rateLimit';

import { POST } from './route';

const makeRequest = (body: any, headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/enhance-movies', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

describe('POST /api/enhance-movies', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(applyRateLimit).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('returns 400 when the payload is invalid', async () => {
    const req = makeRequest({ movies: 'not-an-array' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request payload');
  });

  it('enforces max movies per request', async () => {
    const movies = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      name: `Movie ${index + 1}`,
      year: 2023,
      similarity: 0.8,
    }));

    const req = makeRequest({ movies });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid request payload');
  });

  it('returns rate limit response when throttled', async () => {
    vi.mocked(applyRateLimit).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const req = makeRequest({
      movies: [{ id: 1, name: 'Test Movie', year: 2023, similarity: 0.9 }],
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 401 when auth wrapper blocks the request', async () => {
    const req = makeRequest(
      { movies: [{ id: 1, name: 'Test Movie', year: 2023, similarity: 0.9 }] },
      { 'x-test-auth': 'deny' },
    );
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('returns original movies when TMDB_API_KEY is missing', async () => {
    delete process.env.TMDB_API_KEY;

    const movies = [
      {
        id: 1,
        name: 'Test Movie',
        year: 2023,
        similarity: 0.9,
      },
    ];

    const req = makeRequest({ movies });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enhancedMovies).toEqual(movies);
  });

  it('returns original movies (graceful fallback) on TMDB API failure', async () => {
    process.env.TMDB_API_KEY = 'test-tmdb-key';

    // Mock TMDB to fail
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);

    const movies = [
      {
        id: 1,
        name: 'Test Movie',
        year: 2023,
        similarity: 0.9,
      },
    ];

    const req = makeRequest({ movies });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    // It should just return the un-enhanced movie
    expect(json.enhancedMovies).toEqual(movies);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('returns original movies on invalid TMDB response payload', async () => {
    process.env.TMDB_API_KEY = 'test-tmdb-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [{ id: 101, poster_path: '/poster.jpg' }],
        }),
    } as Response);

    const movies = [{ id: 1, name: 'Test Movie', year: 2023, similarity: 0.9 }];
    const req = makeRequest({ movies });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enhancedMovies).toEqual(movies);
  });

  it('enhances movies successfully when TMDB API succeeds', async () => {
    process.env.TMDB_API_KEY = 'test-tmdb-key';

    // Mock successful TMDB response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              id: 101,
              title: 'Test Movie',
              poster_path: '/poster.jpg',
              overview: 'Test overview',
              vote_average: 8.5,
            },
          ],
        }),
    } as Response);

    const movies = [{ id: 1, name: 'Test Movie', year: 2023, similarity: 0 }];

    const req = makeRequest({ movies });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.enhancedMovies).toHaveLength(1);
    const enhancedMovie = json.enhancedMovies[0];

    expect(enhancedMovie.posterURL).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    expect(enhancedMovie.description).toContain('0% match');
    expect(enhancedMovie.description).toContain('Test overview');
    expect(enhancedMovie.description).toContain('TMDB: 8.5/10');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/search/movie?query='),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-tmdb-key',
        }),
      }),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('api_key='),
      expect.anything(),
    );
  });
});
