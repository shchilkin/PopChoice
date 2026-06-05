import { listRecommendationEvalRunPage } from '@pop-choice/shared';
import { NextResponse, type NextRequest } from 'next/server';

import {
  ensureBackofficeReady,
  buildRecommendationEvalActionBody,
  buildRecommendationEvalFormDataFromJsonBody,
  getRecommendationEvalActionStatusCode,
  getBackofficeErrorStatus,
  logBackofficeError,
  parseRecommendationEvalListParams,
  performRecommendationEvalAction,
} from '../../../lib/backoffice';
import { isSameOriginRequest } from '../../../lib/sameOriginRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function readRecommendationEvalRunPage(request: Request) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
  const pagination = parseRecommendationEvalListParams(searchParams);
  return listRecommendationEvalRunPage({
    limit: pagination.limit,
    offset: pagination.offset,
  });
}

export async function GET(request: Request) {
  try {
    await ensureBackofficeReady();
    const runPage = await readRecommendationEvalRunPage(request);

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

    const formData = buildRecommendationEvalFormDataFromJsonBody(
      (await request.json().catch(() => ({}))) as Record<string, unknown>,
    );
    const result = await performRecommendationEvalAction(formData, request.headers);

    return NextResponse.json(buildRecommendationEvalActionBody(result), {
      status: getRecommendationEvalActionStatusCode(result.status),
    });
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
