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

type RepairBatchRetryResult = Awaited<ReturnType<typeof retryCatalogRepairBatchItem>>;

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

function buildRepairBatchActionRedirect({
  request,
  returnPath,
  status,
}: {
  request: NextRequest;
  returnPath: string;
  status: string;
}) {
  return NextResponse.redirect(buildRepairBatchRedirectUrl({ request, returnPath, status }), 303);
}

function ensureRepairBatchFormBatchId(formData: FormData, batchId: string): void {
  const formBatchId = formData.get('batch_id');
  if (typeof formBatchId !== 'string' || formBatchId.trim() === '') {
    formData.set('batch_id', batchId);
  }
}

function getRepairBatchRetryMessage(status: RepairBatchRetryResult['status']): string {
  if (status === 'unavailable') return 'Queue is unavailable; retry item remains unresolved.';
  if (status === 'failed') return 'Retry failed before the item could be queued.';
  return 'Repair batch item retry queued.';
}

function getRepairBatchRetryStatusCode(status: RepairBatchRetryResult['status']): number {
  if (status === 'unavailable') return 503;
  if (status === 'failed') return 500;
  return 200;
}

function buildRepairBatchRetryJsonResponse(result: RepairBatchRetryResult, returnPath: string) {
  const ok = result.status === 'queued' || result.status === 'deduped';

  return NextResponse.json(
    {
      ok,
      status: result.status,
      message: getRepairBatchRetryMessage(result.status),
      batchId: result.batchId,
      issueKey: result.issueKey,
      item: result.item,
      job: result.job,
      redirectTo: returnPath,
    },
    { status: getRepairBatchRetryStatusCode(result.status) },
  );
}

function buildRepairBatchForbiddenResponse(request: NextRequest, returnPath: string) {
  if (wantsBackofficeJsonResponse(request)) {
    return backofficeActionFailureResponse('Forbidden.', 403);
  }

  return buildRepairBatchActionRedirect({ request, returnPath, status: 'forbidden' });
}

async function handleRepairBatchRetryRequest({
  batchId,
  request,
  returnPath,
}: {
  batchId: string;
  request: NextRequest;
  returnPath: string;
}) {
  const formData = await request.formData();
  ensureRepairBatchFormBatchId(formData, batchId);
  const parsedReturnPath = parseBackofficeReturnPath(formData.get('return_to')) || returnPath;
  const result = await retryCatalogRepairBatchItem(formData, request.headers);

  if (wantsBackofficeJsonResponse(request)) {
    return buildRepairBatchRetryJsonResponse(result, parsedReturnPath);
  }

  return buildRepairBatchActionRedirect({
    request,
    returnPath: parsedReturnPath,
    status: result.status,
  });
}

export async function POST(request: NextRequest, context: RepairBatchActionContext) {
  const { id } = await context.params;
  let returnPath = `/repair-batches/${encodeURIComponent(id)}`;

  try {
    if (!isSameOriginRequest(request)) {
      return buildRepairBatchForbiddenResponse(request, returnPath);
    }

    return await handleRepairBatchRetryRequest({ batchId: id, request, returnPath });
  } catch (error) {
    logBackofficeError('Failed to retry catalog repair batch item', error);
    if (wantsBackofficeJsonResponse(request)) {
      return backofficeActionErrorResponse(
        error,
        'Repair batch item retry failed. Check backoffice logs for details.',
      );
    }

    return buildRepairBatchActionRedirect({ request, returnPath, status: 'failed' });
  }
}
