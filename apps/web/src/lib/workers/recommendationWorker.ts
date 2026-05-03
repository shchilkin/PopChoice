import { Worker } from 'bullmq';

import { runRecommendationPipeline } from '@/app/api/movie-recommendation/pipeline';
import { insertRecommendationMovies, updateRecommendationStatus } from '@/lib/db/recommendations';
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
      const { recommendationId, quizData, locale } = job.data;

      logger.info({ recommendationId, jobId: job.id }, 'Recommendation job started');

      // Mark as processing
      await updateRecommendationStatus(recommendationId, 'processing');

      try {
        const allPeopleData = Array.isArray(quizData) ? quizData : [quizData];

        // Run the full AI pipeline
        const result = await runRecommendationPipeline(allPeopleData, locale);

        // Persist movies
        const moviesToInsert = (result.similarMovies ?? []).map((m) => ({
          id: m.id,
          name: m.name,
          year: m.year,
          similarity: m.similarity,
          age_rating: m.age_rating,
          duration: m.duration,
          score_rating: m.score_rating,
          posterURL: m.posterURL,
          aiDescription: m.aiDescription,
          localizedName: m.localizedName,
          isMainRecommendation: m.isMainRecommendation ?? false,
          fromTMDB: m.fromTMDB ?? false,
        }));

        await insertRecommendationMovies(
          recommendationId,
          moviesToInsert,
          result.usedBroaderSearch ?? false,
          result.dbMovieCount,
        );

        // Mark as completed
        await updateRecommendationStatus(recommendationId, 'completed');

        logger.info(
          { recommendationId, jobId: job.id, movieCount: moviesToInsert.length },
          'Recommendation job completed',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, recommendationId, jobId: job.id }, 'Recommendation job failed');

        // Mark as failed — will be overwritten on retry, becomes permanent on last attempt
        await updateRecommendationStatus(recommendationId, 'failed', message).catch((dbErr) => {
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
