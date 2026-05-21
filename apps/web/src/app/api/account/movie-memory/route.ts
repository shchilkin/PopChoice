import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  addUserMovieMemoryBatchFromCatalog,
  addUserMovieMemoryFromCatalog,
  deleteUserMovieMemory,
  getMovieMemoryCandidatesForUser,
  searchMovieCatalogForMemory,
} from '@/lib/db/recommendations';
import logger from '@/lib/logger';
import { applyRateLimit } from '@/lib/rateLimit';
import { isSameOriginBrowserRequest } from '@/lib/withAuth';

const privateResponseHeaders = {
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

const deleteMovieMemorySchema = z
  .object({
    movieKey: z.string().min(1).max(160),
  })
  .strict();
const searchMovieMemorySchema = z
  .object({
    query: z.string().trim().min(2).max(80),
  })
  .strict();
const addMovieMemorySchema = z
  .object({
    movieId: z.coerce.number().int().positive(),
    kind: z.enum(['watched', 'not_seen']).optional().default('watched'),
  })
  .strict();
const addMovieMemoryBatchSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            movieId: z.coerce.number().int().positive(),
            kind: z.enum(['watched', 'not_seen']).optional().default('watched'),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
const CSRF_COOKIE = '__csrf';
const CANDIDATE_LIMIT = 20;

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function movieMemoryJson(body: unknown, status: number): Response {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

function hasValidCsrf(req: NextRequest): boolean {
  const csrfHeader = req.headers.get('x-csrf-token');
  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
  return Boolean(
    csrfHeader && csrfCookie && csrfHeader === csrfCookie && isSameOriginBrowserRequest(req),
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return movieMemoryJson({ error: 'Unauthorized' }, 401);
  }

  const startedAt = Date.now();
  const isCandidatesRequest = req.nextUrl.searchParams.get('mode') === 'candidates';
  const query = req.nextUrl.searchParams.get('query') ?? req.nextUrl.searchParams.get('q') ?? '';
  const requestKind = isCandidatesRequest ? 'candidates' : 'search';
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
      const movies = await getMovieMemoryCandidatesForUser(session.sub, CANDIDATE_LIMIT);
      logger.info(
        {
          userId: session.sub,
          requestKind,
          requested: CANDIDATE_LIMIT,
          returned: movies.length,
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
    const movies = await searchMovieCatalogForMemory(parsed.data.query);
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

  if (!hasValidCsrf(req)) {
    logger.warn(
      { userId: session.sub, durationMs: elapsedMs(startedAt) },
      'Movie memory creation rejected: CSRF check failed',
    );
    return movieMemoryJson({ error: 'Forbidden' }, 403);
  }

  const payload = await req.json().catch(() => null);
  const parsedBatch = addMovieMemoryBatchSchema.safeParse(payload);
  if (parsedBatch.success) {
    try {
      const items = await addUserMovieMemoryBatchFromCatalog(session.sub, parsedBatch.data.items);
      logger.info(
        {
          userId: session.sub,
          requested: parsedBatch.data.items.length,
          saved: items.length,
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

  try {
    const item = await addUserMovieMemoryFromCatalog(
      session.sub,
      parsed.data.movieId,
      parsed.data.kind,
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

  if (!hasValidCsrf(req)) {
    logger.warn({ userId: session.sub }, 'Movie memory deletion rejected: CSRF check failed');
    return movieMemoryJson({ error: 'Forbidden' }, 403);
  }

  const payload = await req.json().catch(() => null);
  const parsed = deleteMovieMemorySchema.safeParse(payload);
  if (!parsed.success) {
    return movieMemoryJson({ error: 'Invalid movie memory item' }, 422);
  }

  try {
    const deleted = await deleteUserMovieMemory(session.sub, parsed.data.movieKey);
    if (!deleted) {
      return movieMemoryJson({ error: 'Movie memory item not found' }, 404);
    }

    return movieMemoryJson({ status: 'deleted' }, 200);
  } catch (err) {
    logger.error({ err, userId: session.sub }, 'Failed to delete movie memory item');
    return movieMemoryJson({ error: 'Failed to delete movie memory item' }, 500);
  }
}
