import { describe, expect, it } from 'vitest';

import { personFormDataSchema } from './types';

describe('personFormDataSchema', () => {
  it('keeps optional favorite actor input for recommendation context', () => {
    const result = personFormDataSchema.parse({
      favoriteMovie: 'Heat',
      newVsClassic: 'Both new and classic',
      moodPreference: ['Drama'],
      tonePreference: 'Serious',
      favoriteActor: 'Amy Adams',
    });

    expect(result.favoriteActor).toBe('Amy Adams');
  });

  it('omits blank favorite actor input', () => {
    const result = personFormDataSchema.parse({
      favoriteMovie: 'Heat',
      newVsClassic: 'Both new and classic',
      moodPreference: ['Drama'],
      tonePreference: 'Serious',
      favoriteActor: '   ',
    });

    expect(result.favoriteActor).toBeUndefined();
  });
});
