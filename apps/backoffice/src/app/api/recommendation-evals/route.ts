import { listRecommendationEvalRunPage } from '@pop-choice/shared';
import { NextResponse, type NextRequest } from 'next/server';

import {
  ensureBackofficeReady,
  getBackofficeErrorStatus,
  logBackofficeError,
  parseRecommendationEvalListParams,
  performRecommendationEvalAction,
  recommendationEvalMessage,
} from '../../../lib/backoffice';
import { isSameOriginRequest } from '../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await ensureBackofficeReady();
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const pagination = parseRecommendationEvalListParams(searchParams);
    const runPage = await listRecommendationEvalRunPage({
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json(runPage, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to read recommendation eval history', error);
    return NextResponse.json(
      { error: 'Failed to read recommendation eval history.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { ok: false, status: 'failed', message: 'Forbidden.' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const formData = new FormData();
    if (typeof body.mode === 'string') {
      formData.set('mode', body.mode);
    }
    if (body.acknowledgeLiveCost === true || body.acknowledge_live_cost === 'yes') {
      formData.set('acknowledge_live_cost', 'yes');
    }
    if (typeof body.liveConfirmation === 'string') {
      formData.set('live_confirmation', body.liveConfirmation);
    }
    if (typeof body.live_confirmation === 'string') {
      formData.set('live_confirmation', body.live_confirmation);
    }
    const result = await performRecommendationEvalAction(formData, request.headers);

    return NextResponse.json(
      {
        ok: result.status === 'queued',
        message: recommendationEvalMessage(result.status),
        mode: result.mode,
        runId: result.runId,
        status: result.status,
        ...(result.status === 'queued'
          ? { jobId: result.jobId }
          : { errorMessage: result.errorMessage }),
      },
      {
        status: result.status === 'unavailable' ? 503 : result.status === 'failed' ? 500 : 200,
      },
    );
  } catch (error) {
    logBackofficeError('Failed to enqueue recommendation eval run', error);
    return NextResponse.json(
      {
        error: 'Failed to enqueue recommendation eval run.',
        ok: false,
        status: 'failed',
      },
      { status: getBackofficeErrorStatus(error) },
    );
  }
}
