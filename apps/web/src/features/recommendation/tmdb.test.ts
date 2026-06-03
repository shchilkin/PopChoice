import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildTMDBDiscoverQueryShape,
  enrichTMDBMatchesWithDetails,
  fetchTMDBDiscoverMovies,
} from './tmdb';

import type { EnhancedMovieMatch, PersonFormData } from './types';

const basePerson: PersonFormData = {
  favoriteMovie: 'The Matrix',
  favoriteMovieWhy: 'Smart genre momentum.',
  moodPreference: ['Sci-Fi', 'Action'],
  newVsClassic: 'Both new and classic',
  tonePreference: 'Balanced',
};

function personWith(overrides: Partial<PersonFormData>): PersonFormData {
  return { ...basePerson, ...overrides };
}

describe('buildTMDBDiscoverQueryShape', () => {
  it('turns hard avoids and safe discovery appetite into bounded TMDB discover params', () => {
    const shape = buildTMDBDiscoverQueryShape([
      personWith({
        favoriteMovieWhy: 'Avoid: horror, gore, long runtime. Discovery appetite: Safe hit.',
        moodPreference: ['Horror', 'Sci-Fi', 'Action'],
        tonePreference: 'Dark and intense',
      }),
    ]);

    expect(shape.genreIds).toEqual([878, 28]);
    expect(shape.withoutGenreIds).toEqual([27]);
    expect(shape.voteCountGte).toBe(500);
    expect(shape.with_runtime_lte).toBe(125);
    expect(shape.sortBy).toBe('popularity.desc');
  });

  it('keeps surprise discovery broader while preserving serious tone sorting', () => {
    const shape = buildTMDBDiscoverQueryShape([
      personWith({
        favoriteMovieWhy: 'Discovery appetite: Surprise me.',
        tonePreference: 'Serious and thought-provoking',
      }),
    ]);

    expect(shape.voteCountGte).toBe(50);
    expect(shape.sortBy).toBe('vote_average.desc');
  });
});

describe('fetchTMDBDiscoverMovies', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('passes shaped hard-avoid and discovery params to TMDB discover', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              genre_ids: [878],
              id: 100,
              overview: 'A space adventure.',
              poster_path: null,
              release_date: '2020-01-01',
              title: 'Space Adventure',
              vote_average: 7.4,
            },
          ],
        }),
    } as Response);

    await fetchTMDBDiscoverMovies(
      [
        personWith({
          favoriteMovieWhy: 'Avoid: horror, long runtime. Discovery appetite: Safe hit.',
          moodPreference: ['Horror', 'Sci-Fi'],
        }),
      ],
      'test-token',
    );

    const [url] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    expect(typeof url).toBe('string');
    const parsedUrl = new URL(String(url));
    expect(parsedUrl.pathname).toBe('/3/discover/movie');
    expect(parsedUrl.searchParams.get('with_genres')).toBe('878');
    expect(parsedUrl.searchParams.get('without_genres')).toBe('27');
    expect(parsedUrl.searchParams.get('vote_count.gte')).toBe('500');
    expect(parsedUrl.searchParams.get('with_runtime.lte')).toBe('125');
  });
});

describe('enrichTMDBMatchesWithDetails', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('enriches bounded direct TMDB matches with pragmatic metadata', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 100,
          title: 'Space Adventure',
          original_title: 'Space Adventure Original',
          original_language: 'en',
          overview: 'A richer details overview.',
          release_date: '2021-02-03',
          vote_average: 8.1,
          vote_count: 1400,
          popularity: 75,
          runtime: 122,
          poster_path: '/poster.jpg',
          genres: [{ id: 878, name: 'Science Fiction' }],
          credits: {
            cast: [{ credit_id: 'cast-1', id: 1, name: 'Lead Actor', order: 0 }],
            crew: [{ credit_id: 'crew-1', id: 2, job: 'Director', name: 'Director' }],
          },
          keywords: { keywords: [{ id: 3, name: 'space travel' }] },
          release_dates: {
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [{ certification: 'PG-13', type: 3 }],
              },
            ],
          },
          'watch/providers': {
            results: {
              US: {
                flatrate: [{ provider_id: 10, provider_name: 'US Stream', display_priority: 1 }],
              },
            },
          },
        }),
    } as Response);

    const matches: EnhancedMovieMatch[] = [
      {
        age_rating: 'NR',
        content: 'Space Adventure',
        description: 'Short discover overview.',
        duration: 0,
        id: -100,
        name: 'Space Adventure',
        score_rating: 7.4,
        similarity: 0.5,
        tmdbId: 100,
        year: 2020,
      },
    ];

    const [enriched] = await enrichTMDBMatchesWithDetails(matches, 'token', 'en');

    expect(enriched).toMatchObject({
      age_rating: 'PG-13',
      duration: 122,
      metadataQualityScore: expect.any(Number),
      originalLanguage: 'en',
      popularity: 75,
      posterURL: 'https://image.tmdb.org/t/p/w500/poster.jpg',
      score_rating: 8.1,
      voteCount: 1400,
      watchProviders: [
        expect.objectContaining({
          availabilityType: 'flatrate',
          providerId: 10,
          providerName: 'US Stream',
          region: 'US',
        }),
      ],
      year: 2021,
    });
    expect(enriched?.similarity).toBeGreaterThan(0.5);
  });
});
