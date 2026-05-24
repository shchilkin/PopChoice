import {
  claimMorePicksRequest,
  getMorePicksExcludeIds,
  loadRecommendationQuizData,
  markMorePicksStatus,
  storeMorePicks,
} from '@/features/recommendation/morePicksPersistence';
import { MORE_PICKS_JOB_OPTIONS, morePicksQueue } from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { getTraceCarrier, setActiveTraceAttributes, withTraceSpan } from '@/lib/tracing';

import { runMorePicksPipeline } from './morePicksPipeline';

import type { Locale } from '@/lib/locale';

type ClaimedMorePicksRequest = NonNullable<Awaited<ReturnType<typeof claimMorePicksRequest>>>;

export async function processMorePicksRecommendation(params: {
  recommendationId: string;
  slug: string;
  locale: Locale;
  quizData?: unknown;
}): Promise<void> {
  const { recommendationId, slug, locale, quizData: providedQuizData } = params;

  await withTraceSpan(
    'recommendation.more_picks.process',
    {
      attributes: {
        'recommendation.id': recommendationId,
        'recommendation.slug': slug,
        'recommendation.stage': 'more-picks',
      },
    },
    async () => {
      await markMorePicksStatus(recommendationId, 'processing');

      try {
        const quizData = providedQuizData ?? (await loadRecommendationQuizData(recommendationId));
        if (!quizData) {
          throw new Error('Quiz data not found for recommendation');
        }

        const excludeIds = await getMorePicksExcludeIds(recommendationId);
        setActiveTraceAttributes({ 'recommendation.stage': 'more-picks-search' });
        const movies = await runMorePicksPipeline(quizData, excludeIds, 2, locale);

        await storeMorePicks(recommendationId, movies);
        await markMorePicksStatus(recommendationId, 'completed');

        logger.info(
          { recommendationId, slug, movieCount: movies.length },
          'More-picks processing completed',
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, recommendationId, slug }, 'More-picks processing failed');
        await markMorePicksStatus(recommendationId, 'failed', message).catch((dbErr) => {
          logger.error({ err: dbErr, recommendationId }, 'Failed to update more_picks_status');
        });
        throw err;
      }
    },
  );
}

export async function startMorePicksRequest(
  claimed: ClaimedMorePicksRequest,
  slug: string,
  locale: Locale,
): Promise<void> {
  const { recommendationId, quizData } = claimed;

  if (morePicksQueue) {
    const queue = morePicksQueue;
    try {
      await withTraceSpan(
        'recommendation.more_picks.enqueue',
        {
          attributes: {
            'messaging.system': 'bullmq',
            'messaging.destination.name': 'more-picks',
            'messaging.operation.name': 'enqueue',
            'recommendation.id': recommendationId,
            'recommendation.slug': slug,
          },
        },
        async (span) => {
          const job = await queue.add(
            'more-picks',
            { recommendationId, slug, locale, trace: getTraceCarrier() },
            MORE_PICKS_JOB_OPTIONS,
          );
          span.setAttribute('job.id', String(job.id ?? 'unknown'));
          logger.info({ recommendationId, slug, jobId: job.id }, 'More-picks job enqueued');
        },
      );
      return;
    } catch (err) {
      logger.warn(
        { err, recommendationId, slug },
        'Failed to enqueue more-picks job — falling back to inline processing',
      );
    }
  } else {
    logger.warn({ slug }, 'More-picks queue unavailable — running inline');
  }

  await processMorePicksRecommendation({ recommendationId, slug, locale, quizData }).catch(
    () => undefined,
  );
}
