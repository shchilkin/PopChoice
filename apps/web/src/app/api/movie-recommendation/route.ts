import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

import { getRecommendationInputBlock, normalizePeopleData } from '@/features/recommendation/input';
import { runRecommendationPipeline } from '@/features/recommendation/pipeline';
import { resolveRecommendationSourceStrategy } from '@/features/recommendation/sourceStrategyPolicy';
import { apiResponseSchema, requestBodySchema } from '@/features/recommendation/types';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { recordRecommendationCompletion } from '@/lib/metrics';
import { isOpenAITimeoutError } from '@/lib/openaiTimeout';
import { applyRateLimit } from '@/lib/rateLimit';
import {
  RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES,
  readJsonBodyWithLimit,
  requestBodyErrorResponse,
  requestValidationErrorResponse,
} from '@/lib/requestBody';
import { setActiveTraceAttributes, withTraceSpan } from '@/lib/tracing';
import { withAuth } from '@/lib/withAuth';

import type { RecommendationSourceStrategy } from '@/features/recommendation/types';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  try {
    const rateLimitResponse = await getRateLimitResponse(req, startTime);
    if (rateLimitResponse) return rateLimitResponse;

    const context = await getLegacyRecommendationContext(req);
    logRecommendationRequest(context);

    const inputBlock = await getRecommendationInputBlock(context.allPeopleData);
    if (inputBlock) {
      recordLegacyRecommendationFailure(startTime);
      return NextResponse.json(inputBlock, { status: 422 });
    }

    const response = await runLegacyRecommendation(context);

    const duration = Date.now() - startTime;
    logLegacyRecommendationSuccess(duration, response.similarMovies?.length ?? 0);
    recordLegacyRecommendationSuccess(duration);

    return NextResponse.json(apiResponseSchema.parse(response));
  } catch (error) {
    recordLegacyRecommendationFailure(startTime);
    return getLegacyRecommendationErrorResponse(error);
  }
}

type LegacyRecommendationContext = {
  allPeopleData: ReturnType<typeof normalizePeopleData>;
  experienceMode: 'normal-match';
  locale: ReturnType<typeof parseLocaleFromRequest>;
  sourceStrategy: RecommendationSourceStrategy;
};

async function getRateLimitResponse(req: NextRequest, startTime: number) {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) {
    recordLegacyRecommendationFailure(startTime);
  }

  return rateLimitResponse;
}

async function getLegacyRecommendationContext(
  req: NextRequest,
): Promise<LegacyRecommendationContext> {
  const body = await readJsonBodyWithLimit(req, RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES);
  const validatedBody = requestBodySchema.parse(body);
  const locale = parseLocaleFromRequest(req);
  const allPeopleData = normalizePeopleData(validatedBody);
  const experienceMode = 'normal-match';
  const sourceStrategy = resolveRecommendationSourceStrategy({
    experienceMode,
    people: allPeopleData,
  }).id;

  return { allPeopleData, experienceMode, locale, sourceStrategy };
}

function logRecommendationRequest(context: LegacyRecommendationContext) {
  logger.info(
    {
      experienceMode: context.experienceMode,
      locale: context.locale,
      personCount: context.allPeopleData.length,
      sourceStrategy: context.sourceStrategy,
    },
    'Processing recommendation request',
  );
}

async function runLegacyRecommendation(context: LegacyRecommendationContext) {
  return withTraceSpan(
    'recommendation.process.legacy_sync',
    {
      attributes: {
        'http.route': '/api/movie-recommendation',
        'recommendation.experience_mode': context.experienceMode,
        'recommendation.mode': 'legacy_sync',
        'recommendation.people.count': context.allPeopleData.length,
        'recommendation.source_strategy': context.sourceStrategy,
        locale: context.locale,
      },
    },
    async () =>
      runRecommendationPipeline(context.allPeopleData, context.locale, {
        onStageChange: (stage) => {
          setActiveTraceAttributes({ 'recommendation.stage': stage });
        },
        experienceMode: context.experienceMode,
        sourceStrategy: context.sourceStrategy,
      }),
  );
}

function logLegacyRecommendationSuccess(duration: number, movieCount: number) {
  logger.info({ durationMs: duration, movieCount }, 'Recommendation request completed');
}

function recordLegacyRecommendationSuccess(durationMs: number) {
  recordRecommendationCompletion({ durationMs, mode: 'legacy_sync', status: 'success' });
}

function recordLegacyRecommendationFailure(startTime: number) {
  recordRecommendationCompletion({
    durationMs: Date.now() - startTime,
    mode: 'legacy_sync',
    status: 'failure',
  });
}

function getLegacyRecommendationErrorResponse(error: unknown) {
  const bodyErrorResponse = requestBodyErrorResponse(error);
  if (bodyErrorResponse) return bodyErrorResponse;

  if (error instanceof z.ZodError) {
    return getValidationErrorResponse(error);
  }

  logger.error({ err: error }, 'Error in movie recommendation API');
  return getKnownRecommendationErrorResponse(error);
}

function getValidationErrorResponse(error: z.ZodError) {
  logger.warn({ err: error, issues: error.issues }, 'Invalid request body');
  return requestValidationErrorResponse(error.issues);
}

function getKnownRecommendationErrorResponse(error: unknown) {
  if (isOpenAITimeoutError(error)) {
    return NextResponse.json({ error: 'OpenAI request timed out' }, { status: 504 });
  }

  if (error instanceof Error) {
    return getKnownErrorMessageResponse(error);
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

function getKnownErrorMessageResponse(error: Error) {
  if (error.message.includes('embedding')) {
    return NextResponse.json({ error: 'Failed to process preferences' }, { status: 500 });
  }
  if (error.message.includes('similar movies')) {
    return NextResponse.json({ error: 'Failed to find matching movies' }, { status: 500 });
  }
  if (error.message.includes('OpenAI')) {
    return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export const POST = withAuth(postHandler);

// ---------------------------------------------------------------------------
// GET handler — API documentation
// ---------------------------------------------------------------------------
export async function GET() {
  return NextResponse.json({
    name: 'PopChoice Movie Recommendation API',
    description: 'Get personalized movie recommendations based on preferences',
    version: '1.0.0',
    methods: {
      POST: {
        description: 'Get movie recommendation',
        requestBody: {
          type: 'object | array',
          description: 'Single person data or array of people data',
          schema: {
            favoriteMovie: 'string (required, may be empty when the user has no reference movie)',
            favoriteMovieWhy:
              'string (optional, max 300 chars) — why you love that movie; empty/whitespace is treated as absent',
            newVsClassic: 'string (required)',
            moodPreference: 'string[] (required, min 1)',
            tonePreference: 'string (required)',
          },
        },
        response: {
          description: 'string - AI-generated recommendation explanation',
          title: 'string - Recommended movie title',
          posterURL: 'string (optional) - Movie poster URL from TMDB',
          movieDetails: {
            year: 'number - Release year',
            age_rating: 'string - Age rating (G, PG, R, etc.)',
            duration: 'number - Duration in minutes',
            score_rating: 'number - Rating score (0-10)',
            similarity: 'number - Similarity score to user preferences (0-1)',
          },
          similarMovies: 'array - All similar movies found with their details',
        },
      },
    },
    examples: {
      singlePerson: {
        favoriteMovie: 'The Matrix',
        favoriteMovieWhy: 'I love the mind-bending reality twists and tense action',
        newVsClassic: 'new',
        moodPreference: ['action', 'sci-fi'],
        tonePreference: 'serious',
      },
      multiplePeople: [
        {
          favoriteMovie: 'The Matrix',
          favoriteMovieWhy: 'Mind-bending and visually stunning',
          newVsClassic: 'new',
          moodPreference: ['action'],
          tonePreference: 'serious',
        },
        {
          favoriteMovie: 'The Godfather',
          newVsClassic: 'classic',
          moodPreference: ['drama'],
          tonePreference: 'dark',
        },
      ],
    },
  });
}
