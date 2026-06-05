import { NextResponse, type NextRequest } from 'next/server';

import {
  backofficeActionErrorResponse,
  backofficeActionFailureResponse,
  buildCatalogRepairActionBody,
  getCatalogRepairActionStatusCode,
  getCatalogRepairRedirectStatus,
  logBackofficeError,
  parseBackofficeReturnPath,
  performCatalogRepairAction,
  wantsBackofficeJsonResponse,
} from '../../../lib/backoffice';
import { isSameOriginRequest } from '../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

function buildRepairRedirectUrl({
  request,
  returnPath,
  repairStatus,
}: {
  request: NextRequest;
  returnPath: string;
  repairStatus: string;
}) {
  const url = new URL(returnPath, request.url);
  url.searchParams.set('repair', repairStatus);
  return url;
}

export async function POST(request: NextRequest) {
  let returnPath = '/';

  try {
    if (!isSameOriginRequest(request)) {
      if (wantsBackofficeJsonResponse(request)) {
        return backofficeActionFailureResponse('Forbidden.', 403);
      }

      return NextResponse.redirect(new URL('/?repair=forbidden', request.url), 303);
    }

    const formData = await request.formData();
    returnPath = parseBackofficeReturnPath(formData.get('return_to'));
    const result = await performCatalogRepairAction(formData, request.headers);

    if (wantsBackofficeJsonResponse(request)) {
      return NextResponse.json(buildCatalogRepairActionBody(result), {
        status: getCatalogRepairActionStatusCode(result.status),
      });
    }

    return NextResponse.redirect(
      buildRepairRedirectUrl({
        request,
        returnPath,
        repairStatus: getCatalogRepairRedirectStatus(result),
      }),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to apply catalog-health repair action', error);
    if (wantsBackofficeJsonResponse(request)) {
      return backofficeActionErrorResponse(
        error,
        'Catalog repair action failed. Check backoffice logs for details.',
      );
    }

    return NextResponse.redirect(
      buildRepairRedirectUrl({ request, returnPath, repairStatus: 'failed' }),
      303,
    );
  }
}
