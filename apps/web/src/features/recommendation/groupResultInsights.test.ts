import { describe, expect, it } from 'vitest';

import { buildGroupResultInsights, hasFavoriteActorSignal } from './groupResultInsights';

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
        favoriteMovie: 'Arrival',
        moodPreference: ['Comedy', 'Adventure'],
        tonePreference: 'Light and fun',
        newVsClassic: 'New',
        favoriteActor: 'Ryan Gosling',
      },
      {
        name: 'Sam',
        favoriteMovie: 'Paddington 2',
        moodPreference: ['Comedy', 'Thriller'],
        tonePreference: 'Balanced',
        newVsClassic: 'Both new and classic',
        favoriteActor: 'Michelle Yeoh',
      },
    ]);

    expect(result).toEqual({
      participantNames: ['Alex', 'Sam'],
      participantProfiles: [
        {
          name: 'Alex',
          favoriteMovie: 'Arrival',
          moodPreferences: ['Comedy', 'Adventure'],
          tonePreference: 'Light and fun',
          eraPreference: 'New',
        },
        {
          name: 'Sam',
          favoriteMovie: 'Paddington 2',
          moodPreferences: ['Comedy', 'Thriller'],
          tonePreference: 'Balanced',
          eraPreference: 'Both new and classic',
        },
      ],
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
      participantProfiles: [
        expect.objectContaining({ name: 'Person 1', favoriteMovie: null }),
        expect.objectContaining({ name: 'Person 2', favoriteMovie: null }),
        expect.objectContaining({ name: 'Mia', favoriteMovie: null }),
      ],
      sharedMoods: ['Drama'],
      tonePreferences: ['Serious', 'Balanced'],
    });
  });
});

describe('hasFavoriteActorSignal', () => {
  it('detects actor input for solo and group quiz data', () => {
    expect(hasFavoriteActorSignal({ favoriteActor: 'Amy Adams' })).toBe(true);
    expect(hasFavoriteActorSignal([{ favoriteActor: '' }, { favoriteActor: 'Tony Leung' }])).toBe(
      true,
    );
  });

  it('returns false when no actor was provided', () => {
    expect(hasFavoriteActorSignal({ favoriteMovie: 'Heat' })).toBe(false);
    expect(hasFavoriteActorSignal([{ favoriteActor: '   ' }, null])).toBe(false);
  });
});
