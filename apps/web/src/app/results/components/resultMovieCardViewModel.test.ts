import { describe, expect, it } from 'vitest';

import { en } from '@/i18n/locales/en';

import {
  buildResultMatchViewModel,
  buildResultMovieCardViewModel,
} from './resultMovieCardViewModel';

import type { MovieRecommendation } from '@/utils/client';

const movie: MovieRecommendation = {
  id: 101,
  name: 'Arrival',
  year: 2016,
  similarity: 0.91,
  age_rating: 'PG-13',
  duration: 116,
  score_rating: 8.1,
  posterURL: '/arrival.jpg',
  description: 'Language, memory, and grief.',
  localizedName: 'Arrival Localized',
};

describe('buildResultMovieCardViewModel', () => {
  it('builds display fields and metadata rows for a fully enriched movie', () => {
    const view = buildResultMovieCardViewModel(movie, en.results);

    expect(view.title).toBe('Arrival Localized');
    expect(view.posterUrl).toBe('/arrival.jpg');
    expect(view.hasPoster).toBe(true);
    expect(view.hasRating).toBe(true);
    expect(view.hasDuration).toBe(true);
    expect(view.hasScore).toBe(true);
    expect(view.durationWithUnit).toBe('116 min');
    expect(view.durationShort).toBe('116m');
    expect(view.rationaleLabel).toBe(en.results.whyThisFilmForYou);
    expect(view.overlayMetaItems.map((item) => item.kind)).toEqual([
      'text',
      'rating',
      'duration',
      'score',
    ]);
    expect(view.compactMetaItems.map((item) => item.label)).toEqual([
      '2016',
      'PG-13',
      '8.1',
      '116m',
    ]);
  });

  it('omits optional metadata when poster, rating, score, and duration are absent', () => {
    const view = buildResultMovieCardViewModel(
      {
        ...movie,
        age_rating: 'NR',
        duration: 0,
        posterURL: undefined,
        score_rating: undefined,
        description: undefined,
        localizedName: undefined,
      },
      en.results,
    );

    expect(view.title).toBe('Arrival');
    expect(view.hasPoster).toBe(false);
    expect(view.hasRating).toBe(false);
    expect(view.hasDuration).toBe(false);
    expect(view.hasScore).toBe(false);
    expect(view.hasDescription).toBe(false);
    expect(view.plainMetaItems).toEqual([{ kind: 'text', label: '2016' }]);
  });

  it('uses group and expanded rationale labels where requested', () => {
    const groupView = buildResultMovieCardViewModel(movie, en.results, { isGroup: true });
    const expandedView = buildResultMovieCardViewModel(movie, en.results, {
      rationaleVariant: 'expanded',
    });

    expect(groupView.rationaleLabel).toBe(en.results.whyThisFilmForGroup);
    expect(expandedView.rationaleLabel).toBe(en.results.whyThisFilm);
  });
});

describe('buildResultMatchViewModel', () => {
  it('formats accessible match labels from the similarity tier', () => {
    const match = buildResultMatchViewModel(0.56, en.results);

    expect(match.label).toBe(en.results.matchTiers.strong);
    expect(match.exactLabel).toContain('90');
    expect(match.color).toMatch(/^#/);
  });
});
