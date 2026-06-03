import { recommendationEvalFixtures } from './fixtures';
import { buildRecommendationEvalReport, scoreRecommendationEvalFixture } from './scoring';

import type { ApiResponse } from '../types';
import type {
  RecommendationEvalCheck,
  RecommendationEvalFixture,
  RecommendationEvalReport,
  RecommendationEvalResult,
  RecommendationEvalRunMode,
} from './types';

export type RecommendationEvalRunnerOptions = {
  fixtures?: RecommendationEvalFixture[];
  mode?: RecommendationEvalRunMode;
};

export async function runRecommendationEvals(
  options: RecommendationEvalRunnerOptions = {},
): Promise<RecommendationEvalReport> {
  const mode = options.mode ?? 'mock';
  const fixtures = options.fixtures ?? recommendationEvalFixtures;
  const results: RecommendationEvalResult[] = [];

  for (const fixture of fixtures) {
    const response = await getRecommendationEvalFixtureResponse(fixture, mode);
    const scored = scoreRecommendationEvalFixture(fixture, response, mode);
    const result =
      mode === 'real-data'
        ? withAdditionalChecks(
            scored,
            await getCatalogRetrievalCandidateAvailabilityChecks(fixture),
          )
        : scored;
    results.push(result);
  }

  return buildRecommendationEvalReport(results, mode);
}

export async function getRecommendationEvalFixtureResponse(
  fixture: RecommendationEvalFixture,
  mode: RecommendationEvalRunMode,
): Promise<ApiResponse> {
  if (mode === 'mock' || mode === 'real-data') {
    return fixture.mockResponse;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Live recommendation evals require OPENAI_API_KEY.');
  }

  const [{ getRecommendationInputBlock }, { runRecommendationPipeline }] = await Promise.all([
    import('@/features/recommendation/input'),
    import('@/features/recommendation/pipeline'),
  ]);
  const inputBlock = await getRecommendationInputBlock(fixture.people);
  if (inputBlock) {
    throw new Error(`Fixture "${fixture.id}" was blocked by input moderation: ${inputBlock.error}`);
  }

  return runRecommendationPipeline(fixture.people, fixture.locale, {
    sourceStrategy: fixture.sourceStrategy,
  });
}

export async function getCatalogRetrievalCandidateAvailabilityChecks(
  fixture: RecommendationEvalFixture,
): Promise<RecommendationEvalCheck[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Catalog retrieval evals require DATABASE_URL.');
  }

  const { getMoviesPage } = await import('@/features/movies/catalog');
  const catalog = await getMoviesPage(1, 100, {});
  const catalogTitleYears = new Set(
    catalog.movies.map((movie) => `${movie.name.toLocaleLowerCase('en-US')}|${movie.year}`),
  );
  const missingCandidates = fixture.candidates.filter(
    (movie) => !catalogTitleYears.has(`${movie.name.toLocaleLowerCase('en-US')}|${movie.year}`),
  );

  const mainTitle = fixture.expectations.allowedMainTitles[0];
  const searchResult = mainTitle
    ? await getMoviesPage(1, 10, { query: mainTitle })
    : { movies: [], totalCount: 0 };
  const searchFound = mainTitle
    ? searchResult.movies.some((movie) => movie.name === mainTitle)
    : false;

  return [
    buildEvalCheck(
      'catalog-retrieval-connectivity',
      'Catalog retrieval connectivity',
      catalog.totalCount > 0,
      catalog.totalCount > 0
        ? `Retrieved ${catalog.totalCount} movies from the seeded catalog.`
        : 'Seeded catalog returned no movies.',
    ),
    buildEvalCheck(
      'catalog-candidate-availability',
      'Catalog candidate availability',
      missingCandidates.length === 0,
      missingCandidates.length === 0
        ? 'All fixture candidates exist in the seeded catalog.'
        : `Missing candidates: ${missingCandidates
            .map((movie) => `${movie.name} (${movie.year})`)
            .join(', ')}`,
    ),
    buildEvalCheck(
      'catalog-search-retrieval',
      'Catalog search retrieval',
      searchFound,
      searchFound
        ? `Catalog search retrieved expected main title "${mainTitle}".`
        : `Catalog search did not retrieve expected main title "${mainTitle}".`,
    ),
    await getCatalogMetadataQualityMetricsCheck(),
  ];
}

async function getCatalogMetadataQualityMetricsCheck(): Promise<RecommendationEvalCheck> {
  const { closeDatabase, getCatalogHealthReport, initDatabase } =
    await import('@pop-choice/shared');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Catalog metadata quality evals require DATABASE_URL.');
  }

  initDatabase(databaseUrl);
  const report = await getCatalogHealthReport({ sampleLimit: 0, staleAfterDays: 180 }).finally(
    async () => {
      await closeDatabase();
    },
  );
  const interestingIssues = report.issues
    .filter((issue) =>
      [
        'missing_age_rating',
        'missing_cast_metadata',
        'missing_director_metadata',
        'missing_genre_metadata',
        'missing_keyword_metadata',
        'missing_runtime',
        'missing_tmdb_id',
      ].includes(issue.key),
    )
    .map((issue) => `${issue.key}: ${issue.count}`)
    .join('; ');

  return buildEvalCheck(
    'catalog-metadata-quality-metrics',
    'Catalog metadata quality metrics',
    true,
    interestingIssues || 'No current catalog metadata quality gaps reported.',
  );
}

function buildEvalCheck(
  id: string,
  label: string,
  passed: boolean,
  details: string,
): RecommendationEvalCheck {
  return {
    details,
    id,
    label,
    maxScore: 0,
    passed,
    score: 0,
  };
}

function withAdditionalChecks(
  result: RecommendationEvalResult,
  checks: RecommendationEvalCheck[],
): RecommendationEvalResult {
  const allChecks = [...result.checks, ...checks];

  return {
    ...result,
    checks: allChecks,
    passed: result.score >= result.minPassingScore && allChecks.every((check) => check.passed),
  };
}
