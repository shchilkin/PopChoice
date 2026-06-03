import { describe, expect, it } from 'vitest';

import { getTMDBFallbackDecision } from './helpers';

const strongLocalMovies = [{ similarity: 0.55 }, { similarity: 0.48 }, { similarity: 0.43 }];

const weakLocalMovies = [{ similarity: 0.15 }, { similarity: 0.2 }];

describe('recommendation retrieval policy helpers', () => {
  it('uses bounded TMDB fallback for hybrid-fast when local results are weak', () => {
    expect(getTMDBFallbackDecision('hybrid-fast', weakLocalMovies)).toEqual({
      reason: 'local-results-insufficient',
      shouldAttempt: true,
    });
  });

  it('does not use TMDB fallback for hybrid-fast when local results are sufficient', () => {
    expect(getTMDBFallbackDecision('hybrid-fast', strongLocalMovies)).toEqual({
      reason: 'local-results-sufficient',
      shouldAttempt: false,
    });
  });

  it('uses TMDB as the primary retrieval path for tmdb-first even when local results are strong', () => {
    expect(getTMDBFallbackDecision('tmdb-first', strongLocalMovies)).toEqual({
      reason: 'tmdb-first-primary',
      shouldAttempt: true,
    });
  });

  it('keeps curated and memory-aware local strategies inside local candidates', () => {
    expect(getTMDBFallbackDecision('curated-showcase', weakLocalMovies)).toEqual({
      reason: 'external-lookup-disabled',
      shouldAttempt: false,
    });
    expect(getTMDBFallbackDecision('memory-aware-local', weakLocalMovies)).toEqual({
      reason: 'external-lookup-disabled',
      shouldAttempt: false,
    });
  });
});
