import { getCatalogRepairBatchDetail } from '@pop-choice/shared';
import { NextResponse } from 'next/server';

import {
  ensureBackofficeReady,
  logBackofficeError,
  parseRepairBatchItemParams,
} from '../../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CatalogRepairBatchContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: CatalogRepairBatchContext) {
  const { id } = await context.params;

  try {
    await ensureBackofficeReady();
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const pagination = parseRepairBatchItemParams(searchParams);
    const detail = await getCatalogRepairBatchDetail(id, {
      limit: pagination.limit,
      offset: pagination.offset,
    });

    if (!detail) {
      return NextResponse.json({ error: 'Catalog repair batch not found.' }, { status: 404 });
    }

    return NextResponse.json(detail, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to read catalog repair batch detail', error);
    return NextResponse.json(
      { error: 'Failed to read catalog repair batch detail.' },
      { status: 500 },
    );
  }
}
