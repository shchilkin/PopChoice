import { RECOMMENDATION_JOB_OPTIONS, recommendationQueue } from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordRecommendationCompletion } from '@/lib/metrics';

import {
  completeRecommendationRecord,
  createRecommendationRecord,
  failRecommendationRecord,
  markRecommendationStage,
  markRecommendationProcessing,
} from './persistence';
import { runRecommendationPipeline } from './pipeline';

import type { ApiResponse, PersonFormData, RecommendationRequestBody } from './types';
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

  if (usesDeterministicE2ERecommendations()) {
    await completeDeterministicE2ERecommendation(recommendationId, allPeopleData);
    return created;
  }

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

export function usesDeterministicE2ERecommendations(): boolean {
  return process.env.E2E_DETERMINISTIC_RECOMMENDATIONS === '1';
}

async function completeDeterministicE2ERecommendation(
  recommendationId: string,
  allPeopleData: PersonFormData[],
): Promise<void> {
  logger.info({ recommendationId }, 'Completing recommendation with deterministic e2e fixture');
  const startTime = Date.now();
  await markRecommendationProcessing(recommendationId);
  await markRecommendationStage(recommendationId, 'complete');
  await completeRecommendationRecord(recommendationId, buildDeterministicE2EResult(allPeopleData));
  recordRecommendationCompletion({
    mode: 'deterministic_e2e',
    status: 'success',
    durationMs: Date.now() - startTime,
  });
}

function buildDeterministicE2EResult(allPeopleData: PersonFormData[]): ApiResponse {
  const primary = allPeopleData[0];
  const reference = primary?.favoriteMovie ? ` after your ${primary.favoriteMovie} cue` : '';

  return {
    title: 'PopChoice E2E Space Opera',
    description: `A deterministic e2e recommendation${reference}.`,
    usedBroaderSearch: false,
    dbMovieCount: 6,
    similarMovies: [
      {
        id: 1,
        tmdbId: 900001,
        name: 'PopChoice E2E Space Opera',
        year: 2024,
        similarity: 0.98,
        age_rating: 'PG-13',
        duration: 142,
        score_rating: 8.7,
        aiDescription:
          'A deterministic top pick for proving quiz submission, result rendering, and feedback.',
        localizedName: 'PopChoice E2E Space Opera',
        isMainRecommendation: true,
      },
      {
        id: 4,
        tmdbId: 900004,
        name: 'PopChoice E2E Family Adventure',
        year: 2018,
        similarity: 0.84,
        age_rating: 'G',
        duration: 101,
        score_rating: 8.1,
        aiDescription: 'A friendly alternate pick from the seeded e2e catalog.',
        localizedName: 'PopChoice E2E Family Adventure',
        isMainRecommendation: false,
      },
      {
        id: 3,
        tmdbId: 900003,
        name: 'PopChoice E2E Classic Drama',
        year: 1998,
        similarity: 0.79,
        age_rating: 'R',
        duration: 126,
        score_rating: 9.1,
        aiDescription: 'A stronger dramatic alternate for the seeded e2e catalog.',
        localizedName: 'PopChoice E2E Classic Drama',
        isMainRecommendation: false,
      },
    ],
  };
}

async function processInlineRecommendation(
  recommendationId: string,
  allPeopleData: PersonFormData[],
  locale: Locale,
  userId?: string,
): Promise<void> {
  const startTime = Date.now();
  try {
    await markRecommendationProcessing(recommendationId);
    const result = await runRecommendationPipeline(allPeopleData, locale, {
      onStageChange: (stage) => markRecommendationStage(recommendationId, stage),
      userId,
    });

    await completeRecommendationRecord(recommendationId, result);
    recordRecommendationCompletion({
      mode: 'async_inline',
      status: 'success',
      durationMs: Date.now() - startTime,
    });
    logger.info({ recommendationId }, 'Inline recommendation processing completed');
  } catch (err) {
    recordRecommendationCompletion({
      mode: 'async_inline',
      status: 'failure',
      durationMs: Date.now() - startTime,
    });
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, recommendationId }, 'Inline recommendation processing failed');
    await failRecommendationRecord(recommendationId, message).catch((dbErr) => {
      logger.error({ err: dbErr, recommendationId }, 'Failed to update recommendation status');
    });
  }
}
