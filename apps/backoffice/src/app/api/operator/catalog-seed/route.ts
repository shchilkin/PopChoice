import { NextResponse, type NextRequest } from 'next/server';

import { verifyBackofficeAutomationBearer } from '../../../../lib/backofficeAutomationAuth';
import { getBackofficeErrorStatus, logBackofficeError } from '../../../../lib/backofficeRuntime';
import { performCatalogSeedAction } from '../../../../lib/catalogSeedActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildCatalogSeedFormData(): FormData {
  const formData = new FormData();
  formData.set('action', 'trigger_movie_seed');
  return formData;
}

function getCatalogSeedActionStatusCode(status: string): number {
  if (status === 'triggered') return 202;
  if (status === 'unavailable') return 503;
  return 400;
}

export async function POST(request: NextRequest) {
  const authResult = verifyBackofficeAutomationBearer({ headers: request.headers });
  if (!authResult.ok) {
    return NextResponse.json(
      { message: authResult.message, ok: false, status: 'failed' },
      { status: authResult.statusCode },
    );
  }

  try {
    const result = await performCatalogSeedAction({
      actor: 'github-actions',
      formData: buildCatalogSeedFormData(),
      headers: request.headers,
    });

    return NextResponse.json(
      {
        message: result.message,
        ok: result.status === 'triggered',
        status: result.status,
      },
      { status: getCatalogSeedActionStatusCode(result.status) },
    );
  } catch (error) {
    logBackofficeError('Failed to enqueue automated catalog seed', error);
    return NextResponse.json(
      {
        message: 'Failed to enqueue automated catalog seed.',
        ok: false,
        status: 'failed',
      },
      { status: getBackofficeErrorStatus(error) },
    );
  }
}
