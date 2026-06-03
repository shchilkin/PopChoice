import { describe, expect, it } from 'vitest';

import {
  getOrderedCandidateSources,
  getRecommendationAudienceMode,
  resolveCandidateSourceStrategy,
  resolveRecommendationSourceStrategy,
} from './sourceStrategyPolicy';

describe('source strategy policy', () => {
  it('keeps curated showcase locked to curated records', () => {
    const policy = resolveCandidateSourceStrategy({
      audience: 'solo',
      experienceMode: 'curated-showcase',
    });

    expect(policy).toMatchObject({
      allowExternalLookup: false,
      id: 'curated-showcase',
      primarySources: ['curated'],
    });
  });

  it('uses a bounded hybrid source mix for fast solo picks', () => {
    const policy = resolveCandidateSourceStrategy({
      audience: 'solo',
      experienceMode: 'fast-pick',
    });

    expect(policy.id).toBe('hybrid-fast');
    expect(getOrderedCandidateSources(policy.id)).toEqual([
      'local-cache',
      'curated',
      'tmdb-discover',
      'jit-enriched',
    ]);
  });

  it('prefers TMDB-first discovery for normal and swipe solo modes', () => {
    expect(
      resolveCandidateSourceStrategy({
        audience: 'solo',
        experienceMode: 'normal-match',
      }).id,
    ).toBe('tmdb-first');
    expect(
      resolveCandidateSourceStrategy({
        audience: 'solo',
        experienceMode: 'taste-swipe',
      }).id,
    ).toBe('tmdb-first');
  });

  it('routes duo and group audiences through compromise-aware hybrid strategy', () => {
    expect(
      resolveCandidateSourceStrategy({
        audience: 'duo',
        experienceMode: 'normal-match',
      }),
    ).toMatchObject({
      id: 'compromise-hybrid',
      requiresParticipantOverlap: true,
    });
    expect(
      resolveCandidateSourceStrategy({
        audience: 'group',
        experienceMode: 'fast-pick',
      }).id,
    ).toBe('compromise-hybrid');
  });

  it('classifies solo, duo, and group audience size independently from source strategy', () => {
    const person = {
      favoriteMovie: 'Arrival',
      moodPreference: ['Thoughtful'],
      newVsClassic: 'Balanced',
      tonePreference: 'Smart',
    };

    expect(getRecommendationAudienceMode([person])).toBe('solo');
    expect(getRecommendationAudienceMode([person, person])).toBe('duo');
    expect(getRecommendationAudienceMode([person, person, person])).toBe('group');
  });

  it('resolves current recommendation runs to default normal-match source policy', () => {
    const person = {
      favoriteMovie: 'Arrival',
      moodPreference: ['Thoughtful'],
      newVsClassic: 'Balanced',
      tonePreference: 'Smart',
    };

    expect(resolveRecommendationSourceStrategy({ people: [person] }).id).toBe('tmdb-first');
    expect(resolveRecommendationSourceStrategy({ people: [person, person] }).id).toBe(
      'compromise-hybrid',
    );
  });
});
