import { describe, expect, it } from 'vitest';

import { emptyPerson, toApiFormat } from './constants';

describe('toApiFormat', () => {
  it('submits an empty favorite movie when the user has no reference pick', () => {
    const person = {
      ...emptyPerson(),
      favoriteMovie: '',
      hasNoReferenceMovie: true,
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
