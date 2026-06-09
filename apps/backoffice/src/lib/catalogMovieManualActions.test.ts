import { describe, expect, it } from 'vitest';

import { parseCatalogMovieManualFields } from './catalogMovieManualActions';

function form(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe('catalog movie manual actions', () => {
  it('parses only explicitly entered manual fields', () => {
    expect(
      parseCatalogMovieManualFields(
        form({
          age_rating: '',
          localized_name: 'Fuego contra fuego',
          poster_url: '',
          runtime: '170',
          tmdb_id: '949',
        }),
      ),
    ).toEqual({
      localizedName: 'Fuego contra fuego',
      runtime: 170,
      tmdbId: 949,
    });
  });

  it('validates numeric fields and poster URL shape', () => {
    expect(() => parseCatalogMovieManualFields(form({ tmdb_id: 'tmdb-949' }))).toThrow(
      'TMDB id must be a positive integer.',
    );
    expect(() => parseCatalogMovieManualFields(form({ poster_url: 'image.jpg' }))).toThrow(
      'Poster URL must be an absolute http(s) URL or TMDB image path.',
    );
  });

  it('rejects empty submissions', () => {
    expect(() => parseCatalogMovieManualFields(form({ localized_name: '   ' }))).toThrow(
      'Enter at least one manual field before applying.',
    );
  });
});
