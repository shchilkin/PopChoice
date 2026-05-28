import { NextResponse, type NextRequest } from 'next/server';

import {
  catalogRepairMessage,
  getBackofficeErrorStatus,
  logBackofficeError,
  performCatalogRepairAction,
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

      return NextResponse.redirect(new URL('/?repair=forbidden', request.url), 303);
    }

    const formData = await request.formData();
    const result = await performCatalogRepairAction(formData, request.headers);

    if (wantsJsonResponse(request)) {
      return NextResponse.json(
        {
          ok: result.status === 'queued',
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
      new URL(
        result.status === 'queued'
          ? `/?repair=${result.mode === 'bulk' ? 'bulk-queued' : 'queued'}`
          : result.status === 'partial'
            ? '/?repair=bulk-partial'
            : result.status === 'empty'
              ? '/?repair=empty'
              : result.status === 'failed'
                ? '/?repair=failed'
                : '/?repair=unavailable',
        request.url,
      ),
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

    return NextResponse.redirect(new URL('/?repair=failed', request.url), 303);
  }
}
