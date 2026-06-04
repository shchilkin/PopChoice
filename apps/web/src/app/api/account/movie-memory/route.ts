import { NextRequest, NextResponse } from 'next/server';

import {
  CANDIDATE_LIMIT,
  addMovieMemoryBatchForUser,
  addMovieMemoryBatchSchema,
  addMovieMemoryItemForUser,
  addMovieMemorySchema,
  deleteMovieMemoryForUser,
  deleteMovieMemorySchema,
  getMovieMemoryPageForUser,
  listMovieMemorySchema,
  loadMovieMemoryCandidatesForUser,
  parseMovieMemoryLocale,
  searchMovieMemoryCatalog,
  searchMovieMemorySchema,
} from '@/features/movie-memory/service';
import { hasValidSameOriginCsrfPair } from '@/lib/auth/csrf';
import { getSessionFromRequest } from '@/lib/auth/session';
import { parseLocaleFromRequest, type Locale } from '@/lib/locale';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';

const privateResponseHeaders = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function movieMemoryJson(body: unknown, status: number): Response {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

function parseRequestedLocale(req: NextRequest): Locale {
  const localeParam = req.nextUrl.searchParams.get('locale');
  return parseMovieMemoryLocale(localeParam, parseLocaleFromRequest(req));
}

export async function GET(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return movieMemoryJson({ error: 'Unauthorized' }, 401);
  }

  const startedAt = Date.now();
  const isCandidatesRequest = req.nextUrl.searchParams.get('mode') === 'candidates';
  const isListRequest = req.nextUrl.searchParams.get('mode') === 'list';
  const query = req.nextUrl.searchParams.get('query') ?? req.nextUrl.searchParams.get('q') ?? '';
  const requestKind = isCandidatesRequest ? 'candidates' : isListRequest ? 'list' : 'search';
  logger.info(
    {
      userId: session.sub,
      requestKind,
      queryLength: isCandidatesRequest ? undefined : query.length,
    },
    'Movie memory GET received',
  );

  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) {
    logger.warn(
      {
        userId: session.sub,
        requestKind,
        status: rateLimitResponse.status,
        durationMs: elapsedMs(startedAt),
      },
      'Movie memory GET rate limited',
    );
    return rateLimitResponse;
  }

  if (isCandidatesRequest) {
    try {
      const locale = parseRequestedLocale(req);
      const { movies, source, emptyStats } = await loadMovieMemoryCandidatesForUser(
        session.sub,
        locale,
        { logContext: { requestKind } },
      );
      logger.info(
        {
          userId: session.sub,
          requestKind,
          source,
          requested: CANDIDATE_LIMIT,
          returned: movies.length,
          catalogCount: emptyStats?.catalogCount,
          memoryCount: emptyStats?.memoryCount,
          availableCatalogCount: emptyStats?.availableCatalogCount,
          durationMs: elapsedMs(startedAt),
        },
        'Movie memory candidates loaded',
      );
      return movieMemoryJson({ movies }, 200);
    } catch (err) {
      logger.error(
        { err, userId: session.sub, requestKind, durationMs: elapsedMs(startedAt) },
        'Failed to load movie memory candidates',
      );
      return movieMemoryJson({ error: 'Failed to load movie memory candidates' }, 500);
    }
  }

  if (isListRequest) {
    const parsed = listMovieMemorySchema.safeParse({
      offset: req.nextUrl.searchParams.get('offset') ?? undefined,
      limit: req.nextUrl.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      logger.warn(
        { userId: session.sub, requestKind, durationMs: elapsedMs(startedAt) },
        'Movie memory list rejected: invalid pagination',
      );
      return movieMemoryJson({ error: 'Invalid movie memory pagination' }, 422);
    }

    try {
      const page = await getMovieMemoryPageForUser(session.sub, parsed.data);
      logger.info(
        {
          userId: session.sub,
          requestKind,
          requested: parsed.data.limit,
          offset: parsed.data.offset,
          returned: page.items.length,
          total: page.total,
          nextOffset: page.nextOffset,
          durationMs: elapsedMs(startedAt),
        },
        'Movie memory list loaded',
      );
      return movieMemoryJson(
        {
          movieMemory: page.items,
          total: page.total,
          nextOffset: page.nextOffset,
        },
        200,
      );
    } catch (err) {
      logger.error(
        { err, userId: session.sub, requestKind, durationMs: elapsedMs(startedAt) },
        'Failed to load movie memory list',
      );
      return movieMemoryJson({ error: 'Failed to load movie memory' }, 500);
    }
  }

  const parsed = searchMovieMemorySchema.safeParse({
    query,
  });
  if (!parsed.success) {
    logger.warn(
      {
        userId: session.sub,
        requestKind,
        queryLength: query.length,
        durationMs: elapsedMs(startedAt),
      },
      'Movie memory search rejected: invalid query',
    );
    return movieMemoryJson({ error: 'Invalid movie search query' }, 422);
  }

  try {
    const movies = await searchMovieMemoryCatalog(parsed.data.query);
    logger.info(
      {
        userId: session.sub,
        requestKind,
        queryLength: parsed.data.query.length,
        returned: movies.length,
        durationMs: elapsedMs(startedAt),
      },
      'Movie memory search completed',
    );
    return movieMemoryJson({ movies }, 200);
  } catch (err) {
    logger.error(
      {
        err,
        userId: session.sub,
        requestKind,
        queryLength: parsed.data.query.length,
        durationMs: elapsedMs(startedAt),
      },
      'Failed to search movie catalog for memory',
    );
    return movieMemoryJson({ error: 'Failed to search movie catalog' }, 500);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return movieMemoryJson({ error: 'Unauthorized' }, 401);
  }

  const startedAt = Date.now();
  logger.info({ userId: session.sub }, 'Movie memory POST received');

  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) {
    logger.warn(
      {
        userId: session.sub,
        status: rateLimitResponse.status,
        durationMs: elapsedMs(startedAt),
      },
      'Movie memory POST rate limited',
    );
    return rateLimitResponse;
  }

  if (!hasValidSameOriginCsrfPair(req)) {
    logger.warn(
      { userId: session.sub, durationMs: elapsedMs(startedAt) },
      'Movie memory creation rejected: CSRF check failed',
    );
    return movieMemoryJson({ error: 'Forbidden' }, 403);
  }

  const payload = await req.json().catch(() => null);
  const parsedBatch = addMovieMemoryBatchSchema.safeParse(payload);
  if (parsedBatch.success) {
    const locale = parsedBatch.data.locale ?? parseLocaleFromRequest(req);
    try {
      const items = await addMovieMemoryBatchForUser(session.sub, parsedBatch.data.items, locale);
      logger.info(
        {
          userId: session.sub,
          requested: parsedBatch.data.items.length,
          saved: items.length,
          tmdbRequested: parsedBatch.data.items.filter((item) => item.movieId < 0).length,
          durationMs: elapsedMs(startedAt),
        },
        'Movie memory batch saved',
      );
      return movieMemoryJson(
        { status: 'saved', items, requested: parsedBatch.data.items.length },
        200,
      );
    } catch (err) {
      logger.error(
        {
          err,
          userId: session.sub,
          requested: parsedBatch.data.items.length,
          durationMs: elapsedMs(startedAt),
        },
        'Failed to save movie memory batch',
      );
      return movieMemoryJson({ error: 'Failed to save movie memory items' }, 500);
    }
  }

  const parsed = addMovieMemorySchema.safeParse(payload);
  if (!parsed.success) {
    logger.warn(
      { userId: session.sub, durationMs: elapsedMs(startedAt) },
      'Movie memory creation rejected: invalid payload',
    );
    return movieMemoryJson({ error: 'Invalid movie memory item' }, 422);
  }

  const locale = parsed.data.locale ?? parseLocaleFromRequest(req);
  try {
    const item = await addMovieMemoryItemForUser(
      session.sub,
      parsed.data.movieId,
      parsed.data.kind,
      locale,
    );
    if (!item) {
      logger.warn(
        {
          userId: session.sub,
          movieId: parsed.data.movieId,
          kind: parsed.data.kind,
          durationMs: elapsedMs(startedAt),
        },
        'Movie memory item not found in catalog',
      );
      return movieMemoryJson({ error: 'Movie not found' }, 404);
    }

    logger.info(
      {
        userId: session.sub,
        movieId: parsed.data.movieId,
        kind: parsed.data.kind,
        movieKey: item.movieKey,
        durationMs: elapsedMs(startedAt),
      },
      'Movie memory item saved',
    );
    return movieMemoryJson({ status: 'saved', item }, 200);
  } catch (err) {
    logger.error(
      {
        err,
        userId: session.sub,
        movieId: parsed.data.movieId,
        kind: parsed.data.kind,
        durationMs: elapsedMs(startedAt),
      },
      'Failed to save movie memory item',
    );
    return movieMemoryJson({ error: 'Failed to save movie memory item' }, 500);
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return movieMemoryJson({ error: 'Unauthorized' }, 401);
  }

  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  if (!hasValidSameOriginCsrfPair(req)) {
    logger.warn({ userId: session.sub }, 'Movie memory deletion rejected: CSRF check failed');
    return movieMemoryJson({ error: 'Forbidden' }, 403);
  }

  const payload = await req.json().catch(() => null);
  const parsed = deleteMovieMemorySchema.safeParse(payload);
  if (!parsed.success) {
    return movieMemoryJson({ error: 'Invalid movie memory item' }, 422);
  }

  try {
    const deleted = await deleteMovieMemoryForUser(session.sub, parsed.data.movieKey);
    if (!deleted) {
      return movieMemoryJson({ error: 'Movie memory item not found' }, 404);
    }

    return movieMemoryJson({ status: 'deleted' }, 200);
  } catch (err) {
    logger.error({ err, userId: session.sub }, 'Failed to delete movie memory item');
    return movieMemoryJson({ error: 'Failed to delete movie memory item' }, 500);
  }
}
