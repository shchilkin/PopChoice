import { describe, expect, it } from 'vitest';

import { recommendationEvalFixtures } from './fixtures';
import { buildRecommendationEvalReport, scoreRecommendationEvalFixture } from './scoring';

describe('recommendation eval scoring', () => {
  it('passes the deterministic fixture responses', () => {
    const results = recommendationEvalFixtures.map((fixture) =>
      scoreRecommendationEvalFixture(fixture, fixture.mockResponse),
    );

    expect(results).toHaveLength(3);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.map((result) => result.score)).toEqual([100, 100, 100]);
  });

  it('fails when the main recommendation is outside the fixture candidates', () => {
    const fixture = recommendationEvalFixtures[0];
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
    const fixture = recommendationEvalFixtures[1];
    const result = scoreRecommendationEvalFixture(fixture, {
      ...fixture.mockResponse,
      title: 'PopChoice E2E Space Opera',
      similarMovies: [
        {
          id: 1,
          name: 'PopChoice E2E Space Opera',
          year: 2024,
          similarity: 0.99,
          age_rating: 'PG-13',
          duration: 142,
          score_rating: 8.7,
          isMainRecommendation: true,
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'repeat-avoidance')?.passed).toBe(false);
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
        fixtureCount: 3,
        passed: 3,
      },
    });
  });
});
