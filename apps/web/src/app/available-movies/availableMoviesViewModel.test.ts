import { describe, expect, it, vi } from 'vitest';

import {
  applyQuickMovieFilter,
  buildMoviesCacheKey,
  buildMoviesUrl,
  cloneEmptyMovieFilters,
  generatePageNumbers,
  getActiveMovieFilterCount,
  getMoviesPageSummary,
  hasActiveMovieFilters,
  isQuickMovieFilterActive,
  normalizeMovieFilters,
  toggleAgeRatingFilter,
} from './availableMoviesViewModel';

import type { MovieFilters } from './availableMoviesViewModel';

vi.mock('@/lib/csrfClient', () => ({
  getCsrfToken: () => 'csrf-token',
}));

const emptyFilters = cloneEmptyMovieFilters();

function makeFilters(overrides: Partial<MovieFilters> = {}): MovieFilters {
  return { ...emptyFilters, ...overrides };
}

describe('available movies view model', () => {
  it('builds stable API URLs and cache keys from trimmed filters', () => {
    const filters = makeFilters({
      ageRatings: ['PG-13', 'R'],
      duration: '90-120',
      minScore: ' 8 ',
      query: ' Nolan ',
      yearFrom: ' 2000 ',
      yearTo: '2020',
    });

    expect(buildMoviesUrl(2, 50, filters)).toBe(
      '/api/movies?page=2&pageSize=50&query=Nolan&yearFrom=2000&yearTo=2020&duration=90-120&minScore=8&ageRatings=PG-13%2CR',
    );
    expect(buildMoviesCacheKey(2, filters)).toBe(
      JSON.stringify([2, 'Nolan', '2000', '2020', '90-120', '8', ['PG-13', 'R']]),
    );
  });

  it('normalizes and detects active filters', () => {
    expect(hasActiveMovieFilters(emptyFilters)).toBe(false);
    expect(normalizeMovieFilters(makeFilters({ query: ' Kurosawa ', yearFrom: ' 1950 ' }))).toEqual(
      makeFilters({ query: 'Kurosawa', yearFrom: '1950' }),
    );
    expect(hasActiveMovieFilters(makeFilters({ minScore: '7' }))).toBe(true);
    expect(
      getActiveMovieFilterCount(
        makeFilters({ query: 'Nolan', yearFrom: '2000', yearTo: '2020', minScore: '8' }),
      ),
    ).toBe(3);
  });

  it('toggles age ratings without mutating the original filters', () => {
    const selected = toggleAgeRatingFilter(emptyFilters, 'PG-13');
    const cleared = toggleAgeRatingFilter(selected, 'PG-13');

    expect(selected.ageRatings).toEqual(['PG-13']);
    expect(cleared.ageRatings).toEqual([]);
    expect(emptyFilters.ageRatings).toEqual([]);
  });

  it('applies quick filters as real catalog filters', () => {
    const topRated = applyQuickMovieFilter(emptyFilters, 'topRated');
    const family = applyQuickMovieFilter(emptyFilters, 'family');

    expect(topRated.minScore).toBe('8');
    expect(isQuickMovieFilterActive(topRated, 'topRated')).toBe(true);
    expect(applyQuickMovieFilter(topRated, 'topRated').minScore).toBe('');
    expect(family.ageRatings).toEqual(['G', 'PG']);
    expect(isQuickMovieFilterActive(family, 'family')).toBe(true);
  });

  it('generates compact pagination numbers', () => {
    expect(generatePageNumbers(1, 1)).toEqual([]);
    expect(generatePageNumbers(5, 10)).toEqual([1, '...', 3, 4, 5, 6, 7, '...', 10]);
    expect(generatePageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('formats loading, empty, and result summaries', () => {
    const base = {
      currentPage: 2,
      noMoviesFoundText: 'No movies',
      pageSize: 50,
      showingText: 'Showing {start}-{end} of {total}',
    };

    expect(getMoviesPageSummary({ ...base, loading: true, totalCount: 80 })).toBe('');
    expect(getMoviesPageSummary({ ...base, loading: false, totalCount: 0 })).toBe('No movies');
    expect(getMoviesPageSummary({ ...base, loading: false, totalCount: 80 })).toBe(
      'Showing 51-80 of 80',
    );
  });
});
