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
  RecommendationEvalFixture,
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
  console.log(`Usage: npm run eval:recommendations -- [--live] [--output <path>]

Default mode uses deterministic mocked model responses and does not call OpenAI or TMDB.
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
  if (mode === 'mock') {
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

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const results = [];

  for (const fixture of recommendationEvalFixtures) {
    const response = await getFixtureResponse(fixture, options.mode);
    results.push(scoreRecommendationEvalFixture(fixture, response, options.mode));
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
