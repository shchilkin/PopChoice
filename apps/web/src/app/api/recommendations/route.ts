import { NextRequest, NextResponse } from 'next/server';

import { runRecommendationPipeline } from '@/app/api/movie-recommendation/pipeline';
import { requestBodySchema } from '@/app/api/movie-recommendation/types';
import {
  createRecommendation,
  insertRecommendationMovies,
  updateRecommendationStatus,
} from '@/lib/db/recommendations';
import { RECOMMENDATION_JOB_OPTIONS, recommendationQueue } from '@/lib/jobQueue';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { withAuth } from '@/lib/withAuth';
import {
  ALWAYS_BLOCK_CATEGORIES,
  checkForPromptInjection,
  judgeForMoviePlatform,
  moderateInput,
} from '@/utils/ai/moderation';

import type { PersonFormData } from '@/app/api/movie-recommendation/types';
import type { Locale } from '@/lib/locale';

// ---------------------------------------------------------------------------
// POST /api/recommendations — create a new recommendation job
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate request body
  const parsed = requestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request data',
        details: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      { status: 400 },
    );
  }

  const validatedBody = parsed.data;
  const locale = parseLocaleFromRequest(req);

  const allPeopleData: PersonFormData[] = Array.isArray(validatedBody)
    ? validatedBody
    : [validatedBody];

  logger.info(
    { personCount: allPeopleData.length, locale },
    'Creating recommendation via /api/recommendations',
  );

  // Step 0A: Prompt injection check
  const injectionDetected = allPeopleData.some(
    (p) =>
      checkForPromptInjection(p.favoriteMovie) || checkForPromptInjection(p.favoriteMovieWhy ?? ''),
  );
  if (injectionDetected) {
    logger.warn('Prompt injection attempt detected in user input');
    return NextResponse.json(
      {
        error:
          'Your input contains content that cannot be processed. Please revise your preferences and try again.',
      },
      { status: 422 },
    );
  }

  // Step 0B: Moderation
  const textsToModerate = allPeopleData.flatMap((p) =>
    [
      p.favoriteMovie,
      p.newVsClassic,
      p.tonePreference,
      p.favoriteMovieWhy,
      ...p.moodPreference,
    ].filter((text): text is string => typeof text === 'string' && text.length > 0),
  );
  const moderationResult = await moderateInput(textsToModerate);

  if (moderationResult.flagged) {
    const hasAlwaysBlockCategory = moderationResult.categories.some((c) =>
      ALWAYS_BLOCK_CATEGORIES.has(c),
    );
    if (hasAlwaysBlockCategory) {
      logger.warn(
        { categories: moderationResult.categories },
        'User input blocked by always-block moderation category',
      );
      return NextResponse.json(
        {
          error:
            'Your input contains content that cannot be processed. Please revise your preferences and try again.',
          flaggedCategories: moderationResult.categories,
        },
        { status: 422 },
      );
    }

    const labeledInputs = allPeopleData.flatMap((p) => [
      { field: 'favoriteMovie', value: p.favoriteMovie },
      { field: 'newVsClassic', value: p.newVsClassic },
      { field: 'tonePreference', value: p.tonePreference },
      ...p.moodPreference.map((m) => ({ field: 'moodPreference', value: m })),
      ...(p.favoriteMovieWhy ? [{ field: 'favoriteMovieWhy', value: p.favoriteMovieWhy }] : []),
    ]);
    const judgeResult = await judgeForMoviePlatform(labeledInputs, moderationResult.categories);

    if (!judgeResult.suitable) {
      logger.warn(
        { categories: moderationResult.categories },
        'User input blocked by judge after moderation flag',
      );
      return NextResponse.json(
        {
          error:
            'Your input contains content that cannot be processed. Please revise your preferences and try again.',
          flaggedCategories: moderationResult.categories,
        },
        { status: 422 },
      );
    }

    logger.info(
      { categories: moderationResult.categories },
      'Judge approved content flagged by moderation — proceeding',
    );
  }

  // Create the recommendation DB row (status = 'pending')
  let recommendationId: string;
  try {
    recommendationId = await createRecommendation(validatedBody);
    logger.info({ recommendationId }, 'Recommendation row created');
  } catch (err) {
    logger.error({ err }, 'Failed to create recommendation row');
    return NextResponse.json({ error: 'Failed to create recommendation' }, { status: 500 });
  }

  // Enqueue to BullMQ if available, otherwise fall back to inline processing
  if (recommendationQueue) {
    try {
      await recommendationQueue.add(
        'recommendation',
        { recommendationId, quizData: validatedBody, locale },
        RECOMMENDATION_JOB_OPTIONS,
      );
      logger.info({ recommendationId }, 'Recommendation job enqueued');
    } catch (err) {
      logger.warn(
        { err, recommendationId },
        'Failed to enqueue recommendation job — falling back to inline processing',
      );
      // Fallback: process inline
      void processInline(recommendationId, allPeopleData, locale);
    }
  } else {
    logger.warn('Recommendation queue unavailable (no Redis) — processing inline');
    // Process inline but don't await — respond immediately and let it run in background
    void processInline(recommendationId, allPeopleData, locale);
  }

  return NextResponse.json({ id: recommendationId }, { status: 201 });
}

/**
 * Inline fallback: run the pipeline synchronously when Redis/BullMQ is unavailable.
 * Errors are caught and written to the DB row so the polling endpoint surfaces them.
 */
async function processInline(
  recommendationId: string,
  allPeopleData: PersonFormData[],
  locale: Locale,
): Promise<void> {
  try {
    await updateRecommendationStatus(recommendationId, 'processing');
    const result = await runRecommendationPipeline(allPeopleData, locale);

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
    await updateRecommendationStatus(recommendationId, 'completed');
    logger.info({ recommendationId }, 'Inline recommendation processing completed');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, recommendationId }, 'Inline recommendation processing failed');
    await updateRecommendationStatus(recommendationId, 'failed', message).catch((dbErr) => {
      logger.error({ err: dbErr, recommendationId }, 'Failed to update recommendation status');
    });
  }
}

export const POST = withAuth(postHandler);
