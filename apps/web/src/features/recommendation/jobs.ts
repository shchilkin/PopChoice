import { SpanStatusCode } from '@opentelemetry/api';

import {
  RECOMMENDATION_JOB_NAME,
  RECOMMENDATION_JOB_OPTIONS,
  recommendationQueue,
} from '@/lib/jobQueue';
import logger from '@/lib/logger';
import { recordRecommendationCompletion } from '@/lib/metrics';
import { getTraceCarrier, setActiveTraceAttributes, withTraceSpan } from '@/lib/tracing';

import {
  completeRecommendationRecord,
  createRecommendationRecord,
  failRecommendationRecord,
  markRecommendationStage,
  markRecommendationProcessing,
} from './persistence';
import { runRecommendationPipeline } from './pipeline';
import { resolveRecommendationSourceStrategy } from './sourceStrategyPolicy';

import type {
  ApiResponse,
  PersonFormData,
  RecommendationExperienceMode,
  RecommendationRequestBody,
  RecommendationSourceStrategy,
} from './types';
import type { Locale } from '@/lib/locale';

export type CreateRecommendationRunOptions = {
  experienceMode?: RecommendationExperienceMode;
  sourceStrategy?: RecommendationSourceStrategy;
  userId?: string;
};

export async function createAndStartRecommendation(
  quizData: RecommendationRequestBody,
  allPeopleData: PersonFormData[],
  locale: Locale,
  options: CreateRecommendationRunOptions = {},
): Promise<{ id: string; slug: string }> {
  const isDeterministic = usesDeterministicE2ERecommendations();
  const experienceMode =
    options.experienceMode ?? (isDeterministic ? 'curated-showcase' : 'normal-match');
  const sourceStrategy =
    options.sourceStrategy ??
    (isDeterministic
      ? 'curated-showcase'
      : resolveRecommendationSourceStrategy({
          experienceMode,
          people: allPeopleData,
        }).id);
  const created = await createRecommendationRecord(
    quizData,
    options.userId,
    sourceStrategy,
    experienceMode,
  );
  const recommendationId = created.id;
  const recommendationSlug = created.slug;

  setActiveTraceAttributes({
    'recommendation.experience_mode': experienceMode,
    'recommendation.id': recommendationId,
    'recommendation.slug': recommendationSlug,
    'recommendation.source_strategy': sourceStrategy,
  });
  logger.info(
    { experienceMode, recommendationId, recommendationSlug, sourceStrategy },
    'Recommendation row created',
  );

  if (isDeterministic) {
    await completeDeterministicE2ERecommendation(
      recommendationId,
      allPeopleData,
      experienceMode,
      sourceStrategy,
    );
    return created;
  }

  if (recommendationQueue) {
    const queue = recommendationQueue;
    try {
      await withTraceSpan(
        'recommendation.enqueue',
        {
          attributes: {
            'messaging.system': 'bullmq',
            'messaging.destination.name': 'recommendation',
            'messaging.operation.name': 'enqueue',
            'recommendation.experience_mode': experienceMode,
            'recommendation.id': recommendationId,
            'recommendation.slug': recommendationSlug,
            'recommendation.source_strategy': sourceStrategy,
          },
        },
        async (span) => {
          const job = await queue.add(
            RECOMMENDATION_JOB_NAME,
            {
              recommendationId,
              quizData,
              experienceMode,
              locale,
              sourceStrategy,
              userId: options.userId,
              trace: getTraceCarrier(),
            },
            RECOMMENDATION_JOB_OPTIONS,
          );
          span.setAttribute('job.id', String(job.id ?? 'unknown'));
          logger.info({ recommendationId, jobId: job.id }, 'Recommendation job enqueued');
        },
      );
    } catch (err) {
      logger.warn(
        { err, recommendationId },
        'Failed to enqueue recommendation job — falling back to inline processing',
      );
      void processInlineRecommendation(recommendationId, allPeopleData, locale, {
        experienceMode,
        sourceStrategy,
        userId: options.userId,
      });
    }
  } else {
    logger.warn('Recommendation queue unavailable (no Redis) — processing inline');
    void processInlineRecommendation(recommendationId, allPeopleData, locale, {
      experienceMode,
      sourceStrategy,
      userId: options.userId,
    });
  }

  return created;
}

export function usesDeterministicE2ERecommendations(): boolean {
  return process.env.E2E_DETERMINISTIC_RECOMMENDATIONS === '1';
}

async function completeDeterministicE2ERecommendation(
  recommendationId: string,
  allPeopleData: PersonFormData[],
  experienceMode: RecommendationExperienceMode,
  sourceStrategy: RecommendationSourceStrategy,
): Promise<void> {
  await withTraceSpan(
    'recommendation.process.deterministic_e2e',
    {
      attributes: {
        'recommendation.experience_mode': experienceMode,
        'recommendation.id': recommendationId,
        'recommendation.mode': 'deterministic_e2e',
        'recommendation.source_strategy': sourceStrategy,
      },
    },
    async () => {
      logger.info({ recommendationId }, 'Completing recommendation with deterministic e2e fixture');
      const startTime = Date.now();
      await markRecommendationProcessing(recommendationId);
      await markRecommendationStage(recommendationId, 'complete');
      await completeRecommendationRecord(
        recommendationId,
        buildDeterministicE2EResult(allPeopleData, experienceMode, sourceStrategy),
      );
      recordRecommendationCompletion({
        mode: 'deterministic_e2e',
        status: 'success',
        durationMs: Date.now() - startTime,
      });
    },
  );
}

function buildDeterministicE2EResult(
  allPeopleData: PersonFormData[],
  experienceMode: RecommendationExperienceMode,
  sourceStrategy: RecommendationSourceStrategy,
): ApiResponse {
  const primary = allPeopleData[0];
  const reference = primary?.favoriteMovie ? ` after your ${primary.favoriteMovie} cue` : '';

  return {
    title: 'The Matrix',
    description: `A deterministic e2e recommendation${reference}.`,
    experienceMode,
    sourceStrategy,
    usedBroaderSearch: false,
    dbMovieCount: 7,
    similarMovies: [
      {
        id: 1,
        tmdbId: 603,
        name: 'The Matrix',
        year: 1999,
        similarity: 0.98,
        age_rating: 'R',
        duration: 136,
        score_rating: 8.2,
        aiDescription:
          'A deterministic top pick for proving quiz submission, result rendering, posters, and feedback.',
        posterURL: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
        localizedName: 'The Matrix',
        isMainRecommendation: true,
      },
      {
        id: 2,
        tmdbId: 346648,
        name: 'Paddington 2',
        year: 2017,
        similarity: 0.84,
        age_rating: 'PG',
        duration: 104,
        score_rating: 7.8,
        aiDescription: 'A warm alternate pick from the seeded real-movie e2e catalog.',
        posterURL: 'https://image.tmdb.org/t/p/w500/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg',
        localizedName: 'Paddington 2',
        isMainRecommendation: false,
      },
      {
        id: 3,
        tmdbId: 496243,
        name: 'Parasite',
        year: 2019,
        similarity: 0.79,
        age_rating: 'R',
        duration: 132,
        score_rating: 8.5,
        aiDescription: 'A sharper dramatic alternate from the seeded real-movie e2e catalog.',
        posterURL: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
        localizedName: 'Parasite',
        isMainRecommendation: false,
      },
    ],
  };
}

async function processInlineRecommendation(
  recommendationId: string,
  allPeopleData: PersonFormData[],
  locale: Locale,
  options: CreateRecommendationRunOptions = {},
): Promise<void> {
  const sourceStrategy =
    options.sourceStrategy ??
    resolveRecommendationSourceStrategy({
      experienceMode: options.experienceMode,
      people: allPeopleData,
    }).id;
  const experienceMode = options.experienceMode ?? 'normal-match';
  await withTraceSpan(
    'recommendation.process.inline',
    {
      attributes: {
        'recommendation.experience_mode': experienceMode,
        'recommendation.id': recommendationId,
        'recommendation.mode': 'async_inline',
        'recommendation.source_strategy': sourceStrategy,
      },
    },
    async (span) => {
      const startTime = Date.now();
      try {
        await markRecommendationProcessing(recommendationId);
        const result = await runRecommendationPipeline(allPeopleData, locale, {
          onStageChange: async (stage) => {
            setActiveTraceAttributes({ 'recommendation.stage': stage });
            await markRecommendationStage(recommendationId, stage);
          },
          experienceMode,
          sourceStrategy,
          userId: options.userId,
        });

        await completeRecommendationRecord(recommendationId, result);
        recordRecommendationCompletion({
          mode: 'async_inline',
          status: 'success',
          durationMs: Date.now() - startTime,
        });
        logger.info({ recommendationId }, 'Inline recommendation processing completed');
      } catch (err) {
        if (err instanceof Error) {
          span.recordException(err);
          span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        } else {
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        }
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
    },
  );
}
