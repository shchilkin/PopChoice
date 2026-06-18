import { describe, expect, it } from 'vitest';

import {
  getTasteSignalsFromFeedbackPreferences,
  getTasteSignalsFromQuiz,
  summarizeTasteSignals,
} from './tasteSignals';

import type { PersonFormData } from './types';

const person = (overrides: Partial<PersonFormData> = {}): PersonFormData => ({
  name: 'Sam',
  favoriteMovie: 'Arrival',
  favoriteMovieWhy: 'Thoughtful sci-fi. Avoid: gore, three-hour runtime.',
  newVsClassic: 'Both new and classic',
  moodPreference: ['Sci-Fi', 'Reflective'],
  tonePreference: 'Tense but humane',
  favoriteActor: 'Amy Adams',
  ...overrides,
});

describe('tasteSignals', () => {
  it('maps quiz answers into reusable taste signals', () => {
    const signals = getTasteSignalsFromQuiz([person()]);

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'liked_movie',
          source: 'quiz',
          title: 'Arrival',
          participantName: 'Sam',
        }),
        expect.objectContaining({
          type: 'constraint',
          source: 'quiz',
          value: 'Both new and classic',
        }),
        expect.objectContaining({
          type: 'desired_trait',
          source: 'quiz',
          value: 'Sci-Fi',
        }),
        expect.objectContaining({
          type: 'desired_trait',
          source: 'quiz',
          value: 'Amy Adams',
        }),
        expect.objectContaining({
          type: 'avoid_trait',
          source: 'quiz',
          value: 'gore',
        }),
        expect.objectContaining({
          type: 'avoid_trait',
          source: 'quiz',
          value: 'three-hour runtime',
        }),
      ]),
    );
  });

  it('omits blank optional quiz signals', () => {
    const signals = getTasteSignalsFromQuiz([
      person({
        favoriteMovie: '   ',
        favoriteActor: '   ',
        favoriteMovieWhy: 'Avoid: no hard avoids.',
      }),
    ]);

    expect(signals.some((signal) => signal.type === 'liked_movie')).toBe(false);
    expect(signals).not.toContainEqual(expect.objectContaining({ value: 'no hard avoids' }));
  });

  it('maps feedback and memory rows into movie taste signals', () => {
    const signals = getTasteSignalsFromFeedbackPreferences([
      {
        kind: 'liked',
        movieKey: 'tmdb:603',
        tmdbId: 603,
        movieName: 'The Matrix',
        movieYear: 1999,
      },
      {
        kind: 'wrong_mood',
        movieName: 'Arrival',
        movieYear: 2016,
      },
      {
        kind: 'not_for_me',
        movieName: 'Moon',
        movieYear: 2009,
      },
      {
        kind: 'recently_recommended',
        movieKey: 'title:past-lives:2023',
        movieName: 'Past Lives',
        movieYear: 2023,
      },
      {
        kind: 'not_seen',
        movieName: 'Heat',
        movieYear: 1995,
      },
    ]);

    expect(signals).toEqual([
      expect.objectContaining({
        type: 'liked_movie',
        source: 'movie-memory',
        title: 'The Matrix',
        movieKey: 'tmdb:603',
      }),
      expect.objectContaining({
        type: 'wrong_mood_movie',
        source: 'feedback',
        title: 'Arrival',
        movieKey: 'title:arrival:2016',
      }),
      expect.objectContaining({
        type: 'not_interested_movie',
        source: 'feedback',
        title: 'Moon',
        movieKey: 'title:moon:2009',
      }),
      expect.objectContaining({
        type: 'seen_movie',
        source: 'recommendation-history',
        title: 'Past Lives',
        weight: 0.55,
      }),
    ]);
  });

  it('summarizes signal counts by type for logs and eval metadata', () => {
    expect(
      summarizeTasteSignals([
        ...getTasteSignalsFromQuiz([person()]),
        ...getTasteSignalsFromFeedbackPreferences([
          { kind: 'watched', movieName: 'Heat', movieYear: 1995 },
        ]),
      ]),
    ).toMatchObject({
      avoid_trait: 2,
      constraint: 1,
      desired_trait: 4,
      liked_movie: 1,
      seen_movie: 1,
    });
  });
});
