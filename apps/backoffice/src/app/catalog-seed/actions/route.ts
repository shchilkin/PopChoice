import { NextResponse, type NextRequest } from 'next/server';

import {
  backofficeActionErrorResponse,
  backofficeActionFailureResponse,
  ensureBackofficeReady,
  getBackofficeErrorStatus,
  logBackofficeError,
  performCatalogSeedAction,
  wantsBackofficeJsonResponse,
} from '../../../lib/backoffice';
import { backofficeRedirectUrl, isSameOriginRequest } from '../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

function statusCodeFor(status: string): number {
  if (status === 'triggered') return 202;
  if (status === 'unavailable') return 503;
  return 500;
}

export async function POST(request: NextRequest) {
  let trustRequestEvidence = false;

  try {
    if (!isSameOriginRequest(request)) {
      if (wantsBackofficeJsonResponse(request)) {
        return backofficeActionFailureResponse('Forbidden.', 403);
      }

      return NextResponse.redirect(
        backofficeRedirectUrl(request, '/catalog-seed?seed=forbidden'),
        303,
      );
    }

    trustRequestEvidence = true;

    const [, formData] = await Promise.all([ensureBackofficeReady(), request.formData()]);
    const result = await performCatalogSeedAction({
      formData,
      headers: request.headers,
    });

    if (wantsBackofficeJsonResponse(request)) {
      return NextResponse.json(
        {
          ok: result.status === 'triggered',
          message: result.message,
          status: result.status,
        },
        { status: statusCodeFor(result.status) },
      );
    }

    return NextResponse.redirect(
      backofficeRedirectUrl(request, `/catalog-seed?seed=${result.status}`, {
        trustRequestEvidence,
      }),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to apply catalog seed action', error);
    if (wantsBackofficeJsonResponse(request)) {
      return backofficeActionErrorResponse(
        error,
        'Catalog seed action failed. Check backoffice logs for details.',
      );
    }

    return NextResponse.redirect(
      backofficeRedirectUrl(
        request,
        `/catalog-seed?seed=failed&code=${getBackofficeErrorStatus(error)}`,
        { trustRequestEvidence },
      ),
      303,
    );
  }
}
