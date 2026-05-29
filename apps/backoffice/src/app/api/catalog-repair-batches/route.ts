import { listCatalogRepairBatchPage } from '@pop-choice/shared';
import { NextResponse } from 'next/server';

import {
  ensureBackofficeReady,
  logBackofficeError,
  parseRepairBatchListParams,
} from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await ensureBackofficeReady();
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const pagination = parseRepairBatchListParams(searchParams);
    const batchPage = await listCatalogRepairBatchPage({
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return NextResponse.json(batchPage, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to read catalog repair batch history', error);
    return NextResponse.json(
      { error: 'Failed to read catalog repair batch history.' },
      { status: 500 },
    );
  }
}
