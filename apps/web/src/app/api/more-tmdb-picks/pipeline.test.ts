import { describe, expect, it } from 'vitest';

import { extractTMDBParams, type MorePicksPersonFormData } from './pipeline';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function person(overrides: Partial<MorePicksPersonFormData> = {}): MorePicksPersonFormData {
  return {
    favoriteMovie: 'The Dark Knight',
    newVsClassic: 'new',
    moodPreference: ['action'],
    tonePreference: 'serious',
    ...overrides,
  };
}

const currentYear = new Date().getFullYear();

// ---------------------------------------------------------------------------
// extractTMDBParams
// ---------------------------------------------------------------------------

describe('extractTMDBParams — genre mapping', () => {
  it('maps a single mood to the correct TMDB genre ID', () => {
    const params = extractTMDBParams([person({ moodPreference: ['comedy'] })]);
    expect(params.genre_ids).toContain(35); // comedy = 35
  });

  it('maps Sci-Fi after normalisation', () => {
    const params = extractTMDBParams([person({ moodPreference: ['Sci-Fi'] })]);
    expect(params.genre_ids).toContain(878); // sci-fi = 878
  });

  it('picks the top 3 most-voted genres across a group', () => {
    const people = [
      person({ moodPreference: ['action', 'comedy'] }),
      person({ moodPreference: ['action', 'drama'] }),
      person({ moodPreference: ['action'] }),
    ];
    const params = extractTMDBParams(people);
    // action appears 3×, comedy 1×, drama 1× — action must be included
    expect(params.genre_ids).toContain(28); // action
    expect(params.genre_ids.length).toBeLessThanOrEqual(3);
  });

  it('returns an empty genre list when no moods match the mapping', () => {
    const params = extractTMDBParams([person({ moodPreference: ['unknownGenre'] })]);
    expect(params.genre_ids).toHaveLength(0);
  });
});

describe('extractTMDBParams — era / date filters', () => {
  it('sets primary_release_date_gte for "new" era', () => {
    const params = extractTMDBParams([person({ newVsClassic: 'new' })]);
    expect(params.primary_release_date_gte).toBe(`${currentYear - 10}-01-01`);
    expect(params.primary_release_date_lte).toBeUndefined();
  });

  it('sets primary_release_date_lte for "classic" era', () => {
    const params = extractTMDBParams([person({ newVsClassic: 'classic' })]);
    expect(params.primary_release_date_lte).toBe(`${currentYear - 20}-12-31`);
    expect(params.primary_release_date_gte).toBeUndefined();
  });

  it('sets no date filters for "both" era', () => {
    const params = extractTMDBParams([person({ newVsClassic: 'both' })]);
    expect(params.primary_release_date_gte).toBeUndefined();
    expect(params.primary_release_date_lte).toBeUndefined();
  });

  it('falls back to "both" for unrecognised era values', () => {
    const params = extractTMDBParams([person({ newVsClassic: 'unknown era value' })]);
    expect(params.primary_release_date_gte).toBeUndefined();
    expect(params.primary_release_date_lte).toBeUndefined();
  });

  it('uses the dominant era across a group', () => {
    const people = [
      person({ newVsClassic: 'classic' }),
      person({ newVsClassic: 'classic' }),
      person({ newVsClassic: 'new' }),
    ];
    const params = extractTMDBParams(people);
    // classic wins 2 vs 1
    expect(params.primary_release_date_lte).toBeDefined();
    expect(params.primary_release_date_gte).toBeUndefined();
  });
});

describe('extractTMDBParams — sort_by / tone', () => {
  it('uses vote_average.desc for a serious tone', () => {
    const params = extractTMDBParams([person({ tonePreference: 'serious' })]);
    expect(params.sort_by).toBe('vote_average.desc');
  });

  it('uses vote_average.desc for a dark tone', () => {
    const params = extractTMDBParams([person({ tonePreference: 'dark' })]);
    expect(params.sort_by).toBe('vote_average.desc');
  });

  it('uses popularity.desc for a light tone', () => {
    const params = extractTMDBParams([person({ tonePreference: 'light' })]);
    expect(params.sort_by).toBe('popularity.desc');
  });

  it('uses popularity.desc for a balanced tone', () => {
    const params = extractTMDBParams([person({ tonePreference: 'balanced' })]);
    expect(params.sort_by).toBe('popularity.desc');
  });

  it('uses popularity.desc for unrecognised tone values', () => {
    const params = extractTMDBParams([person({ tonePreference: 'quirky' })]);
    expect(params.sort_by).toBe('popularity.desc');
  });

  it('uses the dominant tone across a group', () => {
    const people = [
      person({ tonePreference: 'serious' }),
      person({ tonePreference: 'serious' }),
      person({ tonePreference: 'light' }),
    ];
    const params = extractTMDBParams(people);
    expect(params.sort_by).toBe('vote_average.desc');
  });
});
