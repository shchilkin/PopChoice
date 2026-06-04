import { describe, expect, it } from 'vitest';

import {
  extractTMDBCatalogMetadataCore,
  extractTMDBUSCertification,
} from './tmdbCatalogMetadata.js';

import type { TMDBCatalogMovieDetails } from './tmdbCatalogMetadata.js';

function makeDetails(overrides: Partial<TMDBCatalogMovieDetails> = {}): TMDBCatalogMovieDetails {
  return {
    id: 42,
    title: 'Shared Metadata Movie',
    release_date: '2024-05-01',
    vote_average: 7.9,
    runtime: 118,
    poster_path: '/poster.jpg',
    release_dates: {
      results: [
        {
          iso_3166_1: 'US',
          release_dates: [{ certification: 'PG-13', type: 3 }],
        },
      ],
    },
    ...overrides,
  };
}

describe('extractTMDBUSCertification', () => {
  it('prefers theatrical US certification and falls back to any non-empty US certification', () => {
    expect(
      extractTMDBUSCertification(
        makeDetails({
          release_dates: {
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [
                  { certification: '', type: 3 },
                  { certification: 'R', type: 5 },
                ],
              },
            ],
          },
        }),
      ),
    ).toBe('R');
  });

  it('returns NR when US release certification is unavailable', () => {
    expect(
      extractTMDBUSCertification(
        makeDetails({
          release_dates: {
            results: [{ iso_3166_1: 'GB', release_dates: [{ certification: '15', type: 3 }] }],
          },
        }),
      ),
    ).toBe('NR');
  });
});

describe('extractTMDBCatalogMetadataCore', () => {
  it('normalizes cast, directors, genres, keywords, and snapshot fields', () => {
    const metadata = extractTMDBCatalogMetadataCore(
      makeDetails({
        genres: [{ id: 878, name: 'Science Fiction' }],
        credits: {
          cast: [
            { id: 3, name: 'Late Cast', order: 3, credit_id: 'cast-3' },
            { id: 1, name: 'Lead Cast', character: 'Lead', order: 0, credit_id: 'cast-1' },
            { id: 2, name: 'Missing Credit Id', order: 1 },
          ],
          crew: [
            { id: 10, name: 'Director', job: 'Director', credit_id: 'crew-10' },
            { id: 11, name: 'Producer', job: 'Producer', credit_id: 'crew-11' },
          ],
        },
        keywords: { keywords: [{ id: 7, name: 'space travel' }] },
      }),
      { maxCastCredits: 1 },
    );

    expect(metadata.people).toEqual([
      expect.objectContaining({
        tmdbId: 1,
        role: 'cast',
        characterName: 'Lead',
        creditId: 'cast-1',
      }),
      expect.objectContaining({
        tmdbId: 10,
        role: 'director',
        job: 'Director',
        creditId: 'crew-10',
      }),
    ]);
    expect(metadata.genres).toEqual([
      expect.objectContaining({ tmdbId: 878, name: 'Science Fiction' }),
    ]);
    expect(metadata.keywords).toEqual([
      expect.objectContaining({ tmdbId: 7, name: 'space travel' }),
    ]);
    expect(metadata.snapshot).toMatchObject({
      id: 42,
      title: 'Shared Metadata Movie',
      poster_path: '/poster.jpg',
      cast: [{ id: 1, name: 'Lead Cast', character: 'Lead', order: 0 }],
      directors: [{ id: 10, name: 'Director', job: 'Director' }],
    });
  });
});
