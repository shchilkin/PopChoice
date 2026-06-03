import { describe, expect, it } from 'vitest';

import { extractCatalogMetadata, extractUSCertification, getMetadataQualityScore } from './tmdb';

import type { TMDBMovieDetails } from './tmdb';

function makeDetails(overrides: Partial<TMDBMovieDetails> = {}): TMDBMovieDetails {
  return {
    id: 42,
    title: 'Metadata Movie',
    original_title: 'Metadata Movie Original',
    original_language: 'en',
    overview: 'A strong metadata fixture.',
    release_date: '2024-05-01',
    vote_average: 7.9,
    vote_count: 1200,
    popularity: 88,
    runtime: 118,
    poster_path: '/poster.jpg',
    genres: [{ id: 878, name: 'Science Fiction' }],
    credits: {
      cast: [
        {
          credit_id: 'cast-1',
          id: 1,
          name: 'Lead Actor',
          order: 0,
          popularity: 50,
        },
      ],
      crew: [
        {
          credit_id: 'crew-1',
          department: 'Directing',
          id: 2,
          job: 'Director',
          name: 'Main Director',
        },
      ],
    },
    keywords: { keywords: [{ id: 10, name: 'space travel' }] },
    release_dates: {
      results: [
        {
          iso_3166_1: 'US',
          release_dates: [{ certification: 'PG-13', type: 3 }],
        },
      ],
    },
    spoken_languages: [{ english_name: 'English', iso_639_1: 'en', name: 'English' }],
    production_countries: [{ iso_3166_1: 'US', name: 'United States of America' }],
    'watch/providers': {
      results: {
        FI: {
          flatrate: [
            {
              display_priority: 2,
              logo_path: '/fi.png',
              provider_id: 20,
              provider_name: 'FI Stream',
            },
          ],
          link: 'https://tmdb.example/fi',
        },
        RU: {
          buy: [
            {
              display_priority: 3,
              provider_id: 30,
              provider_name: 'RU Buy',
            },
          ],
          link: 'https://tmdb.example/ru',
        },
        US: {
          rent: [
            {
              display_priority: 1,
              logo_path: '/us.png',
              provider_id: 10,
              provider_name: 'US Rent',
            },
          ],
          link: 'https://tmdb.example/us',
        },
      },
    },
    ...overrides,
  };
}

describe('catalog TMDB metadata extraction', () => {
  it('extracts pragmatic-core metadata including providers for configured regions', () => {
    const metadata = extractCatalogMetadata(makeDetails());

    expect(extractUSCertification(makeDetails())).toBe('PG-13');
    expect(metadata.genres).toEqual([
      expect.objectContaining({ name: 'Science Fiction', tmdbId: 878 }),
    ]);
    expect(metadata.keywords).toEqual([
      expect.objectContaining({ name: 'space travel', tmdbId: 10 }),
    ]);
    expect(metadata.people.map((person) => person.role)).toEqual(['cast', 'director']);
    expect(metadata.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          availabilityType: 'rent',
          providerId: 10,
          providerName: 'US Rent',
          region: 'US',
        }),
        expect.objectContaining({
          availabilityType: 'flatrate',
          providerId: 20,
          region: 'FI',
        }),
        expect.objectContaining({
          availabilityType: 'buy',
          providerId: 30,
          region: 'RU',
        }),
      ]),
    );
    expect(metadata.snapshot).toMatchObject({
      certification: 'PG-13',
      metadata_quality_flags: [],
      metadata_quality_score: 100,
      original_language: 'en',
      original_title: 'Metadata Movie Original',
      popularity: 88,
      vote_count: 1200,
    });
  });

  it('scores missing metadata with actionable flags', () => {
    const metadata = extractCatalogMetadata(
      makeDetails({
        credits: { cast: [], crew: [] },
        genres: [],
        keywords: { keywords: [] },
        original_language: '',
        popularity: 0,
        poster_path: null,
        release_dates: { results: [] },
        runtime: 0,
        vote_count: 0,
        'watch/providers': { results: {} },
      }),
    );

    expect(metadata.qualityFlags).toEqual(
      expect.arrayContaining([
        'missing_runtime',
        'missing_certification',
        'missing_poster',
        'missing_original_language',
        'missing_vote_count',
        'missing_popularity',
        'missing_genres',
        'missing_keywords',
        'missing_cast',
        'missing_director',
        'missing_provider_us',
        'missing_provider_fi',
        'missing_provider_ru',
      ]),
    );
    expect(metadata.qualityScore).toBeLessThan(70);
    expect(getMetadataQualityScore([])).toBe(100);
  });
});
