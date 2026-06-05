import { NextResponse, type NextRequest } from 'next/server';

import {
  buildRecommendationEvalActionBody,
  getRecommendationEvalActionStatusCode,
  getBackofficeErrorStatus,
  logBackofficeError,
  performRecommendationEvalAction,
} from '../../../lib/backoffice';
import { isSameOriginRequest } from '../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

function wantsJsonResponse(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  const requestedWith = request.headers.get('x-requested-with') ?? '';
  return accept.includes('application/json') || requestedWith.toLowerCase() === 'fetch';
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      if (wantsJsonResponse(request)) {
        return NextResponse.json(
          { ok: false, status: 'failed', message: 'Forbidden.' },
          { status: 403 },
        );
      }

      return NextResponse.redirect(
        new URL('/recommendation-evals?eval=forbidden', request.url),
        303,
      );
    }

    const formData = await request.formData();
    const result = await performRecommendationEvalAction(formData, request.headers);

    if (wantsJsonResponse(request)) {
      return NextResponse.json(buildRecommendationEvalActionBody(result), {
        status: getRecommendationEvalActionStatusCode(result.status),
      });
    }

    return NextResponse.redirect(
      new URL(`/recommendation-evals?eval=${result.status}`, request.url),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to apply recommendation eval action', error);

    if (wantsJsonResponse(request)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Recommendation eval action failed. Check backoffice logs for details.',
          status: 'failed',
        },
        { status: getBackofficeErrorStatus(error) },
      );
    }

    return NextResponse.redirect(new URL('/recommendation-evals?eval=failed', request.url), 303);
  }
}
