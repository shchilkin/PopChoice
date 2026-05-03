import { NextRequest, NextResponse } from 'next/server';

import { claimMorePicksSlot } from '@/lib/db/recommendations';
import { MORE_PICKS_JOB_OPTIONS, morePicksQueue } from '@/lib/jobQueue';
import { parseLocaleFromRequest } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { withAuth } from '@/lib/withAuth';

import type { Locale } from '@/lib/locale';

// ---------------------------------------------------------------------------
// POST /api/recommendations/[id]/more-picks
//
// Enqueues a BullMQ job that fetches an additional batch of TMDB movies for
// the given recommendation. Can only be called ONCE per recommendation — the
// DB column `more_picks_status` is atomically set to 'pending' on first call
// and subsequent calls return 409.
// ---------------------------------------------------------------------------

async function processInlineMorePicks(
  recommendationId: string,
  quizData: unknown,
  locale: Locale,
): Promise<void> {
  const { runMorePicksPipeline } = await import('@/app/api/more-tmdb-picks/pipeline');
  const { getRecommendationTMDBExcludeIds, insertMorePicksMovies, updateMorePicksStatus } =
    await import('@/lib/db/recommendations');

  try {
    await updateMorePicksStatus(recommendationId, 'processing');
    const excludeIds = await getRecommendationTMDBExcludeIds(recommendationId);
    const movies = await runMorePicksPipeline(quizData, excludeIds, 2, locale);
    await insertMorePicksMovies(recommendationId, movies);
    await updateMorePicksStatus(recommendationId, 'completed');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMorePicksStatus(recommendationId, 'failed', message).catch((dbErr) => {
      logger.error(
        { err: dbErr, recommendationId },
        'Failed to persist more-picks failure status during inline processing',
      );
    });
  }
}

async function postHandler(
  req: NextRequest,
  _clientId: string,
  { slug }: { slug: string },
): Promise<Response> {
  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing recommendation id' }, { status: 400 });
  }

  // Atomically claim the slot — fails gracefully if already claimed
  const claimed = await claimMorePicksSlot(slug);
  if (!claimed) {
    return NextResponse.json(
      { error: 'More picks already requested or recommendation not completed' },
      { status: 409 },
    );
  }

  const { recommendationId } = claimed;
  const locale = parseLocaleFromRequest(req);

  if (morePicksQueue) {
    try {
      await morePicksQueue.add(
        'more-picks',
        { recommendationId, slug, locale },
        MORE_PICKS_JOB_OPTIONS,
      );
      logger.info({ recommendationId, slug }, 'More-picks job enqueued');
    } catch (err) {
      logger.warn(
        { err, recommendationId, slug },
        'Failed to enqueue more-picks job — falling back to inline processing',
      );
      await processInlineMorePicks(recommendationId, claimed.quizData, locale);
    }
  } else {
    // No Redis — run inline (blocks response but keeps the feature working in dev)
    logger.warn({ slug }, 'More-picks queue unavailable — running inline');
    await processInlineMorePicks(recommendationId, claimed.quizData, locale);
  }

  return NextResponse.json({ status: 'pending' }, { status: 202 });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: slug } = await context.params;
  return withAuth((r, clientId) => postHandler(r, clientId, { slug }))(req);
}
