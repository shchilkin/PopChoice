import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetPopularPosterUrls = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();

vi.mock('@/integrations/tmdb', () => ({
  getPopularPosterUrls: (...args: Parameters<typeof mockGetPopularPosterUrls>) =>
    mockGetPopularPosterUrls(...args),
}));

vi.mock('@/lib/logger', () => ({
  default: {
    warn: (...args: Parameters<typeof mockWarn>) => mockWarn(...args),
    error: (...args: Parameters<typeof mockError>) => mockError(...args),
  },
}));

import { GET } from './route';

describe('GET /api/poster-urls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns an empty list when TMDB_API_KEY is not set', async () => {
    vi.stubEnv('TMDB_API_KEY', '');

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ posters: [] });
    expect(mockGetPopularPosterUrls).not.toHaveBeenCalled();
  });

  it('returns popular poster URLs from the TMDB integration', async () => {
    vi.stubEnv('TMDB_API_KEY', 'test-key');
    mockGetPopularPosterUrls.mockResolvedValueOnce([
      'https://image.tmdb.org/t/p/w300/a.jpg',
      'https://image.tmdb.org/t/p/w300/b.jpg',
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      posters: ['https://image.tmdb.org/t/p/w300/a.jpg', 'https://image.tmdb.org/t/p/w300/b.jpg'],
    });
    expect(mockGetPopularPosterUrls).toHaveBeenCalledWith('test-key');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=86400');
  });

  it('returns an empty list when the TMDB integration throws', async () => {
    vi.stubEnv('TMDB_API_KEY', 'test-key');
    mockGetPopularPosterUrls.mockRejectedValueOnce(new Error('TMDB unavailable'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ posters: [] });
    expect(mockError).toHaveBeenCalled();
  });
});
