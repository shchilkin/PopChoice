import { NextResponse, type NextRequest } from 'next/server';

import {
  backofficeActionErrorResponse,
  backofficeActionFailureResponse,
  logBackofficeError,
  parseBackofficeReturnPath,
  retryCatalogRepairBatchItem,
  wantsBackofficeJsonResponse,
} from '../../../../lib/backoffice';
import { isSameOriginRequest } from '../../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

type RepairBatchActionContext = {
  params: Promise<{ id: string }>;
};

function buildRepairBatchRedirectUrl({
  request,
  returnPath,
  status,
}: {
  request: NextRequest;
  returnPath: string;
  status: string;
}) {
  const url = new URL(returnPath, request.url);
  url.searchParams.set('item_retry', status);
  return url;
}

export async function POST(request: NextRequest, context: RepairBatchActionContext) {
  const { id } = await context.params;
  let returnPath = `/repair-batches/${encodeURIComponent(id)}`;

  try {
    if (!isSameOriginRequest(request)) {
      if (wantsBackofficeJsonResponse(request)) {
        return backofficeActionFailureResponse('Forbidden.', 403);
      }

      return NextResponse.redirect(
        buildRepairBatchRedirectUrl({ request, returnPath, status: 'forbidden' }),
        303,
      );
    }

    const formData = await request.formData();
    const batchId = formData.get('batch_id');
    if (typeof batchId !== 'string' || batchId.trim() === '') {
      formData.set('batch_id', id);
    }
    returnPath = parseBackofficeReturnPath(formData.get('return_to')) || returnPath;
    const result = await retryCatalogRepairBatchItem(formData, request.headers);
    const ok = result.status === 'queued' || result.status === 'deduped';

    if (wantsBackofficeJsonResponse(request)) {
      return NextResponse.json(
        {
          ok,
          status: result.status,
          message:
            result.status === 'unavailable'
              ? 'Queue is unavailable; retry item remains unresolved.'
              : result.status === 'failed'
                ? 'Retry failed before the item could be queued.'
                : 'Repair batch item retry queued.',
          batchId: result.batchId,
          issueKey: result.issueKey,
          item: result.item,
          job: result.job,
          redirectTo: returnPath,
        },
        {
          status: result.status === 'unavailable' ? 503 : result.status === 'failed' ? 500 : 200,
        },
      );
    }

    return NextResponse.redirect(
      buildRepairBatchRedirectUrl({ request, returnPath, status: result.status }),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to retry catalog repair batch item', error);
    if (wantsBackofficeJsonResponse(request)) {
      return backofficeActionErrorResponse(
        error,
        'Repair batch item retry failed. Check backoffice logs for details.',
      );
    }

    return NextResponse.redirect(
      buildRepairBatchRedirectUrl({ request, returnPath, status: 'failed' }),
      303,
    );
  }
}
