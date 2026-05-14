import { describe, expect, it } from 'vitest';

import { buildGroupResultInsights } from './groupResultInsights';

describe('buildGroupResultInsights', () => {
  it('returns null for solo recommendations', () => {
    expect(
      buildGroupResultInsights({
        name: 'Solo',
        moodPreference: ['Comedy'],
        tonePreference: 'Light and fun',
      }),
    ).toBeNull();
  });

  it('summarizes shared and mixed group preferences', () => {
    const result = buildGroupResultInsights([
      {
        name: 'Alex',
        moodPreference: ['Comedy', 'Adventure'],
        tonePreference: 'Light and fun',
        newVsClassic: 'New',
        favoriteActor: 'Ryan Gosling',
      },
      {
        name: 'Sam',
        moodPreference: ['Comedy', 'Thriller'],
        tonePreference: 'Balanced',
        newVsClassic: 'Both new and classic',
        favoriteActor: 'Michelle Yeoh',
      },
    ]);

    expect(result).toEqual({
      participantNames: ['Alex', 'Sam'],
      sharedMoods: ['Comedy'],
      tonePreferences: ['Light and fun', 'Balanced'],
      eraPreferences: ['New', 'Both new and classic'],
      favoriteActors: ['Ryan Gosling', 'Michelle Yeoh'],
    });
  });

  it('falls back to participant labels and deduplicates repeated values', () => {
    const result = buildGroupResultInsights([
      { name: '', moodPreference: ['Drama'], tonePreference: 'Serious' },
      { moodPreference: ['drama', 'Comedy'], tonePreference: 'serious' },
      { name: 'Mia', moodPreference: ['Drama'], tonePreference: 'Balanced' },
    ]);

    expect(result).toMatchObject({
      participantNames: ['Person 1', 'Person 2', 'Mia'],
      sharedMoods: ['Drama'],
      tonePreferences: ['Serious', 'Balanced'],
    });
  });
});
