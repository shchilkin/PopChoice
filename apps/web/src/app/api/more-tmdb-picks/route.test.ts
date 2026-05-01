import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock rate limit (pass-through)
vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

// Mock job queue (no Redis in tests)
vi.mock('@/lib/jobQueue', () => ({
  seedQueue: null,
  MOVIE_SEED_JOB_OPTIONS: {},
}));

// Mock OpenAI client
const mockEmbeddingsCreate = vi.fn(() =>
  Promise.resolve({ data: [{ embedding: new Array(3072).fill(0.1) }] }),
);
const mockChatCompletionsCreate = vi.fn(() =>
  Promise.resolve({
    choices: [{ message: { content: 'An exciting action film.' } }],
  }),
);
vi.mock('@/clients', () => ({
  openAIClient: {
    embeddings: {
      create: (...args: Parameters<typeof mockEmbeddingsCreate>) => mockEmbeddingsCreate(...args),
    },
    chat: {
      completions: {
        create: (...args: Parameters<typeof mockChatCompletionsCreate>) =>
          mockChatCompletionsCreate(...args),
      },
    },
  },
}));

// Mock IMAGE_BASE_URL from services
vi.mock('@/services', () => ({
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p',
}));

import { POST } from './route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validBody = {
  quizData: {
    favoriteMovie: 'The Dark Knight',
    newVsClassic: 'new',
    moodPreference: ['action'],
    tonePreference: 'serious',
  },
  page: 2,
  excludeIds: [],
};

const mockDiscoverResponse = {
  results: [
    {
      id: 42,
      title: 'Test Movie',
      overview: 'A great test movie.',
      release_date: '2020-01-01',
      vote_average: 8.0,
      vote_count: 500,
      genre_ids: [28],
      popularity: 100.0,
      poster_path: '/poster.jpg',
    },
  ],
};

function makeRequest(body: unknown = validBody) {
  return new NextRequest('http://localhost/api/more-tmdb-picks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/more-tmdb-picks — timeout handling', () => {
  beforeEach(() => {
    vi.stubEnv('TMDB_API_KEY', 'test-tmdb-key');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns 504 when TMDB discover fetch times out via TimeoutError', async () => {
    const timeoutError = Object.assign(new Error('The operation timed out.'), {
      name: 'TimeoutError',
    });
    vi.mocked(fetch).mockRejectedValueOnce(timeoutError);

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(504);
    expect(data).toHaveProperty('error');
  });

  it('returns 504 when TMDB discover fetch times out via AbortError', async () => {
    const abortError = Object.assign(new Error('The operation was aborted.'), {
      name: 'AbortError',
    });
    vi.mocked(fetch).mockRejectedValueOnce(abortError);

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(504);
    expect(data).toHaveProperty('error');
  });

  it('returns 413 when Content-Length exceeds 16 KB', async () => {
    const req = new NextRequest('http://localhost/api/more-tmdb-picks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'en',
        'content-length': String(16 * 1024 + 1),
      },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(413);
    expect(data).toHaveProperty('error');
  });

  it('returns movies even when localized detail fetch times out (falls back to discover values)', async () => {
    // First fetch: TMDB discover succeeds
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDiscoverResponse,
    } as Response);

    // Subsequent fetches: per-movie detail times out
    const timeoutError = Object.assign(new Error('The operation timed out.'), {
      name: 'TimeoutError',
    });
    vi.mocked(fetch).mockRejectedValue(timeoutError);

    // Embeddings return one vector each for query and candidate
    mockEmbeddingsCreate
      .mockResolvedValueOnce({ data: [{ embedding: new Array(3072).fill(0.1) }] })
      .mockResolvedValueOnce({ data: [{ embedding: new Array(3072).fill(0.2) }] });

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('movies');
    expect(Array.isArray(data.movies)).toBe(true);
  });
});
