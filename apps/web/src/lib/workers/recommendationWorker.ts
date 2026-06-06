import { type Job, Worker } from 'bullmq';

import {
  completeRecommendationRecord,
  failRecommendationRecord,
  markRecommendationStage,
  markRecommendationProcessing,
} from '@/features/recommendation/persistence';
import { runRecommendationPipeline } from '@/features/recommendation/pipeline';
import { resolveRecommendationSourceStrategy } from '@/features/recommendation/sourceStrategyPolicy';
import {
  RECOMMENDATION_JOB_OPTIONS,
  RECOMMENDATION_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordQueueJobEvent, recordRecommendationCompletion } from '@/lib/metrics';
import { setActiveTraceAttributes, withTraceSpan } from '@/lib/tracing';

import type { RecommendationJobData } from '@/lib/jobQueue';

const MAX_RECOMMENDATION_ATTEMPTS = RECOMMENDATION_JOB_OPTIONS.attempts;

type RecommendationPeopleData = Extract<RecommendationJobData['quizData'], unknown[]>;

// Imported dynamically by startWorkers.ts.
// fallow-ignore-next-line unused-export
export function createRecommendationWorker(): Worker<RecommendationJobData> | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Recommendation worker is disabled.');
    return null;
  }

  const worker = new Worker<RecommendationJobData>(
    RECOMMENDATION_QUEUE_NAME,
    processRecommendationJob,
    { connection },
  );

  worker.on('completed', recordRecommendationJobCompleted);

  worker.on('failed', recordRecommendationJobFailed);

  worker.on('error', (err) => {
    logger.error({ err }, 'Recommendation worker encountered an unrecoverable error');
    process.exit(1);
  });

  void worker.waitUntilReady().catch((err) => {
    logger.error({ err }, 'Recommendation worker failed to initialize');
    process.exit(1);
  });

  return worker;
}

async function processRecommendationJob(job: Job<RecommendationJobData>) {
  const context = getRecommendationJobContext(job);

  await withTraceSpan(
    'recommendation.worker.process',
    {
      carrier: job.data.trace,
      attributes: getRecommendationTraceAttributes(job, context),
    },
    () => runRecommendationJob(job, context),
  );
}

function getRecommendationJobContext(job: Job<RecommendationJobData>) {
  const { recommendationId, quizData, locale, userId } = job.data;
  const allPeopleData: RecommendationPeopleData = Array.isArray(quizData) ? quizData : [quizData];
  const experienceMode = job.data.experienceMode ?? 'normal-match';
  const sourceStrategy = getRecommendationSourceStrategy(job, allPeopleData, experienceMode);

  return { allPeopleData, experienceMode, locale, recommendationId, sourceStrategy, userId };
}

function getRecommendationSourceStrategy(
  job: Job<RecommendationJobData>,
  allPeopleData: RecommendationPeopleData,
  experienceMode: NonNullable<RecommendationJobData['experienceMode']>,
) {
  return (
    job.data.sourceStrategy ??
    resolveRecommendationSourceStrategy({
      experienceMode,
      people: allPeopleData,
    }).id
  );
}

function getRecommendationTraceAttributes(
  job: Job<RecommendationJobData>,
  context: ReturnType<typeof getRecommendationJobContext>,
) {
  return {
    'messaging.system': 'bullmq',
    'messaging.destination.name': RECOMMENDATION_QUEUE_NAME,
    'messaging.operation.name': 'process',
    'job.id': String(job.id ?? 'unknown'),
    'job.name': job.name,
    'recommendation.experience_mode': context.experienceMode,
    'recommendation.id': context.recommendationId,
    'recommendation.mode': 'async_worker',
    'recommendation.source_strategy': context.sourceStrategy,
  };
}

async function runRecommendationJob(
  job: Job<RecommendationJobData>,
  context: ReturnType<typeof getRecommendationJobContext>,
) {
  const startTime = Date.now();
  logger.info(
    { recommendationId: context.recommendationId, jobId: job.id },
    'Recommendation job started',
  );
  await markRecommendationProcessing(context.recommendationId);

  try {
    await completeRecommendationJob(job, context, startTime);
  } catch (err) {
    await failRecommendationJob(job, context.recommendationId, err, startTime);
    throw err;
  }
}

async function completeRecommendationJob(
  job: Job<RecommendationJobData>,
  context: ReturnType<typeof getRecommendationJobContext>,
  startTime: number,
) {
  const result = await runRecommendationPipeline(context.allPeopleData, context.locale, {
    onStageChange: async (stage) => {
      setActiveTraceAttributes({ 'recommendation.stage': stage });
      await markRecommendationStage(context.recommendationId, stage);
    },
    experienceMode: context.experienceMode,
    sourceStrategy: context.sourceStrategy,
    userId: context.userId,
  });

  const movieCount = await completeRecommendationRecord(context.recommendationId, result);

  logger.info(
    { recommendationId: context.recommendationId, jobId: job.id, movieCount },
    'Recommendation job completed',
  );
  recordRecommendationCompletionEvent('success', startTime);
}

async function failRecommendationJob(
  job: Job<RecommendationJobData>,
  recommendationId: string,
  err: unknown,
  startTime: number,
) {
  recordRecommendationCompletionEvent('failure', startTime);
  logger.error({ err, recommendationId, jobId: job.id }, 'Recommendation job failed');
  await markRecommendationFailed(recommendationId, err);
}

async function markRecommendationFailed(recommendationId: string, err: unknown) {
  await failRecommendationRecord(recommendationId, getErrorMessage(err)).catch((dbErr) => {
    logger.error({ err: dbErr, recommendationId }, 'Failed to update recommendation status');
  });
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function recordRecommendationCompletionEvent(status: 'failure' | 'success', startTime: number) {
  recordRecommendationCompletion({
    mode: 'async_worker',
    status,
    durationMs: Date.now() - startTime,
  });
}

function recordRecommendationJobCompleted(job: {
  data: RecommendationJobData;
  id?: string;
  name: string;
}) {
  recordQueueJobEvent({
    event: 'completed',
    final: true,
    job: job.name,
    queue: RECOMMENDATION_QUEUE_NAME,
  });
  logger.info(
    { jobId: job.id, recommendationId: job.data.recommendationId },
    'Recommendation job completed successfully',
  );
}

function recordRecommendationJobFailed(
  job:
    | { attemptsMade: number; data?: RecommendationJobData; id?: string; name: string }
    | undefined,
  err: Error,
) {
  const attemptsMade = getRecommendationAttemptsMade(job);
  recordQueueJobEvent({
    event: 'failed',
    final: isFinalRecommendationAttempt(attemptsMade),
    job: getRecommendationJobName(job),
    queue: RECOMMENDATION_QUEUE_NAME,
  });
  logger.error(
    getRecommendationFailureLogData(job, err, attemptsMade),
    'Recommendation job failed',
  );
}

function getRecommendationAttemptsMade(job: { attemptsMade: number } | undefined) {
  return job?.attemptsMade ?? 0;
}

function isFinalRecommendationAttempt(attemptsMade: number) {
  return attemptsMade >= MAX_RECOMMENDATION_ATTEMPTS;
}

function getRecommendationJobName(job: { name: string } | undefined) {
  return job?.name ?? 'unknown';
}

function getRecommendationFailureLogData(
  job: { data?: RecommendationJobData; id?: string } | undefined,
  err: Error,
  attemptsMade: number,
) {
  return {
    attemptsMade,
    err,
    jobId: job?.id,
    maxAttempts: MAX_RECOMMENDATION_ATTEMPTS,
    recommendationId: job?.data?.recommendationId,
    willRetry: attemptsMade < MAX_RECOMMENDATION_ATTEMPTS,
  };
}
