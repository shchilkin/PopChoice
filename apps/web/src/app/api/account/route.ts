import { NextRequest, NextResponse } from 'next/server';

import { getDbClient } from '@/clients/dbClient';
import { getSessionFromRequest } from '@/lib/auth/session';
import { getUserMovieMemoryPage, getUserRecommendationSummaries } from '@/lib/db/recommendations';
import logger from '@/lib/logger';

type UserRow = {
  email: string;
};

const privateResponseHeaders = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

function accountJson(body: unknown, status: number): Response {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

export async function GET(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return accountJson({ error: 'Unauthorized' }, 401);
  }

  const db = getDbClient();
  if (!db.isConfigured()) {
    return accountJson({ error: 'Database is not configured' }, 503);
  }

  try {
    const { data, error } = await db.from<UserRow>('users').select('email').eq('id', session.sub);
    if (error) {
      logger.error({ error: error.message, userId: session.sub }, 'Failed to load account user');
      return accountJson({ error: 'Failed to load account' }, 500);
    }

    const user = data?.[0];
    if (!user) {
      return accountJson({ error: 'Account not found' }, 404);
    }

    const [recommendations, movieMemoryPage] = await Promise.all([
      getUserRecommendationSummaries(session.sub),
      getUserMovieMemoryPage(session.sub),
    ]);
    return accountJson(
      {
        user: { email: user.email },
        recommendations,
        movieMemory: movieMemoryPage.items,
        movieMemoryTotal: movieMemoryPage.total,
        movieMemoryNextOffset: movieMemoryPage.nextOffset,
      },
      200,
    );
  } catch (err) {
    logger.error({ err, userId: session.sub }, 'Failed to load account');
    return accountJson({ error: 'Failed to load account' }, 500);
  }
}
