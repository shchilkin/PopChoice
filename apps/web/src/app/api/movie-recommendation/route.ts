import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

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

import { runRecommendationPipeline } from './pipeline';
import { apiResponseSchema, requestBodySchema } from './types';

import type { PersonFormData } from './types';

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest): Promise<Response> {
  const startTime = Date.now();

  try {
    const rateLimitResponse = await applyRateLimit(req);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await req.json();

    // Validate request body
    const validatedBody = requestBodySchema.parse(body);

    // Read locale from Accept-Language header, default to English
    const locale = parseLocaleFromRequest(req);

    // Normalize to array format for consistent processing
    const allPeopleData: PersonFormData[] = Array.isArray(validatedBody)
      ? validatedBody
      : [validatedBody];

    logger.info({ personCount: allPeopleData.length, locale }, 'Processing recommendation request');

    // Step 0: Protect against prompt injection, then moderate + judge all user inputs.
    //
    // Phase A — structural injection check on favoriteMovie and favoriteMovieWhy
    // (fast regex, no API call). This must run before any LLM sees the text.
    const injectionDetected = allPeopleData.some(
      (p) =>
        checkForPromptInjection(p.favoriteMovie) ||
        checkForPromptInjection(p.favoriteMovieWhy ?? ''),
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

    // Phase B — Moderation API on all fields including the movie title.
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
      // Phase C — Always-block categories bypass the judge (no movie context justifies these).
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

      // Phase D — Judge pattern: a cheap LLM decides if the flagged content is legitimate
      // movie-platform input. "Kill Bill" flagged for violence is a real film title; the
      // judge recognises this and returns suitable: true.
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

    // Run the full AI pipeline (Steps 0.5–7)
    const response = await runRecommendationPipeline(allPeopleData, locale);

    const duration = Date.now() - startTime;
    logger.info(
      { durationMs: duration, movieCount: response.similarMovies?.length ?? 0 },
      'Recommendation request completed',
    );

    return NextResponse.json(apiResponseSchema.parse(response));
  } catch (error) {
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
            favoriteMovie: 'string (required)',
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
