import { NextResponse } from 'next/server';

import { ensureBackofficeReady, logBackofficeError } from '../../../lib/backoffice';
import { readCatalogHealthLiveData } from '../../../lib/catalogHealthLiveServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const config = await ensureBackofficeReady();
    const data = await readCatalogHealthLiveData({
      config,
      searchParams: new URL(request.url).searchParams,
    });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to read live catalog health state', error);
    return NextResponse.json({ error: 'Failed to read catalog health state.' }, { status: 500 });
  }
}
