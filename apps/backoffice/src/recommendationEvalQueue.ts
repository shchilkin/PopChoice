import { type Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { logger } from '@pop-choice/shared';

import { redisOptionsFromUrl } from './lib/redisConnection';

const RECOMMENDATION_EVAL_QUEUE_NAME = 'recommendation-evals';
const RECOMMENDATION_EVAL_JOB_NAME = 'run-recommendation-eval';

const RECOMMENDATION_EVAL_JOB_OPTIONS = {
  attempts: 2,
  backoff: { type: 'exponential' as const, delay: 3000 },
  removeOnComplete: 100,
  removeOnFail: 100,
  timeout: 120_000,
};

export type BackofficeRecommendationEvalMode = 'mock' | 'real-data' | 'live';

export interface EnqueueRecommendationEvalInput {
  runId: string;
  mode: BackofficeRecommendationEvalMode;
}

export interface EnqueueRecommendationEvalResult {
  queueName: string;
  jobName: string;
  jobId: string;
}

type RecommendationEvalJobData = {
  version: 1;
  runId: string;
  mode: BackofficeRecommendationEvalMode;
};
type RecommendationEvalJobName = typeof RECOMMENDATION_EVAL_JOB_NAME;
type RecommendationEvalJob = Job<RecommendationEvalJobData, void, RecommendationEvalJobName>;

let redisConnection: Redis | null = null;
let recommendationEvalQueue: Queue<RecommendationEvalJob> | null = null;

function toBullMQJobIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

function getRecommendationEvalQueue(
  redisUrl: string | undefined,
): Queue<RecommendationEvalJob> | null {
  if (recommendationEvalQueue) return recommendationEvalQueue;
  if (!redisUrl) return null;

  redisConnection = new Redis(redisOptionsFromUrl(redisUrl, { maxRetriesPerRequest: null }));
  redisConnection.on('error', (error) => {
    logger.error('Backoffice recommendation eval Redis client error', { err: error });
  });

  recommendationEvalQueue = new Queue<RecommendationEvalJob>(RECOMMENDATION_EVAL_QUEUE_NAME, {
    connection: redisConnection,
  });
  return recommendationEvalQueue;
}

export function getRecommendationEvalJobId(runId: string): string {
  return `recommendation-eval-${toBullMQJobIdPart(runId)}`;
}

export async function enqueueRecommendationEvalFromBackoffice(
  input: EnqueueRecommendationEvalInput,
  redisUrl = process.env.REDIS_URL,
): Promise<EnqueueRecommendationEvalResult | null> {
  const queue = getRecommendationEvalQueue(redisUrl);
  if (!queue) return null;

  const jobId = getRecommendationEvalJobId(input.runId);
  const job = await queue.add(
    RECOMMENDATION_EVAL_JOB_NAME,
    {
      mode: input.mode,
      runId: input.runId,
      version: 1,
    },
    {
      ...RECOMMENDATION_EVAL_JOB_OPTIONS,
      jobId,
    },
  );

  return {
    jobId: String(job.id ?? jobId),
    jobName: RECOMMENDATION_EVAL_JOB_NAME,
    queueName: RECOMMENDATION_EVAL_QUEUE_NAME,
  };
}
