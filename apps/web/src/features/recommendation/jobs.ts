import { RECOMMENDATION_JOB_OPTIONS, recommendationQueue } from '@/lib/jobQueue';
import logger from '@/lib/logger';

import {
  completeRecommendationRecord,
  createRecommendationRecord,
  failRecommendationRecord,
  markRecommendationStage,
  markRecommendationProcessing,
} from './persistence';
import { runRecommendationPipeline } from './pipeline';

import type { PersonFormData, RecommendationRequestBody } from './types';
import type { Locale } from '@/lib/locale';

export async function createAndStartRecommendation(
  quizData: RecommendationRequestBody,
  allPeopleData: PersonFormData[],
  locale: Locale,
  userId?: string,
): Promise<{ id: string; slug: string }> {
  const created = await createRecommendationRecord(quizData, userId);
  const recommendationId = created.id;
  const recommendationSlug = created.slug;

  logger.info({ recommendationId, recommendationSlug }, 'Recommendation row created');

  if (recommendationQueue) {
    try {
      await recommendationQueue.add(
        'recommendation',
        { recommendationId, quizData, locale, userId },
        RECOMMENDATION_JOB_OPTIONS,
      );
      logger.info({ recommendationId }, 'Recommendation job enqueued');
    } catch (err) {
      logger.warn(
        { err, recommendationId },
        'Failed to enqueue recommendation job — falling back to inline processing',
      );
      void processInlineRecommendation(recommendationId, allPeopleData, locale, userId);
    }
  } else {
    logger.warn('Recommendation queue unavailable (no Redis) — processing inline');
    void processInlineRecommendation(recommendationId, allPeopleData, locale, userId);
  }

  return created;
}

async function processInlineRecommendation(
  recommendationId: string,
  allPeopleData: PersonFormData[],
  locale: Locale,
  userId?: string,
): Promise<void> {
  try {
    await markRecommendationProcessing(recommendationId);
    const result = await runRecommendationPipeline(allPeopleData, locale, {
      onStageChange: (stage) => markRecommendationStage(recommendationId, stage),
      userId,
    });

    await completeRecommendationRecord(recommendationId, result);
    logger.info({ recommendationId }, 'Inline recommendation processing completed');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, recommendationId }, 'Inline recommendation processing failed');
    await failRecommendationRecord(recommendationId, message).catch((dbErr) => {
      logger.error({ err: dbErr, recommendationId }, 'Failed to update recommendation status');
    });
  }
}
