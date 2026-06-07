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
  requestValidationErrorResponse,
  type ValidationIssue,
} from '@/lib/requestBody';
import { withTraceSpan } from '@/lib/tracing';
import { withAuth } from '@/lib/withAuth';

import type {
  RecommendationExperienceMode,
  RecommendationSourceStrategy,
} from '@/features/recommendation/types';

// ---------------------------------------------------------------------------
// POST /api/recommendations — create a new recommendation job
// ---------------------------------------------------------------------------
async function postHandler(req: NextRequest, clientId: string): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parsed = await parseCreateRecommendationBody(req);
    const context = getCreateRecommendationContext(req, parsed.data);
    logCreateRecommendationRequest(context);

    const inputBlockResponse = await getInputBlockResponse(context);
    if (inputBlockResponse) return inputBlockResponse;

    const created = await createRecommendationJob(context, clientId);
    return NextResponse.json({ id: created.slug }, { status: 201 });
  } catch (error) {
    return getCreateRecommendationErrorResponse(error);
  }
}

async function parseCreateRecommendationBody(req: NextRequest) {
  const body = await readJsonBodyWithLimit(req, RECOMMENDATION_REQUEST_BODY_LIMIT_BYTES);
  const parsed = recommendationCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw parsed.error;
  }

  return parsed;
}

function getCreateRecommendationContext(
  req: NextRequest,
  data: typeof recommendationCreateRequestSchema._output,
) {
  const createInput = normalizeRecommendationCreateRequest(data);
  const validatedBody = createInput.quizData;
  const locale = parseLocaleFromRequest(req);
  const allPeopleData = normalizePeopleData(validatedBody);
  const isDeterministic = usesDeterministicE2ERecommendations();

  return {
    allPeopleData,
    experienceMode: getCreateExperienceMode(isDeterministic, createInput.experienceMode),
    isDeterministic,
    locale,
    sourceStrategy: getCreateSourceStrategy(
      isDeterministic,
      createInput.experienceMode,
      allPeopleData,
    ),
    validatedBody,
  };
}

type CreateRecommendationContext = ReturnType<typeof getCreateRecommendationContext>;

function getCreateExperienceMode(
  isDeterministic: boolean,
  experienceMode: RecommendationExperienceMode | undefined,
): RecommendationExperienceMode {
  return isDeterministic ? 'curated-showcase' : (experienceMode ?? 'normal-match');
}

function getCreateSourceStrategy(
  isDeterministic: boolean,
  experienceMode: RecommendationExperienceMode | undefined,
  allPeopleData: ReturnType<typeof normalizePeopleData>,
): RecommendationSourceStrategy {
  const resolvedExperienceMode = getCreateExperienceMode(isDeterministic, experienceMode);
  return isDeterministic
    ? 'curated-showcase'
    : resolveRecommendationSourceStrategy({
        experienceMode: resolvedExperienceMode,
        people: allPeopleData,
      }).id;
}

function logCreateRecommendationRequest(context: CreateRecommendationContext) {
  logger.info(
    {
      experienceMode: context.experienceMode,
      locale: context.locale,
      personCount: context.allPeopleData.length,
      sourceStrategy: context.sourceStrategy,
    },
    'Creating recommendation via /api/recommendations',
  );
}

async function getInputBlockResponse(context: CreateRecommendationContext) {
  if (context.isDeterministic) {
    return null;
  }

  const inputBlock = await getRecommendationInputBlock(context.allPeopleData);
  return inputBlock ? NextResponse.json(inputBlock, { status: 422 }) : null;
}

async function createRecommendationJob(context: CreateRecommendationContext, clientId: string) {
  try {
    return await withTraceSpan(
      'api.recommendations.create',
      {
        attributes: {
          'http.route': '/api/recommendations',
          'recommendation.mode': 'async',
          'recommendation.experience_mode': context.experienceMode,
          'recommendation.people.count': context.allPeopleData.length,
          'recommendation.source_strategy': context.sourceStrategy,
          locale: context.locale,
        },
      },
      async () =>
        createAndStartRecommendation(context.validatedBody, context.allPeopleData, context.locale, {
          experienceMode: context.experienceMode,
          sourceStrategy: context.sourceStrategy,
          userId: getClientUserId(clientId),
        }),
    );
  } catch (err) {
    logger.error({ err }, 'Failed to create recommendation row');
    throw new Error('Failed to create recommendation');
  }
}

function getClientUserId(clientId: string) {
  return clientId.startsWith('user:') ? clientId.slice('user:'.length) : undefined;
}

function getCreateRecommendationErrorResponse(error: unknown) {
  const bodyErrorResponse = requestBodyErrorResponse(error);
  if (bodyErrorResponse) return bodyErrorResponse;

  if (isCreateValidationError(error)) {
    return getCreateValidationErrorResponse(error);
  }

  return NextResponse.json({ error: 'Failed to create recommendation' }, { status: 500 });
}

function isCreateValidationError(error: unknown): error is { issues: ValidationIssue[] } {
  return error instanceof Error && error.name === 'ZodError' && 'issues' in error;
}

function getCreateValidationErrorResponse(error: { issues: ValidationIssue[] }) {
  return requestValidationErrorResponse(error.issues);
}

export const POST = withAuth(postHandler);
