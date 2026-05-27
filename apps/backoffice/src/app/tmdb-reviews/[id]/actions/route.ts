import { NextResponse, type NextRequest } from 'next/server';

import {
  applyTMDBReviewFormAction,
  getBackofficeErrorStatus,
  logBackofficeError,
} from '../../../../lib/backoffice';
import { isSameOriginRequest } from '../../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

type ReviewActionContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: ReviewActionContext) {
  const { id } = await context.params;

  try {
    if (!isSameOriginRequest(request)) {
      return new Response('Forbidden.', {
        status: 403,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      });
    }

    const formData = await request.formData();
    await applyTMDBReviewFormAction(id, formData, request.headers);
    return NextResponse.redirect(
      new URL(`/tmdb-reviews/${encodeURIComponent(id)}`, request.url),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to apply TMDB match review action', error);
    const status = getBackofficeErrorStatus(error);
    return new Response('Review action failed. Check backoffice logs for details.', {
      status,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  }
}
