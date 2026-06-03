import { describe, expect, it } from 'vitest';

import { recommendationEvalFixtures } from './fixtures';
import { runRecommendationEvals } from './runner';

describe('recommendation eval runner', () => {
  it('returns a reusable report for deterministic mock evals', async () => {
    const report = await runRecommendationEvals({ mode: 'mock' });

    expect(report).toMatchObject({
      mode: 'mock',
      passed: true,
      summary: {
        failed: 0,
        fixtureCount: recommendationEvalFixtures.length,
        passed: recommendationEvalFixtures.length,
      },
    });
    expect(report.results.every((result) => result.checks.length > 0)).toBe(true);
  });

  it('uses mock responses plus catalog checks for seeded real-data mode', async () => {
    await expect(
      runRecommendationEvals({ fixtures: [], mode: 'real-data' }),
    ).resolves.toMatchObject({
      mode: 'real-data',
      passed: true,
      summary: {
        failed: 0,
        fixtureCount: 0,
        passed: 0,
      },
    });
  });
});
