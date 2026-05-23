import { describe, expect, it } from 'vitest';

import { extractCatalogMetadata, extractUSCertification, movieToEmbeddingText } from './tmdb.js';

import type { TMDBMovieDetails } from './tmdb.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeDetails = (overrides: Partial<TMDBMovieDetails> = {}): TMDBMovieDetails => ({
  id: 1,
  title: 'Test Movie',
  overview: 'A great test movie with a decent description.',
  release_date: '2023-06-15',
  vote_average: 7.5,
  vote_count: 1000,
  runtime: 120,
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

describe('extractCatalogMetadata', () => {
  it('extracts normalized catalog metadata from appended TMDB details', () => {
    const details = makeDetails({
      genres: [{ id: 35, name: 'Comedy' }],
      credits: {
        cast: [{ id: 10, name: 'Lead Actor', character: 'Lead', order: 0, credit_id: 'cast-10' }],
        crew: [
          {
            id: 20,
            name: 'Movie Director',
            job: 'Director',
            department: 'Directing',
            credit_id: 'crew-20',
          },
        ],
      },
      keywords: { keywords: [{ id: 30, name: 'friendship' }] },
    });

    const metadata = extractCatalogMetadata(details);

    expect(metadata.people.map((person) => person.role)).toEqual(['cast', 'director']);
    expect(metadata.genres).toEqual([expect.objectContaining({ tmdbId: 35, name: 'Comedy' })]);
    expect(metadata.keywords).toEqual([
      expect.objectContaining({ tmdbId: 30, name: 'friendship' }),
    ]);
    expect(metadata.snapshot).toMatchObject({
      id: 1,
      title: 'Test Movie',
      cast: [expect.objectContaining({ id: 10, name: 'Lead Actor' })],
      directors: [expect.objectContaining({ id: 20, name: 'Movie Director' })],
    });
  });
});

// ---------------------------------------------------------------------------
// movieToEmbeddingText
// ---------------------------------------------------------------------------

describe('movieToEmbeddingText', () => {
  it('produces correct embedding text with known runtime', () => {
    const details = makeDetails({ runtime: 120 });
    const text = movieToEmbeddingText(details, 'PG-13');
    expect(text).toContain('Test Movie (2023)');
    expect(text).toContain('Rating: PG-13');
    expect(text).toContain('Score: 7.5/10');
    expect(text).toContain('Duration: 120 min');
    expect(text).toContain('Description:');
  });

  it('emits "Duration: unknown" when runtime is null', () => {
    const details = makeDetails({ runtime: null });
    const text = movieToEmbeddingText(details, 'NR');
    expect(text).toContain('Duration: unknown');
    expect(text).not.toContain('Duration: 0');
  });

  it('emits "Duration: unknown" when runtime is 0', () => {
    const details = makeDetails({ runtime: 0 });
    const text = movieToEmbeddingText(details, 'NR');
    expect(text).toContain('Duration: unknown');
    expect(text).not.toContain('Duration: 0 min');
  });

  it('extracts year from release_date', () => {
    const details = makeDetails({ release_date: '2019-04-26' });
    const text = movieToEmbeddingText(details, 'PG-13');
    expect(text).toContain('(2019)');
  });

  it('uses "Unknown" year when release_date is empty', () => {
    const details = makeDetails({ release_date: '' });
    const text = movieToEmbeddingText(details, 'NR');
    expect(text).toContain('(Unknown)');
  });

  it('falls back to "No description available." when overview is empty', () => {
    const details = makeDetails({ overview: '' });
    const text = movieToEmbeddingText(details, 'NR');
    expect(text).toContain('Description: No description available.');
  });
});
