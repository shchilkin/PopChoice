import { describe, expect, it } from 'vitest';

import { NO_REFERENCE_MOVIE, emptyPerson, toApiFormat } from './constants';

describe('toApiFormat', () => {
  it('strips the no-reference UI token before submitting quiz answers', () => {
    const person = {
      ...emptyPerson(),
      favoriteMovie: NO_REFERENCE_MOVIE,
      era: 'both' as const,
      moods: ['drama'],
      tone: 'serious' as const,
    };

    expect(toApiFormat(person)).toMatchObject({
      favoriteMovie: '',
      newVsClassic: 'Both new and classic',
      moodPreference: ['Drama'],
      tonePreference: 'Serious and thought-provoking',
    });
  });
});
