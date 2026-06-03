import { NextRequest, NextResponse } from 'next/server';

import {
  getRecommendationInputBlock,
  normalizePeopleData,
  normalizeRecommendationCreateRequest,
} from '@/features/recommendation/input';
import {
  createAndStartRecommendation,
  usesDeterministicE2ERecommendations,
} from '@/features/recommendation/jobs';
import { resolveRecommendationSourceStrategy } from '@/features/recommendation/sourceStrategyPolicy';
import { recommendationCreateRequestSchema } from '@/features/recommendation/types';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import {
  RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES,
  readJsonBodyWithLimit,
  requestBodyErrorResponse,
} from '@/lib/requestBody';
import { withTraceSpan } from '@/lib/tracing';
import { withAuth } from '@/lib/withAuth';

// ---------------------------------------------------------------------------
// POST /api/recommendations — create a new recommendation job
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest, clientId: string): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(req, RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES);
  } catch (error) {
    const bodyErrorResponse = requestBodyErrorResponse(error);
    if (bodyErrorResponse) return bodyErrorResponse;
    throw error;
  }

  // Validate request body
  const parsed = recommendationCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request data',
        details: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      { status: 400 },
    );
  }

  const createInput = normalizeRecommendationCreateRequest(parsed.data);
  const validatedBody = createInput.quizData;
  const locale = parseLocaleFromRequest(req);
  const allPeopleData = normalizePeopleData(validatedBody);
  const isDeterministic = usesDeterministicE2ERecommendations();
  const experienceMode = isDeterministic
    ? 'curated-showcase'
    : (createInput.experienceMode ?? 'normal-match');
  const sourceStrategy = isDeterministic
    ? 'curated-showcase'
    : resolveRecommendationSourceStrategy({ experienceMode, people: allPeopleData }).id;

  logger.info(
    { experienceMode, personCount: allPeopleData.length, locale, sourceStrategy },
    'Creating recommendation via /api/recommendations',
  );

  if (!isDeterministic) {
    const inputBlock = await getRecommendationInputBlock(allPeopleData);
    if (inputBlock) {
      return NextResponse.json(inputBlock, { status: 422 });
    }
  }

  try {
    const userId = clientId.startsWith('user:') ? clientId.slice('user:'.length) : undefined;
    const created = await withTraceSpan(
      'api.recommendations.create',
      {
        attributes: {
          'http.route': '/api/recommendations',
          'recommendation.mode': 'async',
          'recommendation.experience_mode': experienceMode,
          'recommendation.people.count': allPeopleData.length,
          'recommendation.source_strategy': sourceStrategy,
          locale,
        },
      },
      async () =>
        createAndStartRecommendation(validatedBody, allPeopleData, locale, {
          experienceMode,
          sourceStrategy,
          userId,
        }),
    );
    return NextResponse.json({ id: created.slug }, { status: 201 });
  } catch (err) {
    logger.error({ err }, 'Failed to create recommendation row');
    return NextResponse.json({ error: 'Failed to create recommendation' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
