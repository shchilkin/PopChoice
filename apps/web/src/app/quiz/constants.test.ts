import { describe, expect, it } from 'vitest';

import { emptyPerson, toApiFormat, toFastPickApiFormat } from './constants';

import type { PersonAnswers } from './types';

describe('toApiFormat', () => {
  it('submits an empty favorite movie when the user has no reference pick', () => {
    const person: PersonAnswers = {
      ...emptyPerson(),
      favoriteMovie: '',
      hasNoReferenceMovie: true,
      era: 'both' as const,
      moods: ['drama'],
      tone: 'serious' as const,
      fastAvoids: ['slow', 'long', 'obscure'],
    };

    expect(toApiFormat(person)).toMatchObject({
      favoriteMovie: '',
      favoriteMovieWhy: 'Avoid: slow pacing, long runtime, too obscure.',
      newVsClassic: 'Both new and classic',
      moodPreference: ['Drama'],
      tonePreference: 'Serious and thought-provoking',
    });
  });
});

describe('toFastPickApiFormat', () => {
  it('adapts short Fast Pick answers into the recommendation request shape', () => {
    const person: PersonAnswers = {
      ...emptyPerson('You'),
      fastIntent: ['funny', 'cozy'],
      fastAvoids: ['horror', 'long', 'obvious'],
      fastDiscovery: 'safe' as const,
    };

    expect(toFastPickApiFormat(person)).toMatchObject({
      name: 'You',
      favoriteMovie: '',
      favoriteMovieWhy:
        'Fast Pick intent: Funny, Cozy. Avoid: horror, long runtime, too obvious. Discovery appetite: Safe hit.',
      newVsClassic: 'Proven hits and familiar crowd-pleasers',
      moodPreference: ['Funny', 'Cozy'],
      tonePreference: 'Light and fun',
    });
  });
});
