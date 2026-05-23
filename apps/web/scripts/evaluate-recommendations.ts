import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

import { recommendationEvalFixtures } from '@/features/recommendation/evals/fixtures';
import {
  buildRecommendationEvalReport,
  scoreRecommendationEvalFixture,
} from '@/features/recommendation/evals/scoring';

import type {
  RecommendationEvalCheck,
  RecommendationEvalFixture,
  RecommendationEvalResult,
  RecommendationEvalRunMode,
} from '@/features/recommendation/evals/types';
import type { ApiResponse } from '@/features/recommendation/types';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutputPath = path.join(appRoot, 'test-results/recommendation-evals/report.json');
const appEnvPath = path.join(appRoot, '.env');

if (existsSync(appEnvPath)) {
  loadEnvFile(appEnvPath);
}

type EvalCliOptions = {
  mode: RecommendationEvalRunMode;
  outputPath: string;
};

function printUsage(): void {
  console.log(`Usage: npm run eval:recommendations -- [--real-data] [--live] [--output <path>]

Default mode uses deterministic mocked model responses and does not call OpenAI or TMDB.
Use --real-data after preparing a seeded database to validate catalog retrieval and candidate availability without live AI calls.
Use --live only for explicit manual runs against configured providers and databases.`);
}

function parseCliOptions(argv: string[]): EvalCliOptions {
  let mode: RecommendationEvalRunMode = 'mock';
  let outputPath = defaultOutputPath;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--live') {
      mode = 'live';
      continue;
    }
    if (arg === '--real-data') {
      mode = 'real-data';
      continue;
    }
    if (arg === '--output') {
      const value = argv[index + 1];
      if (!value) throw new Error('--output requires a path');
      outputPath = path.resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { mode, outputPath };
}

async function getFixtureResponse(
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

  return runRecommendationPipeline(fixture.people, fixture.locale);
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

async function getRealDataChecks(
  fixture: RecommendationEvalFixture,
): Promise<RecommendationEvalCheck[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error('Real-data recommendation evals require DATABASE_URL.');
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
      'real-data-catalog-connectivity',
      'Real-data catalog connectivity',
      catalog.totalCount > 0,
      catalog.totalCount > 0
        ? `Retrieved ${catalog.totalCount} movies from the seeded catalog.`
        : 'Seeded catalog returned no movies.',
    ),
    buildEvalCheck(
      'real-data-candidate-availability',
      'Real-data candidate availability',
      missingCandidates.length === 0,
      missingCandidates.length === 0
        ? 'All fixture candidates exist in the seeded catalog.'
        : `Missing candidates: ${missingCandidates
            .map((movie) => `${movie.name} (${movie.year})`)
            .join(', ')}`,
    ),
    buildEvalCheck(
      'real-data-catalog-retrieval',
      'Real-data catalog retrieval',
      searchFound,
      searchFound
        ? `Catalog search retrieved expected main title "${mainTitle}".`
        : `Catalog search did not retrieve expected main title "${mainTitle}".`,
    ),
  ];
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const results = [];

  for (const fixture of recommendationEvalFixtures) {
    const response = await getFixtureResponse(fixture, options.mode);
    const scored = scoreRecommendationEvalFixture(fixture, response, options.mode);
    const result =
      options.mode === 'real-data'
        ? withAdditionalChecks(scored, await getRealDataChecks(fixture))
        : scored;
    results.push(result);
  }

  const report = buildRecommendationEvalReport(results, options.mode);
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    `Recommendation evals (${options.mode}): ${report.summary.passed}/${report.summary.fixtureCount} passed. Report: ${options.outputPath}`,
  );
  for (const result of report.results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`- ${status} ${result.fixtureId}: ${result.score}/${result.maxScore}`);
    for (const check of result.checks) {
      if (!check.passed) {
        console.log(`  - ${check.label}: ${check.details}`);
      }
    }
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
