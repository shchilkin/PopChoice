import { connection, NextResponse } from 'next/server';

import { getBuildInfo } from '@/lib/buildInfo';

export async function GET(): Promise<Response> {
  await connection();

  return NextResponse.json(getBuildInfo(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
