import { getRecommendationEvalRunDetail } from '@pop-choice/shared';
import { NextResponse } from 'next/server';

import { ensureBackofficeReady, logBackofficeError } from '../../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RecommendationEvalContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RecommendationEvalContext) {
  const { id } = await context.params;

  try {
    await ensureBackofficeReady();
    const detail = await getRecommendationEvalRunDetail(id);

    if (!detail) {
      return NextResponse.json({ error: 'Recommendation eval run not found.' }, { status: 404 });
    }

    return NextResponse.json(detail, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logBackofficeError('Failed to read recommendation eval detail', error);
    return NextResponse.json(
      { error: 'Failed to read recommendation eval detail.' },
      { status: 500 },
    );
  }
}
