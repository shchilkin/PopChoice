import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSessionFromRequest } from '@/lib/auth/session';
import {
  addUserMovieMemoryFromCatalog,
  deleteUserMovieMemory,
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
  })
  .strict();
const CSRF_COOKIE = '__csrf';

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

  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = searchMovieMemorySchema.safeParse({
    query: req.nextUrl.searchParams.get('query') ?? req.nextUrl.searchParams.get('q') ?? '',
  });
  if (!parsed.success) {
    return movieMemoryJson({ error: 'Invalid movie search query' }, 422);
  }

  try {
    const movies = await searchMovieCatalogForMemory(parsed.data.query);
    return movieMemoryJson({ movies }, 200);
  } catch (err) {
    logger.error({ err, userId: session.sub }, 'Failed to search movie catalog for memory');
    return movieMemoryJson({ error: 'Failed to search movie catalog' }, 500);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const session = getSessionFromRequest(req);
  if (!session) {
    return movieMemoryJson({ error: 'Unauthorized' }, 401);
  }

  const rateLimitResponse = await applyRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  if (!hasValidCsrf(req)) {
    logger.warn({ userId: session.sub }, 'Movie memory creation rejected: CSRF check failed');
    return movieMemoryJson({ error: 'Forbidden' }, 403);
  }

  const payload = await req.json().catch(() => null);
  const parsed = addMovieMemorySchema.safeParse(payload);
  if (!parsed.success) {
    return movieMemoryJson({ error: 'Invalid movie memory item' }, 422);
  }

  try {
    const item = await addUserMovieMemoryFromCatalog(session.sub, parsed.data.movieId, 'watched');
    if (!item) {
      return movieMemoryJson({ error: 'Movie not found' }, 404);
    }

    return movieMemoryJson({ status: 'saved', item }, 200);
  } catch (err) {
    logger.error({ err, userId: session.sub }, 'Failed to save movie memory item');
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
