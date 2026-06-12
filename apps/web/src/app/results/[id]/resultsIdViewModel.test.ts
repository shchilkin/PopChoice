import { describe, expect, it } from 'vitest';

import { RecommendationFetchError } from '@/hooks/useRecommendation';

import {
  getReadyResultsViewModel,
  getResultsClientRenderState,
  mapRecommendationMovies,
} from './resultsIdViewModel';

import type { RecommendationWithMovies } from '@/lib/db/recommendations';

const movie = {
  age_rating: 'PG-13',
  aiDescription: 'Because it fits.',
  duration: 120,
  fromTMDB: true,
  id: 1,
  isMainRecommendation: true,
  localizedName: 'Localized',
  name: 'Arrival',
  posterURL: '/poster.jpg',
  score_rating: 8.5,
  similarity: undefined,
  year: 2016,
};

function recommendation(
  overrides: Partial<RecommendationWithMovies> = {},
): RecommendationWithMovies {
  return {
    error: null,
    movies: [],
    stage: 'complete',
    status: 'completed',
    ...overrides,
  };
}

describe('resultsIdViewModel', () => {
  it('maps completed recommendation movies into client movie shape', () => {
    expect(mapRecommendationMovies(recommendation({ movies: [movie] }))).toEqual([
      {
        age_rating: 'PG-13',
        description: 'Because it fits.',
        duration: 120,
        fromTMDB: true,
        id: 1,
        isMainRecommendation: true,
        localizedName: 'Localized',
        name: 'Arrival',
        posterURL: '/poster.jpg',
        score_rating: 8.5,
        similarity: 0,
        year: 2016,
      },
    ]);
  });

  it('selects redirect, loading, empty, and ready render states', () => {
    expect(
      getResultsClientRenderState({ data: null, error: null, id: '', isError: false }),
    ).toEqual({ kind: 'redirect' });
    expect(
      getResultsClientRenderState({
        data: recommendation({ stage: 'ai-ranking', status: 'processing' }),
        error: null,
        id: 'abc',
        isError: false,
      }),
    ).toEqual({ kind: 'loading', status: 'processing', stage: 'ai-ranking' });
    expect(
      getResultsClientRenderState({
        data: recommendation(),
        error: null,
        id: 'abc',
        isError: false,
      }),
    ).toEqual({ kind: 'empty' });
    expect(
      getResultsClientRenderState({
        data: recommendation({ movies: [movie] }),
        error: null,
        id: 'abc',
        isError: false,
      }),
    ).toMatchObject({ kind: 'ready', movies: [{ name: 'Arrival' }] });
  });

  it('maps fetch errors to missing or failed states', () => {
    expect(
      getResultsClientRenderState({
        data: null,
        error: new RecommendationFetchError('missing', 404),
        id: 'abc',
        isError: true,
      }),
    ).toEqual({ kind: 'missing' });
    expect(
      getResultsClientRenderState({
        data: null,
        error: new Error('boom'),
        id: 'abc',
        isError: true,
      }),
    ).toEqual({ kind: 'failed' });
  });

  it('keeps result explanation signals in the ready view model', () => {
    const state = getResultsClientRenderState({
      data: recommendation({
        movies: [movie],
        resultSignals: {
          actorSignals: [],
          avoidSignals: ['long runtime'],
          eraSignals: ['Both new and classic'],
          hasReferenceMovie: false,
          moodSignals: ['Drama'],
          toneSignals: ['Balanced'],
        },
      }),
      error: null,
      id: 'abc',
      isError: false,
    });

    expect(state.kind).toBe('ready');
    if (state.kind !== 'ready') return;

    expect(getReadyResultsViewModel(state).resultSignals).toMatchObject({
      avoidSignals: ['long runtime'],
      moodSignals: ['Drama'],
    });
  });
});
