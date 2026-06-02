import { NextResponse } from 'next/server';

import { listCatalogMaintenanceQueueJobs } from '../../../catalogMaintenanceQueue';
import {
  ensureBackofficeReady,
  logBackofficeError,
  parseCatalogMaintenanceQueueParams,
} from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const pagination = parseCatalogMaintenanceQueueParams(searchParams);
    const jobPage = await listCatalogMaintenanceQueueJobs({
      limit: pagination.limit,
      offset: pagination.offset,
      redisUrl: config.redisUrl,
      state: pagination.state,
    });

    return NextResponse.json(jobPage, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to read catalog maintenance queue', error);
    return NextResponse.json(
      { error: 'Failed to read catalog maintenance queue.' },
      { status: 500 },
    );
  }
}
