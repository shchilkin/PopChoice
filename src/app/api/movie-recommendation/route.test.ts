import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// Mock rate limit (pass-through)
vi.mock('@/lib/rateLimit', () => ({
  applyRateLimit: vi.fn(() => Promise.resolve(null)),
}));

// Mock moderation – default to safe, overridden per test as needed
const mockModerateInput = vi.fn<
  () => Promise<{ flagged: false } | { flagged: true; categories: string[] }>
>(() => Promise.resolve({ flagged: false }));
vi.mock('@/utils/ai/moderation', () => ({
  moderateInput: () => mockModerateInput(),
}));

// Mock OpenAI client (embeddings + chat)
vi.mock('@/clients', () => ({
  openAIClient: {
    embeddings: {
      create: vi.fn(() => Promise.resolve({ data: [{ embedding: new Array(3072).fill(0) }] })),
    },
    chat: {
      completions: {
        create: vi.fn(() =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({ title: 'Test Movie', description: 'Great film.' }),
                },
              },
            ],
          }),
        ),
      },
    },
  },
}));

// Mock DB client
vi.mock('@/clients/dbClient', () => ({
  getDbClient: vi.fn(() => ({
    rpc: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 1,
            name: 'Test Movie',
            age_rating: 'PG',
            description: 'A test movie.',
            duration: 120,
            score_rating: 8.0,
            year: 2023,
            similarity: 0.95,
            content: 'Test Movie (2023) — A test movie.',
          },
        ],
        error: null,
      }),
    ),
  })),
}));

// Mock MovieService (TMDB poster lookups)
vi.mock('@/services', () => ({
  MovieService: vi.fn(() => ({
    getMovieDetails: vi.fn(() =>
      Promise.resolve({ posterURL: undefined, localizedName: undefined }),
    ),
  })),
}));

import { POST } from './route';

const validBody = {
  favoriteMovie: 'The Dark Knight',
  newVsClassic: 'new',
  moodPreference: ['action'],
  tonePreference: 'serious',
};

function makeRequest(body: unknown = validBody) {
  return new NextRequest('http://localhost/api/movie-recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Language': 'en' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/movie-recommendation — moderation', () => {
  it('returns 422 with flaggedCategories when input is flagged', async () => {
    mockModerateInput.mockResolvedValueOnce({ flagged: true, categories: ['hate', 'violence'] });

    const response = await POST(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('flaggedCategories');
    expect(data.flaggedCategories).toEqual(expect.arrayContaining(['hate', 'violence']));
  });

  it('returns 400 when request body is invalid', async () => {
    const response = await POST(makeRequest({ favoriteMovie: '' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });
});
