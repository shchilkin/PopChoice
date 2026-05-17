import { Worker } from 'bullmq';

import {
  completeRecommendationRecord,
  failRecommendationRecord,
  markRecommendationStage,
  markRecommendationProcessing,
} from '@/features/recommendation/persistence';
import { runRecommendationPipeline } from '@/features/recommendation/pipeline';
import {
  RECOMMENDATION_JOB_OPTIONS,
  RECOMMENDATION_QUEUE_NAME,
  createBullMQConnection,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';

import type { RecommendationJobData } from '@/lib/jobQueue';

const MAX_RECOMMENDATION_ATTEMPTS = RECOMMENDATION_JOB_OPTIONS.attempts;

export function createRecommendationWorker(): Worker<RecommendationJobData> | null {
  const connection = createBullMQConnection();
  if (!connection) {
    logger.warn('REDIS_URL not set. Recommendation worker is disabled.');
    return null;
  }

  const worker = new Worker<RecommendationJobData>(
    RECOMMENDATION_QUEUE_NAME,
    async (job) => {
      const { recommendationId, quizData, locale, userId } = job.data;

      logger.info({ recommendationId, jobId: job.id }, 'Recommendation job started');

      // Mark as processing
      await markRecommendationProcessing(recommendationId);

      try {
        const allPeopleData = Array.isArray(quizData) ? quizData : [quizData];

        // Run the full AI pipeline
        const result = await runRecommendationPipeline(allPeopleData, locale, {
          onStageChange: (stage) => markRecommendationStage(recommendationId, stage),
          userId,
        });

        const movieCount = await completeRecommendationRecord(recommendationId, result);

        logger.info(
          { recommendationId, jobId: job.id, movieCount },
          'Recommendation job completed',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, recommendationId, jobId: job.id }, 'Recommendation job failed');

        // Mark as failed — will be overwritten on retry, becomes permanent on last attempt
        await failRecommendationRecord(recommendationId, message).catch((dbErr) => {
          logger.error({ err: dbErr, recommendationId }, 'Failed to update recommendation status');
        });

        // Rethrow so BullMQ handles retries
        throw err;
      }
    },
    { connection },
  );

  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, recommendationId: job.data.recommendationId },
      'Recommendation job completed successfully',
    );
  });

  worker.on('failed', (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    logger.error(
      {
        err,
        jobId: job?.id,
        recommendationId: job?.data?.recommendationId,
        attemptsMade,
        maxAttempts: MAX_RECOMMENDATION_ATTEMPTS,
        willRetry: attemptsMade < MAX_RECOMMENDATION_ATTEMPTS,
      },
      'Recommendation job failed',
    );
  });

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
