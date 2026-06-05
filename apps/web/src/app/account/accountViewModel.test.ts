import { describe, expect, it } from 'vitest';

import {
  filterMovieMemory,
  filterRecommendations,
  getMissingPosterItems,
  isSearchActive,
  mergeMovieMemoryPage,
  mergePosterLookups,
  normalizeAccountResponse,
  removeMovieMemoryItem,
} from './accountViewModel';

import type { AccountResponse, MovieMemorySummary, RecommendationSummary } from './accountTypes';

const baseRecommendation: RecommendationSummary = {
  slug: 'rec-1',
  status: 'completed',
  stage: 'done',
  createdAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:01:00.000Z',
  peopleCount: 2,
  movieName: 'Arrival',
  movieYear: 2016,
  posterURL: null,
  feedbackKind: null,
};

const baseMemory: MovieMemorySummary = {
  movieKey: 'tmdb:1',
  tmdbId: 1,
  movieName: 'Arrival',
  movieYear: 2016,
  posterURL: null,
  localizedName: null,
  kind: 'watched',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const account: AccountResponse = {
  user: { email: 'user@example.com' },
  recommendations: [baseRecommendation],
  movieMemory: [baseMemory],
  movieMemoryTotal: 1,
  movieMemoryNextOffset: 50,
};

const labels = {
  feedback: {
    useful: 'Useful',
    already_watched: 'Already watched',
    wrong_mood: 'Wrong mood',
    too_obvious: 'Too obvious',
    too_obscure: 'Too obscure',
    close: 'Close',
  },
  memoryKind: {
    watched: 'Watched',
    liked: 'Liked',
    not_interested: 'Not interested',
    wrong_mood: 'Wrong mood',
    not_seen: 'Not seen',
  },
  status: {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  },
};

describe('accountViewModel', () => {
  it('normalizes optional movie memory pagination fields', () => {
    expect(
      normalizeAccountResponse({
        ...account,
        movieMemoryTotal: undefined,
        movieMemoryNextOffset: undefined,
      }),
    ).toMatchObject({
      movieMemoryTotal: 1,
      movieMemoryNextOffset: null,
    });
  });

  it('finds movie memory rows that need poster or localized metadata', () => {
    const requested = new Set(['tmdb:2']);
    const items = [
      baseMemory,
      { ...baseMemory, movieKey: 'tmdb:2', posterURL: null },
      { ...baseMemory, movieKey: 'tmdb:3', posterURL: '/poster.jpg' },
    ];

    expect(getMissingPosterItems(items, 'en', requested).map(({ item }) => item.movieKey)).toEqual([
      'tmdb:1',
    ]);
    expect(getMissingPosterItems(items, 'fi', requested).map(({ item }) => item.movieKey)).toEqual([
      'tmdb:1',
      'tmdb:3',
    ]);
  });

  it('merges poster lookup results without overwriting existing metadata', () => {
    const merged = mergePosterLookups(
      [
        baseMemory,
        {
          ...baseMemory,
          movieKey: 'tmdb:2',
          localizedName: 'Existing',
          posterURL: '/existing.jpg',
        },
      ],
      [
        { id: 0, posterURL: '/arrival.jpg', localizedName: 'Saapuminen' },
        { id: 1, posterURL: '/new.jpg', localizedName: 'New' },
      ],
    );

    expect(merged[0]).toMatchObject({
      localizedName: 'Saapuminen',
      posterURL: '/arrival.jpg',
    });
    expect(merged[1]).toMatchObject({
      localizedName: 'Existing',
      posterURL: '/existing.jpg',
    });
  });

  it('deduplicates paged movie memory and preserves pagination metadata', () => {
    const merged = mergeMovieMemoryPage(account, {
      movieMemory: [
        baseMemory,
        { ...baseMemory, movieKey: 'tmdb:2', movieName: 'Heat', tmdbId: 2 },
      ],
      nextOffset: null,
      total: 2,
    });

    expect(merged.movieMemory.map((item) => item.movieKey)).toEqual(['tmdb:1', 'tmdb:2']);
    expect(merged.movieMemoryTotal).toBe(2);
    expect(merged.movieMemoryNextOffset).toBeNull();
  });

  it('removes a movie memory row and keeps total non-negative', () => {
    expect(removeMovieMemoryItem(account, 'tmdb:1').movieMemory).toEqual([]);
    expect(
      removeMovieMemoryItem({ ...account, movieMemoryTotal: 0 }, 'missing').movieMemoryTotal,
    ).toBe(0);
  });

  it('filters recommendations by feedback and search text', () => {
    const recommendations = [
      baseRecommendation,
      { ...baseRecommendation, slug: 'rec-2', movieName: 'Heat', feedbackKind: 'too_obvious' },
      { ...baseRecommendation, slug: 'rec-3', movieName: 'Alien', feedbackKind: 'useful' },
    ] satisfies RecommendationSummary[];

    expect(filterRecommendations(recommendations, '', 'not_interested', labels)).toHaveLength(1);
    expect(filterRecommendations(recommendations, 'Alien', 'rated', labels)).toHaveLength(1);
    expect(filterRecommendations(recommendations, 'missing', 'all', labels)).toEqual([]);
  });

  it('filters movie memory by kind and localized search text', () => {
    const items = [
      baseMemory,
      { ...baseMemory, movieKey: 'tmdb:2', kind: 'liked', localizedName: 'Saapuminen' },
    ] satisfies MovieMemorySummary[];

    expect(filterMovieMemory(items, '', 'liked', labels)).toHaveLength(1);
    expect(filterMovieMemory(items, 'Saapuminen', 'all', labels)).toHaveLength(1);
    expect(isSearchActive('  ')).toBe(false);
    expect(isSearchActive('arrival')).toBe(true);
  });
});
