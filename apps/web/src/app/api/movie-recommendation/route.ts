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
} from '@/lib/requestBody';
import { setActiveTraceAttributes, withTraceSpan } from '@/lib/tracing';
import { withAuth } from '@/lib/withAuth';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  try {
    const rateLimitResponse = await applyRateLimit(req);
    if (rateLimitResponse) {
      recordRecommendationCompletion({
        mode: 'legacy_sync',
        status: 'failure',
        durationMs: Date.now() - startTime,
      });
      return rateLimitResponse;
    }

    const body = await readJsonBodyWithLimit(req, RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES);

    // Validate request body
    const validatedBody = requestBodySchema.parse(body);

    // Read locale from Accept-Language header, default to English
    const locale = parseLocaleFromRequest(req);

    // Normalize to array format for consistent processing
    const allPeopleData = normalizePeopleData(validatedBody);
    const experienceMode = 'normal-match';
    const sourceStrategy = resolveRecommendationSourceStrategy({
      experienceMode,
      people: allPeopleData,
    }).id;

    logger.info(
      { experienceMode, personCount: allPeopleData.length, locale, sourceStrategy },
      'Processing recommendation request',
    );

    const inputBlock = await getRecommendationInputBlock(allPeopleData);
    if (inputBlock) {
      recordRecommendationCompletion({
        mode: 'legacy_sync',
        status: 'failure',
        durationMs: Date.now() - startTime,
      });
      return NextResponse.json(inputBlock, { status: 422 });
    }

    // Run the full AI pipeline (Steps 0.5–7)
    const response = await withTraceSpan(
      'recommendation.process.legacy_sync',
      {
        attributes: {
          'http.route': '/api/movie-recommendation',
          'recommendation.experience_mode': experienceMode,
          'recommendation.mode': 'legacy_sync',
          'recommendation.people.count': allPeopleData.length,
          'recommendation.source_strategy': sourceStrategy,
          locale,
        },
      },
      async () =>
        runRecommendationPipeline(allPeopleData, locale, {
          onStageChange: (stage) => {
            setActiveTraceAttributes({ 'recommendation.stage': stage });
          },
          experienceMode,
          sourceStrategy,
        }),
    );

    const duration = Date.now() - startTime;
    logger.info(
      { durationMs: duration, movieCount: response.similarMovies?.length ?? 0 },
      'Recommendation request completed',
    );
    recordRecommendationCompletion({
      mode: 'legacy_sync',
      status: 'success',
      durationMs: duration,
    });

    return NextResponse.json(apiResponseSchema.parse(response));
  } catch (error) {
    recordRecommendationCompletion({
      mode: 'legacy_sync',
      status: 'failure',
      durationMs: Date.now() - startTime,
    });

    const bodyErrorResponse = requestBodyErrorResponse(error);
    if (bodyErrorResponse) return bodyErrorResponse;

    // Handle validation errors first — these are client errors (400), not server errors
    if (error instanceof z.ZodError) {
      logger.warn({ err: error, issues: error.issues }, 'Invalid request body');
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 },
      );
    }

    logger.error({ err: error }, 'Error in movie recommendation API');

    if (isOpenAITimeoutError(error)) {
      return NextResponse.json({ error: 'OpenAI request timed out' }, { status: 504 });
    }

    // Handle other known errors
    if (error instanceof Error) {
      // Return more specific error messages based on error content
      if (error.message.includes('embedding')) {
        return NextResponse.json({ error: 'Failed to process preferences' }, { status: 500 });
      }
      if (error.message.includes('similar movies')) {
        return NextResponse.json({ error: 'Failed to find matching movies' }, { status: 500 });
      }
      if (error.message.includes('OpenAI')) {
        return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
      }
    }

    // Generic error response
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
