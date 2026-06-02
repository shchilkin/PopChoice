import { NextResponse, type NextRequest } from 'next/server';

import {
  catalogRepairMessage,
  getBackofficeErrorStatus,
  logBackofficeError,
  parseBackofficeReturnPath,
  performCatalogRepairAction,
} from '../../../lib/backoffice';
import { isSameOriginRequest } from '../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';

function wantsJsonResponse(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  const requestedWith = request.headers.get('x-requested-with') ?? '';
  return accept.includes('application/json') || requestedWith.toLowerCase() === 'fetch';
}

function repairRedirectStatus(result: Awaited<ReturnType<typeof performCatalogRepairAction>>) {
  if (result.status === 'queued') return result.mode === 'bulk' ? 'bulk-queued' : 'queued';
  if (result.status === 'orchestration_queued') return 'bulk-orchestration-queued';
  if (result.status === 'partial') return 'bulk-partial';
  if (result.status === 'empty') return 'empty';
  if (result.status === 'failed') return 'failed';
  return 'unavailable';
}

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
      if (wantsJsonResponse(request)) {
        return NextResponse.json(
          { ok: false, status: 'failed', message: 'Forbidden.' },
          { status: 403 },
        );
      }

      return NextResponse.redirect(new URL('/?repair=forbidden', request.url), 303);
    }

    const formData = await request.formData();
    returnPath = parseBackofficeReturnPath(formData.get('return_to'));
    const result = await performCatalogRepairAction(formData, request.headers);

    if (wantsJsonResponse(request)) {
      const ok = result.status === 'queued' || result.status === 'orchestration_queued';
      return NextResponse.json(
        {
          ok,
          mode: result.mode,
          status: result.status,
          message: catalogRepairMessage(result.status),
          issueKey: result.issueKey,
          ...(result.mode === 'single'
            ? { movieId: result.movieId, job: result.job }
            : { summary: result.summary }),
        },
        {
          status:
            result.status === 'unavailable'
              ? 503
              : result.status === 'failed'
                ? 500
                : result.status === 'partial'
                  ? 207
                  : 200,
        },
      );
    }

    return NextResponse.redirect(
      buildRepairRedirectUrl({
        request,
        returnPath,
        repairStatus: repairRedirectStatus(result),
      }),
      303,
    );
  } catch (error) {
    logBackofficeError('Failed to apply catalog-health repair action', error);
    if (wantsJsonResponse(request)) {
      const publicMessage =
        typeof error === 'object' && error !== null && 'publicMessage' in error
          ? (error as { publicMessage?: unknown }).publicMessage
          : undefined;
      const clientMessage =
        typeof publicMessage === 'string' && publicMessage.trim() !== ''
          ? publicMessage
          : 'Catalog repair action failed. Check backoffice logs for details.';

      return NextResponse.json(
        {
          ok: false,
          status: 'failed',
          message: clientMessage,
        },
        { status: getBackofficeErrorStatus(error) },
      );
    }

    return NextResponse.redirect(
      buildRepairRedirectUrl({ request, returnPath, repairStatus: 'failed' }),
      303,
    );
  }
}
