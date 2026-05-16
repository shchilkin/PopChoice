import { NextRequest, NextResponse } from 'next/server';

import { getDbClient } from '@/clients/dbClient';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getUserRecommendationSummaries } from '@/lib/db/recommendations';
import logger from '@/lib/logger';

type UserRow = {
  email: string;
};

export async function GET(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDbClient();
  if (!db.isConfigured()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }

  try {
    const { data, error } = await db.from<UserRow>('users').select('email').eq('id', session.sub);
    if (error) {
      logger.error({ error: error.message, userId: session.sub }, 'Failed to load account user');
      return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
    }

    const user = data?.[0];
    if (!user) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const recommendations = await getUserRecommendationSummaries(session.sub);
    return NextResponse.json(
      {
        user: { email: user.email },
        recommendations,
      },
      { status: 200 },
    );
  } catch (err) {
    logger.error({ err, userId: session.sub }, 'Failed to load account');
    return NextResponse.json({ error: 'Failed to load account' }, { status: 500 });
  }
}
