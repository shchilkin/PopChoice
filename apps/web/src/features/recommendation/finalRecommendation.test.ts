import { describe, expect, it } from 'vitest';

import {
  findCandidateByRecommendedTitle,
  resolveGuardedRecommendation,
} from './finalRecommendation';

import type { EnhancedMovieMatch } from './types';

function movie(overrides: Partial<EnhancedMovieMatch>): EnhancedMovieMatch {
  return {
    id: 1,
    name: 'Dark City',
    age_rating: 'R',
    description: 'A noir mystery.',
    duration: 100,
    score_rating: 7.6,
    year: 1998,
    similarity: 0.91,
    content: 'Dark City (1998) — A noir mystery.',
    ...overrides,
  };
}

describe('final recommendation guard', () => {
  it('matches a model title that includes the release year', () => {
    const candidates = [movie({ id: 1, name: 'Dark City', year: 1998 })];

    expect(findCandidateByRecommendedTitle(candidates, 'Dark City (1998)')?.name).toBe('Dark City');
  });

  it('preserves a recommendation when the title exists in the filtered candidate set', () => {
    const candidates = [movie({ id: 1, name: 'Dark City' })];

    const result = resolveGuardedRecommendation(
      { title: 'Dark City', description: 'Perfect for the mood.' },
      candidates,
      'en',
    );

    expect(result.title).toBe('Dark City');
    expect(result.description).toBe('Perfect for the mood.');
    expect(result.replacedOutOfSetTitle).toBe(false);
  });

  it('falls back to the strongest remaining candidate when the model returns a filtered title', () => {
    const candidates = [
      movie({ id: 2, name: 'Paprika', similarity: 0.93, year: 2006 }),
      movie({ id: 3, name: 'Dark City', similarity: 0.9 }),
    ];

    const result = resolveGuardedRecommendation(
      { title: 'The Matrix', description: 'The model picked a watched movie.' },
      candidates,
      'en',
    );

    expect(result.title).toBe('Paprika');
    expect(result.movie.id).toBe(2);
    expect(result.description).toContain('movie memory');
    expect(result.replacedOutOfSetTitle).toBe(true);
  });

  it('returns localized fallback copy', () => {
    const candidates = [movie({ id: 2, name: 'Паприка', similarity: 0.93 })];

    const result = resolveGuardedRecommendation(
      { title: 'Матрица', description: 'The model picked a watched movie.' },
      candidates,
      'ru',
    );

    expect(result.description).toContain('памяти о фильмах');
  });
});
