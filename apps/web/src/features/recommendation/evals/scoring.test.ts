import { describe, expect, it } from 'vitest';

import {
  recommendationEvalAudiences,
  recommendationEvalDepths,
  recommendationEvalFixtures,
  recommendationEvalScenarioMatrix,
  recommendationEvalSourceStrategies,
  recommendationEvalTasteControlFixtures,
} from './fixtures';
import { buildRecommendationEvalReport, scoreRecommendationEvalFixture } from './scoring';

describe('recommendation eval scoring', () => {
  it('passes the deterministic fixture responses', () => {
    const results = recommendationEvalFixtures.map((fixture) =>
      scoreRecommendationEvalFixture(fixture, fixture.mockResponse),
    );

    expect(results).toHaveLength(
      recommendationEvalScenarioMatrix.length + recommendationEvalTasteControlFixtures.length,
    );
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.every((result) => result.score === 100)).toBe(true);
  });

  it('covers the full audience, depth, and source strategy scenario matrix', () => {
    const actualScenarioKeys = new Set(
      recommendationEvalFixtures.map(
        (fixture) => `${fixture.audience}/${fixture.depth}/${fixture.sourceStrategy}`,
      ),
    );
    const expectedScenarioKeys = new Set(
      recommendationEvalAudiences.flatMap((audience) =>
        recommendationEvalDepths.flatMap((depth) =>
          recommendationEvalSourceStrategies.map(
            (sourceStrategy) => `${audience}/${depth}/${sourceStrategy}`,
          ),
        ),
      ),
    );

    expect(actualScenarioKeys).toEqual(expectedScenarioKeys);
    expect(recommendationEvalFixtures.length).toBeGreaterThanOrEqual(
      recommendationEvalAudiences.length *
        recommendationEvalDepths.length *
        recommendationEvalSourceStrategies.length,
    );
  });

  it('covers the 0.2.0 taste-control fixture scenarios', () => {
    expect(recommendationEvalTasteControlFixtures.map((fixture) => fixture.id)).toEqual([
      'taste-dark-sci-fi-no-horror',
      'taste-funny-date-night-not-obvious',
      'taste-group-no-long-runtime',
      'taste-surprise-no-gore',
      'taste-feedback-memory-repeat-avoidance',
    ]);

    for (const fixture of recommendationEvalTasteControlFixtures) {
      const result = scoreRecommendationEvalFixture(fixture, fixture.mockResponse);
      expect(result.passed).toBe(true);
      expect(result.checks.filter((check) => check.id.startsWith('taste-control-'))).toEqual([
        expect.objectContaining({ id: 'taste-control-hard-avoids', passed: true }),
        expect.objectContaining({ id: 'taste-control-discovery-appetite', passed: true }),
        expect.objectContaining({ id: 'taste-control-optional-reference', passed: true }),
        expect.objectContaining({ id: 'taste-control-feedback-memory', passed: true }),
      ]);
    }
  });

  it('requires scenario metadata to be represented in deterministic fixture responses', () => {
    const results = recommendationEvalFixtures
      .filter((fixture) => !fixture.id.startsWith('taste-'))
      .map((fixture) => scoreRecommendationEvalFixture(fixture, fixture.mockResponse));

    for (const result of results) {
      expect(
        result.checks
          .filter((check) => check.id.startsWith('scenario-'))
          .map((check) => ({ id: check.id, maxScore: check.maxScore, passed: check.passed })),
      ).toEqual([
        { id: 'scenario-audience-representation', maxScore: 0, passed: true },
        { id: 'scenario-depth-representation', maxScore: 0, passed: true },
        { id: 'scenario-source-strategy-representation', maxScore: 0, passed: true },
        { id: 'scenario-quality-thresholds', maxScore: 0, passed: true },
      ]);
    }
  });

  it('fails when the response does not represent the fixture audience', () => {
    const fixture = getFixture('solo', 'focused', 'curated-showcase');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      description:
        'A polished sci-fi adventure with big world-building, brisk momentum, and enough emotional stakes to satisfy a Matrix-inspired mood.',
    });

    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'scenario-audience-representation')?.passed,
    ).toBe(false);
  });

  it('fails when the response does not represent the fixture source strategy', () => {
    const fixture = getFixture('solo', 'focused', 'curated-showcase');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      similarMovies: fixture.mockResponse.similarMovies?.map((movie) => ({
        ...movie,
        source: 'tmdb-discover' as const,
      })),
      candidateSourceDistribution: { 'tmdb-discover': 3 },
      usedBroaderSearch: true,
    });

    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'scenario-source-strategy-representation')?.passed,
    ).toBe(false);
  });

  it('fails when the response does not represent the fixture depth', () => {
    const compromiseFixture = getFixture('group', 'compromise', 'hybrid-fast');
    const fixture = {
      ...compromiseFixture,
      expectations: {
        ...compromiseFixture.expectations,
        requiredExplanationTerms: [],
      },
    };
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      description:
        'A playful ensemble comedy with enough visual energy for the pair: it keeps the human charm upfront while still moving with bold, stylish rhythm.',
      similarMovies: fixture.mockResponse.similarMovies?.map((movie) => ({
        ...movie,
        aiDescription: movie.aiDescription?.replace('both ', ''),
      })),
    });

    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'scenario-depth-representation')?.passed,
    ).toBe(false);
  });

  it('fails when source and metadata quality thresholds are not met', () => {
    const fixture = getFixture('solo', 'focused', 'tmdb-first');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      candidateSourceDistribution: { curated: 3 },
      similarMovies: fixture.mockResponse.similarMovies?.map((movie) => ({
        ...movie,
        age_rating: '',
        duration: 0,
        source: 'curated' as const,
      })),
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'scenario-quality-thresholds')).toMatchObject(
      {
        passed: false,
      },
    );
  });

  it('fails when the main recommendation is outside the fixture candidates', () => {
    const fixture = getFixture('solo', 'focused', 'curated-showcase');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      title: 'Unknown Movie',
      similarMovies: [
        {
          id: 999,
          name: 'Unknown Movie',
          year: 2026,
          similarity: 0.99,
          age_rating: 'PG-13',
          duration: 100,
          score_rating: 7,
          isMainRecommendation: true,
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'candidate-validity')?.passed).toBe(false);
  });

  it('fails when the response repeats watched or rejected memory titles', () => {
    const fixture = getFixture('family', 'memory-aware', 'hybrid-fast');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      title: 'PopChoice E2E Classic Drama',
      similarMovies: [
        {
          age_rating: 'PG-13',
          duration: 126,
          id: 3,
          isMainRecommendation: true,
          name: 'PopChoice E2E Classic Drama',
          score_rating: 9.1,
          similarity: 0.99,
          year: 1998,
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'repeat-avoidance')?.passed).toBe(false);
  });

  it('fails when a hard-avoid candidate appears in a taste-control response', () => {
    const fixture = getFixtureById('taste-dark-sci-fi-no-horror');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      title: 'PopChoice E2E Haunted Starship',
      similarMovies: [
        {
          ...fixture.mockResponse.similarMovies![0]!,
          aiDescription: 'A horror-leaning space thriller with haunted corridors.',
          isMainRecommendation: true,
          name: 'PopChoice E2E Haunted Starship',
          year: 2022,
        },
        ...fixture.mockResponse.similarMovies!.slice(1),
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'taste-control-hard-avoids')).toMatchObject({
      passed: false,
    });
  });

  it('fails when a runtime hard avoid is ignored', () => {
    const fixture = getFixtureById('taste-group-no-long-runtime');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      similarMovies: [
        {
          ...fixture.mockResponse.similarMovies![0]!,
          duration: 188,
          name: 'PopChoice E2E Three-Hour Epic',
          year: 2009,
        },
        ...fixture.mockResponse.similarMovies!.slice(1),
      ],
      title: 'PopChoice E2E Three-Hour Epic',
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'taste-control-hard-avoids')).toMatchObject({
      passed: false,
    });
  });

  it('fails when an optional reference fixture still depends on a missing reference movie', () => {
    const fixture = getFixtureById('taste-dark-sci-fi-no-horror');
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      description:
        'For the solo viewer, this works because it follows the missing favorite movie reference movie and stays balanced.',
    });

    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'taste-control-optional-reference'),
    ).toMatchObject({
      passed: false,
    });
  });

  it('fails when feedback-derived memory expectations are not represented', () => {
    const fixture = getFixtureById('taste-feedback-memory-repeat-avoidance');
    const result = scoreRecommendationEvalFixture(
      {
        ...fixture,
        userMemories: fixture.userMemories.filter((memory) => memory.kind !== 'wrong_mood'),
      },
      fixture.mockResponse,
    );

    expect(result.passed).toBe(false);
    expect(
      result.checks.find((check) => check.id === 'taste-control-feedback-memory'),
    ).toMatchObject({
      passed: false,
    });
  });

  it('summarizes eval reports in a machine-readable shape', () => {
    const results = recommendationEvalFixtures.map((fixture) =>
      scoreRecommendationEvalFixture(fixture, fixture.mockResponse),
    );
    const report = buildRecommendationEvalReport(results, 'mock', '2026-05-23T00:00:00.000Z');

    expect(report).toMatchObject({
      generatedAt: '2026-05-23T00:00:00.000Z',
      mode: 'mock',
      passed: true,
      summary: {
        failed: 0,
        fixtureCount: recommendationEvalFixtures.length,
        passed: recommendationEvalFixtures.length,
      },
    });
  });
});

function getFixture(
  audience: (typeof recommendationEvalAudiences)[number],
  depth: (typeof recommendationEvalDepths)[number],
  sourceStrategy: (typeof recommendationEvalSourceStrategies)[number],
) {
  const fixture = recommendationEvalFixtures.find(
    (candidate) =>
      candidate.audience === audience &&
      candidate.depth === depth &&
      candidate.sourceStrategy === sourceStrategy,
  );
  if (!fixture) {
    throw new Error(`Missing eval fixture for ${audience}/${depth}/${sourceStrategy}`);
  }
  return fixture;
}

function getFixtureById(id: string) {
  const fixture = recommendationEvalFixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error(`Missing eval fixture ${id}`);
  return fixture;
}
