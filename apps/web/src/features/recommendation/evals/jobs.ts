import {
  createRecommendationEvalRun,
  ensureRecommendationEvalRunSchema,
  failRecommendationEvalRun,
  initDatabase,
  markRecommendationEvalRunQueued,
} from '@pop-choice/shared';

import {
  RECOMMENDATION_EVAL_JOB_NAMES,
  RECOMMENDATION_EVAL_JOB_OPTIONS,
  RECOMMENDATION_EVAL_QUEUE_NAME,
  recommendationEvalQueue,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { getTraceCarrier, withTraceSpan } from '@/lib/tracing';

import type { RecommendationEvalJobData } from '@/lib/jobQueue';
import type {
  RecommendationEvalRun,
  RecommendationEvalRunMode,
  RecommendationEvalRunSource,
} from '@pop-choice/shared';

export type NonLiveRecommendationEvalRunMode = Exclude<RecommendationEvalRunMode, 'live'>;

export interface EnqueueRecommendationEvalRunInput {
  actor?: string;
  appVersion?: string;
  gitSha?: string;
  mode?: NonLiveRecommendationEvalRunMode;
  requestedOptions?: Record<string, unknown>;
  source?: RecommendationEvalRunSource;
}

export interface EnqueueRecommendationEvalRunResult {
  jobId: string | null;
  queued: boolean;
  run: RecommendationEvalRun;
}

let databaseInitialized = false;
let schemaReadyPromise: Promise<void> | null = null;

function ensureEvalDatabase(): void {
  if (databaseInitialized) return;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to enqueue recommendation eval jobs');
  }

  initDatabase(databaseUrl);
  databaseInitialized = true;
}

async function ensureEvalSchema(): Promise<void> {
  ensureEvalDatabase();
  schemaReadyPromise ??= ensureRecommendationEvalRunSchema();
  await schemaReadyPromise;
}

export function getRecommendationEvalJobId(runId: string): string {
  return `recommendation-eval-${runId}`;
}

export async function enqueueRecommendationEvalRun(
  input: EnqueueRecommendationEvalRunInput = {},
): Promise<EnqueueRecommendationEvalRunResult> {
  const mode = input.mode ?? 'real-data';
  await ensureEvalSchema();

  const run = await createRecommendationEvalRun({
    actor: input.actor,
    appVersion: input.appVersion,
    gitSha: input.gitSha,
    mode,
    requestedOptions: input.requestedOptions ?? {},
    source: input.source ?? 'backoffice',
  });

  if (!recommendationEvalQueue) {
    const failedRun = await failRecommendationEvalRun({
      errorMessage: 'REDIS_URL is unavailable or the recommendation-evals queue is disabled.',
      runId: run.id,
      status: 'enqueue_failed',
    });
    return { jobId: null, queued: false, run: failedRun };
  }

  const queue = recommendationEvalQueue;
  const data: RecommendationEvalJobData = {
    mode,
    runId: run.id,
    trace: getTraceCarrier(),
    version: 1,
  };

  try {
    let jobId = getRecommendationEvalJobId(run.id);
    await withTraceSpan(
      'recommendation_eval.enqueue',
      {
        attributes: {
          'messaging.system': 'bullmq',
          'messaging.destination.name': RECOMMENDATION_EVAL_QUEUE_NAME,
          'messaging.operation.name': 'enqueue',
          'job.name': RECOMMENDATION_EVAL_JOB_NAMES.runRecommendationEval,
          'recommendation_eval.mode': mode,
          'recommendation_eval.run.id': run.id,
        },
      },
      async (span) => {
        const job = await queue.add(RECOMMENDATION_EVAL_JOB_NAMES.runRecommendationEval, data, {
          ...RECOMMENDATION_EVAL_JOB_OPTIONS,
          jobId,
        });
        jobId = String(job.id ?? jobId);
        span.setAttribute('job.id', jobId);
      },
    );

    const queuedRun = await markRecommendationEvalRunQueued({
      jobId,
      jobName: RECOMMENDATION_EVAL_JOB_NAMES.runRecommendationEval,
      queueName: RECOMMENDATION_EVAL_QUEUE_NAME,
      runId: run.id,
    });

    logger.info({ mode, runId: run.id, jobId }, 'Queued recommendation eval job');
    return { jobId, queued: true, run: queuedRun };
  } catch (error) {
    const failedRun = await failRecommendationEvalRun({
      errorMessage: error instanceof Error ? error.message : String(error),
      runId: run.id,
      status: 'enqueue_failed',
    });
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      recommendationEvalRun: failedRun,
    });
  }
}
