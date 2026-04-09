import { describe, expect, it } from 'vitest';

import { applyQualityFilter, isWorthy } from './filter.js';

import type { TMDBMovie } from './tmdb.js';

const makeMovie = (overrides: Partial<TMDBMovie> = {}): TMDBMovie => ({
  id: 1,
  title: 'Test Movie',
  overview: 'A '.repeat(30), // 60 chars > 50 threshold
  release_date: '2023-01-01',
  vote_average: 7.0,
  vote_count: 1000,
  adult: false,
  genre_ids: [],
  original_language: 'en',
  popularity: 100,
  poster_path: null,
  backdrop_path: null,
  ...overrides,
});

describe('isWorthy', () => {
  const minVoteCount = 500;
  const minVoteAverage = 6.5;

  it('returns true for a quality movie', () => {
    expect(isWorthy(makeMovie(), minVoteCount, minVoteAverage)).toBe(true);
  });

  it('returns false when vote_count is too low', () => {
    expect(isWorthy(makeMovie({ vote_count: 100 }), minVoteCount, minVoteAverage)).toBe(false);
  });

  it('returns false when vote_count equals threshold (not strictly greater)', () => {
    expect(isWorthy(makeMovie({ vote_count: 500 }), minVoteCount, minVoteAverage)).toBe(false);
  });

  it('returns false when vote_average is too low', () => {
    expect(isWorthy(makeMovie({ vote_average: 5.0 }), minVoteCount, minVoteAverage)).toBe(false);
  });

  it('returns false when overview is too short', () => {
    expect(isWorthy(makeMovie({ overview: 'Short' }), minVoteCount, minVoteAverage)).toBe(false);
  });

  it('returns false when overview is empty', () => {
    expect(isWorthy(makeMovie({ overview: '' }), minVoteCount, minVoteAverage)).toBe(false);
  });

  it('returns false when overview is undefined/null', () => {
    expect(
      isWorthy(
        makeMovie({ overview: undefined as unknown as string }),
        minVoteCount,
        minVoteAverage,
      ),
    ).toBe(false);
  });
});

describe('applyQualityFilter', () => {
  const minVoteCount = 500;
  const minVoteAverage = 6.5;

  it('filters out low-quality movies', () => {
    const movies = [
      makeMovie({ id: 1 }), // quality
      makeMovie({ id: 2, vote_count: 100 }), // low votes
      makeMovie({ id: 3, vote_average: 4.0 }), // low rating
      makeMovie({ id: 4, overview: 'Too short' }), // short overview
    ];
    const result = applyQualityFilter(movies, minVoteCount, minVoteAverage);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns all movies if all meet thresholds', () => {
    const movies = [makeMovie({ id: 1 }), makeMovie({ id: 2 }), makeMovie({ id: 3 })];
    expect(applyQualityFilter(movies, minVoteCount, minVoteAverage)).toHaveLength(3);
  });

  it('returns empty array when no movies pass filter', () => {
    const movies = [makeMovie({ vote_count: 10 }), makeMovie({ vote_average: 2.0 })];
    expect(applyQualityFilter(movies, minVoteCount, minVoteAverage)).toHaveLength(0);
  });
});
