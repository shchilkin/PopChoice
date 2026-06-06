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

type CliArgHandler = (argv: string[], index: number, options: EvalCliOptions) => number;

const CLI_ARG_HANDLERS: Record<string, CliArgHandler> = {
  '--help': handleHelpArgument,
  '--live': handleLiveArgument,
  '--output': handleOutputArgument,
  '--real-data': handleRealDataArgument,
  '-h': handleHelpArgument,
};

function printUsage(): void {
  console.log(`Usage: npm run eval:recommendations -- [--real-data] [--live] [--output <path>]

Default mode uses deterministic mocked model responses and does not call OpenAI or TMDB.
Use --real-data after preparing a seeded database to validate catalog retrieval and candidate availability without live AI calls. This is not a full live recommendation eval.
Use --live only for explicit manual runs against configured providers and databases.`);
}

function parseCliOptions(argv: string[]): EvalCliOptions {
  const options: EvalCliOptions = { mode: 'mock', outputPath: defaultOutputPath };

  for (let index = 0; index < argv.length; index += 1) {
    index = parseCliArgument(argv, index, options);
  }

  return options;
}

function parseCliArgument(argv: string[], index: number, options: EvalCliOptions) {
  const arg = argv[index];
  const handler = CLI_ARG_HANDLERS[arg];

  if (handler) return handler(argv, index, options);

  throw new Error(`Unknown argument: ${arg}`);
}

function handleHelpArgument(_argv: string[], index: number) {
  printUsage();
  process.exit(0);
  return index;
}

function handleLiveArgument(_argv: string[], index: number, options: EvalCliOptions) {
  options.mode = 'live';
  return index;
}

function handleRealDataArgument(_argv: string[], index: number, options: EvalCliOptions) {
  options.mode = 'real-data';
  return index;
}

function handleOutputArgument(argv: string[], index: number, options: EvalCliOptions) {
  options.outputPath = resolveOutputPath(argv[index + 1]);
  return index + 1;
}

function resolveOutputPath(value: string | undefined) {
  if (!value) throw new Error('--output requires a path');
  return path.resolve(process.cwd(), value);
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const report = await runRecommendationEvals({ mode: options.mode });
  await writeReport(options.outputPath, report);
  printEvalReport(options, report);
  setExitCode(report.passed);
}

async function writeReport(
  outputPath: string,
  report: Awaited<ReturnType<typeof runRecommendationEvals>>,
) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function printEvalReport(
  options: EvalCliOptions,
  report: Awaited<ReturnType<typeof runRecommendationEvals>>,
) {
  printEvalSummary(options, report);
  for (const result of report.results) {
    printEvalResult(result);
  }
}

function printEvalSummary(
  options: EvalCliOptions,
  report: Awaited<ReturnType<typeof runRecommendationEvals>>,
) {
  console.log(
    `Recommendation evals (${options.mode}): ${report.summary.passed}/${report.summary.fixtureCount} passed. Report: ${options.outputPath}`,
  );
}

function printEvalResult(
  result: Awaited<ReturnType<typeof runRecommendationEvals>>['results'][number],
) {
  const status = result.passed ? 'PASS' : 'FAIL';
  console.log(`- ${status} ${result.fixtureId}: ${result.score}/${result.maxScore}`);
  result.checks.filter((check) => !check.passed).forEach(printFailedCheck);
}

function printFailedCheck(
  check: Awaited<ReturnType<typeof runRecommendationEvals>>['results'][number]['checks'][number],
) {
  console.log(`  - ${check.label}: ${check.details}`);
}

function setExitCode(passed: boolean) {
  process.exitCode = passed ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
