import { NextResponse, type NextRequest } from 'next/server';

import {
  applyCatalogMovieManualFormAction,
  backofficeActionErrorResponse,
  backofficeActionFailureResponse,
  catalogMovieDetailPath,
  logBackofficeError,
  parseBackofficeReturnPath,
  wantsBackofficeJsonResponse,
} from '../../../../lib/backoffice';
import { backofficeRedirectUrl, isSameOriginRequest } from '../../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

function buildManualRedirectUrl({
  manualStatus,
  request,
  returnPath,
}: {
  manualStatus: string;
  request: NextRequest;
  returnPath: string;
}): URL {
  const url = backofficeRedirectUrl(request, returnPath, { trustRequestEvidence: true });
  url.searchParams.set('manual', manualStatus);
  return url;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let returnPath = catalogMovieDetailPath(id);

  try {
    if (!isSameOriginRequest(request)) {
      if (wantsBackofficeJsonResponse(request)) {
        return backofficeActionFailureResponse('Forbidden.', 403);
      }

      return NextResponse.redirect(
        backofficeRedirectUrl(request, `${catalogMovieDetailPath(id)}?manual=forbidden`),
        303,
      );
    }

    const formData = await request.formData();
    returnPath = parseBackofficeReturnPath(formData.get('return_to')) || returnPath;
    const result = await applyCatalogMovieManualFormAction(id, formData, request.headers);

    if (wantsBackofficeJsonResponse(request)) {
      return NextResponse.json(
        {
          auditId: result.audit.id,
          movieId: result.movie.id,
          redirectTo: result.redirectTo,
          status: 'updated',
          updatedFields: result.updatedFields,
        },
        { status: 200 },
      );
    }

    return NextResponse.redirect(
      buildManualRedirectUrl({ manualStatus: 'updated', request, returnPath: result.redirectTo }),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to apply catalog movie manual fields', error);

    if (wantsBackofficeJsonResponse(request)) {
      return backofficeActionErrorResponse(
        error,
        'Manual movie update failed. Check backoffice logs for details.',
      );
    }

    return NextResponse.redirect(
      buildManualRedirectUrl({ manualStatus: 'failed', request, returnPath }),
      303,
    );
  }
}
