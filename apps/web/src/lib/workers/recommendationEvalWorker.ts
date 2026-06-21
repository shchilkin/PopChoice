import {
  completeRecommendationEvalRun,
  ensureRecommendationEvalRunSchema,
  failRecommendationEvalRun,
  fetchOpenAIUsageAndCosts,
  initDatabase,
  markRecommendationEvalRunProcessing,
} from '@pop-choice/shared';
import { Worker } from 'bullmq';

import { recommendationEvalFixtures } from '@/features/recommendation/evals/fixtures';
import { runRecommendationEvals } from '@/features/recommendation/evals/runner';
import {
  RECOMMENDATION_EVAL_JOB_NAMES,
  RECOMMENDATION_EVAL_JOB_OPTIONS,
  RECOMMENDATION_EVAL_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordQueueJobEvent } from '@/lib/metrics';
import { getOpenAIUsageSnapshotFromError, withOpenAIUsageTracking } from '@/lib/openaiUsageContext';
import { withTraceSpan } from '@/lib/tracing';

import type {
  RecommendationEvalCheck,
  RecommendationEvalFixture,
  RecommendationEvalReport,
  RecommendationEvalResult,
} from '@/features/recommendation/evals/types';
import type { RecommendationEvalJobData, RecommendationEvalJobName } from '@/lib/jobQueue';
import type { ObservedOpenAIUsageSnapshot } from '@/lib/openaiUsageContext';
import type { CompleteRecommendationEvalRunResultInput } from '@pop-choice/shared';
import type { Job, WorkerOptions } from 'bullmq';

type RecommendationEvalWorker = Worker<RecommendationEvalJobData, void, RecommendationEvalJobName>;

const DEFAULT_CONCURRENCY = 1;
const MAX_ATTEMPTS = RECOMMENDATION_EVAL_JOB_OPTIONS.attempts;

let schemaReadyPromise: Promise<void> | null = null;

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for recommendation eval jobs');
  }

  initDatabase(databaseUrl);
}

async function ensureEvalSchema(): Promise<void> {
  ensureDatabase();
  schemaReadyPromise ??= ensureRecommendationEvalRunSchema();
  await schemaReadyPromise;
}

function fixtureById(
  fixtures: RecommendationEvalFixture[],
): Map<string, RecommendationEvalFixture> {
  return new Map(fixtures.map((fixture) => [fixture.id, fixture]));
}

function checksToJson(checks: RecommendationEvalCheck[]): unknown[] {
  return checks.map((check) => ({ ...check }));
}

function resultToJson(result: RecommendationEvalResult): Record<string, unknown> {
  return {
    checks: checksToJson(result.checks),
    fixtureId: result.fixtureId,
    fixtureName: result.fixtureName,
    maxScore: result.maxScore,
    minPassingScore: result.minPassingScore,
    mode: result.mode,
    passed: result.passed,
    response: result.response,
    score: result.score,
  };
}

type ProviderUsageReport = {
  admin?: Record<string, unknown>;
  observed?: ObservedOpenAIUsageSnapshot;
  period?: {
    endTime: string;
    startTime: string;
  };
  provider: 'openai';
};

function reportToJson(
  report: RecommendationEvalReport,
  providerUsage?: ProviderUsageReport,
): Record<string, unknown> {
  return {
    generatedAt: report.generatedAt,
    maxScore: report.maxScore,
    minPassingScore: report.minPassingScore,
    mode: report.mode,
    passed: report.passed,
    providerUsage,
    results: report.results.map(resultToJson),
    summary: report.summary,
  };
}

function toStoredResults(
  report: RecommendationEvalReport,
): CompleteRecommendationEvalRunResultInput[] {
  const fixtures = fixtureById(recommendationEvalFixtures);

  return report.results.map((result) => {
    const fixture = fixtures.get(result.fixtureId);
    return {
      checks: checksToJson(result.checks),
      fixtureId: result.fixtureId,
      fixtureName: result.fixtureName,
      fixtureSnapshot: fixture ? { ...fixture, mockResponse: undefined } : {},
      maxScore: result.maxScore,
      minPassingScore: result.minPassingScore,
      passed: result.passed,
      response: result.response,
      result: resultToJson(result),
      score: result.score,
    };
  });
}

async function fetchProviderUsageReport(
  startTime: Date,
  endTime: Date,
  observed: ObservedOpenAIUsageSnapshot | null,
): Promise<ProviderUsageReport | undefined> {
  if (!observed && !process.env.OPENAI_ADMIN_API_KEY) return undefined;

  const report: ProviderUsageReport = {
    observed: observed ?? undefined,
    period: {
      endTime: endTime.toISOString(),
      startTime: startTime.toISOString(),
    },
    provider: 'openai',
  };

  const adminApiKey = process.env.OPENAI_ADMIN_API_KEY;
  if (!adminApiKey) {
    report.admin = {
      status: 'not_configured',
      message: 'OPENAI_ADMIN_API_KEY is not configured; exact billing cost was not fetched.',
    };
    return report;
  }

  try {
    const adminSummary = await fetchOpenAIUsageAndCosts({
      apiKey: adminApiKey,
      bucketWidth: '1h',
      endTime,
      startTime,
      usageCategories: ['completions', 'embeddings', 'moderations'],
    });
    report.admin = {
      status: 'available',
      summary: adminSummary,
      attribution: 'interval',
      note: 'Admin Costs API is aggregated by interval; concurrent OpenAI traffic in the same project/key may be included.',
    };
  } catch (error) {
    report.admin = {
      status: 'unavailable',
      error: error instanceof Error ? error.message : String(error),
    };
    logger.warn({ err: error }, 'Failed to fetch OpenAI usage/cost summary for eval run');
  }

  return report;
}

async function processRecommendationEvalJob(
  job: Job<RecommendationEvalJobData, void, RecommendationEvalJobName>,
): Promise<void> {
  if (job.name !== RECOMMENDATION_EVAL_JOB_NAMES.runRecommendationEval) {
    throw new Error(`Unsupported recommendation eval job: ${job.name}`);
  }

  await ensureEvalSchema();
  await markRecommendationEvalRunProcessing(job.data.runId);
  const runStartedAt = new Date();

  try {
    const { result: report, usage } =
      job.data.mode === 'live'
        ? await withOpenAIUsageTracking(() => runRecommendationEvals({ mode: job.data.mode }))
        : { result: await runRecommendationEvals({ mode: job.data.mode }), usage: null };
    const completedAt = new Date();
    const providerUsage =
      job.data.mode === 'live'
        ? await fetchProviderUsageReport(runStartedAt, completedAt, usage)
        : undefined;
    ensureDatabase();
    await completeRecommendationEvalRun({
      report: reportToJson(report, providerUsage),
      results: toStoredResults(report),
      runId: job.data.runId,
      summary: report.summary,
    });
    logger.info(
      {
        jobId: job.id,
        mode: job.data.mode,
        passed: report.passed,
        runId: job.data.runId,
        summary: report.summary,
      },
      'Recommendation eval job completed',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const endTime = new Date();
    const observedUsage = job.data.mode === 'live' ? getOpenAIUsageSnapshotFromError(error) : null;
    const providerUsage =
      job.data.mode === 'live'
        ? await fetchProviderUsageReport(runStartedAt, endTime, observedUsage)
        : undefined;
    ensureDatabase();
    await failRecommendationEvalRun({
      errorMessage: message,
      report: providerUsage ? { providerUsage } : undefined,
      runId: job.data.runId,
      status: 'failed',
    }).catch((statusError) => {
      logger.error(
        { err: statusError, runId: job.data.runId },
        'Failed to persist recommendation eval job failure',
      );
    });
    throw error;
  }
}

export function createRecommendationEvalWorker(
  options: Pick<WorkerOptions, 'autorun'> = {},
): RecommendationEvalWorker | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Recommendation eval worker is disabled.');
    return null;
  }

  const worker = new Worker<RecommendationEvalJobData, void, RecommendationEvalJobName>(
    RECOMMENDATION_EVAL_QUEUE_NAME,
    async (job) => {
      await withTraceSpan(
        'recommendation_eval.worker.process',
        {
          carrier: job.data.trace,
          attributes: {
            'messaging.destination.name': RECOMMENDATION_EVAL_QUEUE_NAME,
            'messaging.operation.name': 'process',
            'messaging.system': 'bullmq',
            'job.id': String(job.id ?? 'unknown'),
            'job.name': job.name,
            'recommendation_eval.mode': job.data.mode,
            'recommendation_eval.run.id': job.data.runId,
          },
        },
        async () => processRecommendationEvalJob(job),
      );
    },
    {
      ...options,
      connection,
      concurrency: parsePositiveIntEnv('RECOMMENDATION_EVAL_CONCURRENCY', DEFAULT_CONCURRENCY),
    },
  );

  worker.on('completed', (job) => {
    recordQueueJobEvent({
      event: 'completed',
      final: true,
      job: job.name,
      queue: RECOMMENDATION_EVAL_QUEUE_NAME,
    });
    logger.info({ jobId: job.id, runId: job.data.runId }, 'Recommendation eval job completed');
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    recordQueueJobEvent({
      event: 'failed',
      final: attemptsMade >= MAX_ATTEMPTS,
      job: job?.name ?? 'unknown',
      queue: RECOMMENDATION_EVAL_QUEUE_NAME,
    });
    logger.error(
      {
        attemptsMade,
        err,
        jobId: job?.id,
        maxAttempts: MAX_ATTEMPTS,
        runId: job?.data?.runId,
        willRetry: attemptsMade < MAX_ATTEMPTS,
      },
      'Recommendation eval job failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Recommendation eval worker encountered an unrecoverable error');
    process.exit(1);
  });

  void worker.waitUntilReady().catch((err) => {
    logger.error({ err }, 'Recommendation eval worker failed to initialize');
    process.exit(1);
  });

  return worker;
}
