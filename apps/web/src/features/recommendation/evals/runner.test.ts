import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  closeDatabase: vi.fn(),
  getCatalogHealthReport: vi.fn(),
  getMoviesPage: vi.fn(),
  initDatabase: vi.fn(),
}));

vi.mock('@/features/movies/catalog', () => ({
  getMoviesPage: mocks.getMoviesPage,
}));

vi.mock('@pop-choice/shared', () => ({
  closeDatabase: mocks.closeDatabase,
  getCatalogHealthReport: mocks.getCatalogHealthReport,
  initDatabase: mocks.initDatabase,
}));

import { recommendationEvalFixtures } from './fixtures';
import { runRecommendationEvals } from './runner';

describe('recommendation eval runner', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/test');
    mocks.closeDatabase.mockResolvedValue(undefined);
    mocks.getCatalogHealthReport.mockResolvedValue({ issues: [] });
    mocks.getMoviesPage.mockImplementation(
      async (_page: number, _pageSize: number, filters: Record<string, unknown>) => {
        const fixture = recommendationEvalFixtures[0]!;
        const mainTitle = fixture.expectations.allowedMainTitles[0]!;
        const firstCandidate = fixture.candidates[0]!;
        const movies =
          filters && 'query' in filters
            ? [{ name: mainTitle, year: firstCandidate.year }]
            : fixture.candidates.map((movie) => ({ name: movie.name, year: movie.year }));

        return { movies, totalCount: movies.length };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

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

  it('does not close the shared database pool after real-data catalog checks', async () => {
    const report = await runRecommendationEvals({
      fixtures: [recommendationEvalFixtures[0]!],
      mode: 'real-data',
    });

    expect(report.summary.fixtureCount).toBe(1);
    expect(mocks.initDatabase).toHaveBeenCalledWith('postgres://localhost/test');
    expect(mocks.getCatalogHealthReport).toHaveBeenCalledWith({
      sampleLimit: 0,
      staleAfterDays: 180,
    });
    expect(mocks.closeDatabase).not.toHaveBeenCalled();
  });
});
