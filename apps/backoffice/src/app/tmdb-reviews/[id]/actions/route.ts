import { NextResponse, type NextRequest } from 'next/server';

import {
  applyTMDBReviewFormAction,
  backofficeActionErrorResponse,
  backofficeActionFailureResponse,
  getBackofficeErrorStatus,
  logBackofficeError,
  wantsBackofficeJsonResponse,
} from '../../../../lib/backoffice';
import { isSameOriginRequest } from '../../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

type ReviewActionContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: ReviewActionContext) {
  const { id } = await context.params;
  const reviewPath = `/tmdb-reviews/${encodeURIComponent(id)}`;

  try {
    if (!isSameOriginRequest(request)) {
      if (wantsBackofficeJsonResponse(request)) {
        return backofficeActionFailureResponse('Forbidden.', 403);
      }

      return new Response('Forbidden.', {
        status: 403,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }

    const formData = await request.formData();
    await applyTMDBReviewFormAction(id, formData, request.headers);

    if (wantsBackofficeJsonResponse(request)) {
      return NextResponse.json({
        ok: true,
        status: 'applied',
        message: 'Review action applied.',
        reviewId: id,
        redirectTo: reviewPath,
      });
    }

    return NextResponse.redirect(new URL(reviewPath, request.url), 303);
  } catch (error) {
    logBackofficeError('Failed to apply TMDB match review action', error);
    const status = getBackofficeErrorStatus(error);
    if (wantsBackofficeJsonResponse(request)) {
      return backofficeActionErrorResponse(
        error,
        'Review action failed. Check backoffice logs for details.',
      );
    }

    return new Response('Review action failed. Check backoffice logs for details.', {
      status,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  }
}
