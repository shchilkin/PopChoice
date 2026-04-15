import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractUSCertification, movieToEmbeddingText, searchMovie } from './tmdb.js';

import type { TMDBMovieDetails } from './tmdb.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDetails = (overrides: Partial<TMDBMovieDetails> = {}): TMDBMovieDetails => ({
  id: 1,
  title: 'Test Movie',
  overview: 'A great test movie.',
  release_date: '2023-06-15',
  vote_average: 7.5,
  runtime: 120,
  release_dates: {
    results: [
      {
        iso_3166_1: 'US',
        release_dates: [{ certification: 'PG-13', type: 3 }],
      },
    ],
  },
  ...overrides,
});

// ---------------------------------------------------------------------------
// extractUSCertification
// ---------------------------------------------------------------------------

describe('extractUSCertification', () => {
  it('returns theatrical (type 3) certification when available', () => {
    const details = makeDetails({
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [
              { certification: 'PG-13', type: 3 },
              { certification: 'R', type: 5 },
            ],
          },
        ],
      },
    });
    expect(extractUSCertification(details)).toBe('PG-13');
  });

  it('falls back to first available certification when no theatrical entry', () => {
    const details = makeDetails({
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [
              { certification: '', type: 3 }, // theatrical but empty cert
              { certification: 'R', type: 5 },
            ],
          },
        ],
      },
    });
    expect(extractUSCertification(details)).toBe('R');
  });

  it('returns NR when no US entry exists', () => {
    const details = makeDetails({
      release_dates: {
        results: [{ iso_3166_1: 'GB', release_dates: [{ certification: '15', type: 3 }] }],
      },
    });
    expect(extractUSCertification(details)).toBe('NR');
  });

  it('returns NR when US entry has no release_dates entries', () => {
    const details = makeDetails({
      release_dates: {
        results: [{ iso_3166_1: 'US', release_dates: [] }],
      },
    });
    expect(extractUSCertification(details)).toBe('NR');
  });

  it('returns NR when all US certifications are empty strings', () => {
    const details = makeDetails({
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [
              { certification: '', type: 3 },
              { certification: '', type: 5 },
            ],
          },
        ],
      },
    });
    expect(extractUSCertification(details)).toBe('NR');
  });

  it('returns NR when release_dates.results is empty', () => {
    const details = makeDetails({ release_dates: { results: [] } });
    expect(extractUSCertification(details)).toBe('NR');
  });
});

// ---------------------------------------------------------------------------
// movieToEmbeddingText
// ---------------------------------------------------------------------------

describe('movieToEmbeddingText', () => {
  it('produces correct multi-line embedding text', () => {
    const text = movieToEmbeddingText(
      'Inception',
      2010,
      'PG-13',
      148,
      'A mind-bending thriller.',
      8.8,
    );
    expect(text).toBe(
      'Inception (2010)\nRating: PG-13\nDuration: 148 min\nScore: 8.8/10\nDescription: A mind-bending thriller.',
    );
  });

  it('formats score to one decimal place', () => {
    const text = movieToEmbeddingText('Movie', 2020, 'NR', 90, 'Desc.', 7.0);
    expect(text).toContain('Score: 7.0/10');
  });

  it('includes year in title line', () => {
    const text = movieToEmbeddingText('Old Movie', 1999, 'G', 80, 'Classic.', 6.5);
    expect(text).toContain('Old Movie (1999)');
  });
});

// ---------------------------------------------------------------------------
// searchMovie
// ---------------------------------------------------------------------------

describe('searchMovie', () => {
  const API_KEY = 'test-key';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(...responses: object[]) {
    const fetchMock = vi.mocked(fetch);
    for (const body of responses) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => body,
      } as Response);
    }
  }

  it('returns id of first result that matches year exactly', async () => {
    mockFetch({ results: [{ id: 42, title: 'Inception', release_date: '2010-07-16' }] });
    const id = await searchMovie(API_KEY, 'Inception', 2010);
    expect(id).toBe(42);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('accepts a result within ±1 year tolerance', async () => {
    mockFetch({ results: [{ id: 7, title: 'Movie', release_date: '2011-01-01' }] });
    const id = await searchMovie(API_KEY, 'Movie', 2010);
    expect(id).toBe(7);
  });

  it('falls back to year-less search when year-scoped returns no valid match', async () => {
    // Year-scoped: wrong year; year-less: correct year
    mockFetch(
      { results: [{ id: 99, title: 'Movie', release_date: '2005-01-01' }] }, // scoped, no match
      { results: [{ id: 42, title: 'Movie', release_date: '2010-03-15' }] }, // broad, match
    );
    const id = await searchMovie(API_KEY, 'Movie', 2010);
    expect(id).toBe(42);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when both year-scoped and year-less searches fail to match', async () => {
    mockFetch(
      { results: [{ id: 1, title: 'Movie', release_date: '2000-01-01' }] },
      { results: [{ id: 1, title: 'Movie', release_date: '2000-01-01' }] },
    );
    const id = await searchMovie(API_KEY, 'Movie', 2010);
    expect(id).toBeNull();
  });

  it('skips the year param and returns first result when year is 0', async () => {
    mockFetch({ results: [{ id: 55, title: 'Unknown Year Movie', release_date: '2015-05-01' }] });
    const id = await searchMovie(API_KEY, 'Unknown Year Movie', 0);
    expect(id).toBe(55);
    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('year=');
  });

  it('returns null when year=0 and TMDB returns empty results', async () => {
    mockFetch({ results: [] });
    const id = await searchMovie(API_KEY, 'Ghost Movie', 0);
    expect(id).toBeNull();
  });

  it('throws on TMDB API error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);
    await expect(searchMovie(API_KEY, 'Movie', 2020)).rejects.toThrow('TMDB search API error');
  });
});
