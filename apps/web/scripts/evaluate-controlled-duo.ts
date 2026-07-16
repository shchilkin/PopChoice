import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  buildControlledDuoProtocolReport,
  runControlledDuoQualityEval,
} from '@/features/recommendation/evals/controlledDuoQuality';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutputPath = path.join(
  appRoot,
  'test-results/recommendation-evals/controlled-duo-report.json',
);
const appEnvPath = path.join(appRoot, '.env');

if (existsSync(appEnvPath)) {
  loadEnvFile(appEnvPath);
}

type CliOptions = {
  live: boolean;
  outputPath: string;
};

function printUsage(): void {
  console.log(`Usage: npm run eval:recommendations:duo -- [--live] [--output <path>]

Default mode validates the fixed Amélie + Mad Max: Fury Road protocol and makes zero provider calls.
Use --live only after explicit API-budget approval. Live mode makes one OpenAI ranking call, runs automated checks, and leaves subjective quality pending owner review.`);
}

function parseCliOptions(argv: string[]): CliOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { short: 'h', type: 'boolean' },
      live: { type: 'boolean' },
      output: { type: 'string' },
    },
    strict: true,
  });
  if (values.help) {
    printUsage();
    process.exit(0);
  }

  return {
    live: values.live ?? false,
    outputPath: values.output ? path.resolve(process.cwd(), values.output) : defaultOutputPath,
  };
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  assertLiveEnvironment(options);
  const report = await buildReport(options);
  await writeReport(options.outputPath, report);
  printReport(options.outputPath, report);
  setExitCode(report.status);
}

function assertLiveEnvironment(options: CliOptions): void {
  if (options.live && !process.env.OPENAI_API_KEY) {
    throw new Error('Live controlled Duo evaluation requires OPENAI_API_KEY.');
  }
}

function buildReport(options: CliOptions) {
  return options.live ? runControlledDuoQualityEval() : buildControlledDuoProtocolReport();
}

async function writeReport(
  outputPath: string,
  report: Awaited<ReturnType<typeof buildReport>>,
): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function printReport(outputPath: string, report: Awaited<ReturnType<typeof buildReport>>): void {
  console.log(
    `Controlled Duo evaluation (${report.mode}): ${report.status}. Provider calls: ${report.providerCallCount}. Report: ${outputPath}`,
  );
  if (report.reviewStatus === 'pending-owner-review') {
    console.log(
      'Automated checks passed. Subjective recommendation quality still needs owner review.',
    );
  }
}

function setExitCode(status: Awaited<ReturnType<typeof buildReport>>['status']): void {
  const failed = status === 'protocol-invalid' || status === 'automated-checks-failed';
  process.exitCode = failed ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
