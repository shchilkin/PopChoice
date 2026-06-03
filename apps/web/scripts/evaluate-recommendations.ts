import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

import { runRecommendationEvals } from '@/features/recommendation/evals/runner';

import type { RecommendationEvalRunMode } from '@/features/recommendation/evals/types';

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
Use --real-data after preparing a seeded database to validate catalog retrieval and candidate availability without live AI calls. This is not a full live recommendation eval.
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

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const report = await runRecommendationEvals({ mode: options.mode });
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
