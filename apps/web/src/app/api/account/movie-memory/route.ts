import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { IMAGE_BASE_URL, MovieService } from '@/integrations/tmdb';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  addUserMovieMemoryBatchFromCatalog,
  addUserMovieMemoryFromExternalMovie,
  addUserMovieMemoryFromCatalog,
  deleteUserMovieMemory,
  getMovieMemoryCandidateStatsForUser,
  getMovieMemoryCandidatesForUser,
  getUserMovieMemoryPage,
  getUserMovieMemorySummaries,
  searchMovieCatalogForMemory,
  type UserMovieMemorySummary,
} from '@/lib/db/recommendations';
import {
  LOCALE_TO_TMDB_LANG,
  parseLocale,
  parseLocaleFromRequest,
  type Locale,
} from '@/lib/locale';
import logger from '@/lib/logger';
import { getMovieIdentityKey, getYearFromReleaseDate } from '@/lib/movieIdentity';
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
const listMovieMemorySchema = z
  .object({
    offset: z.coerce.number().int().min(0).optional().default(0),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();
const movieMemoryIdSchema = z.coerce
  .number()
  .int()
  .refine((value) => value !== 0, 'Movie id is required');
const addMovieMemorySchema = z
  .object({
    movieId: movieMemoryIdSchema,
    kind: z.enum(['watched', 'not_seen']).optional().default('watched'),
    locale: z.enum(['en', 'ru', 'fi']).optional(),
  })
  .strict();
const addMovieMemoryBatchSchema = z
  .object({
    locale: z.enum(['en', 'ru', 'fi']).optional(),
    items: z
      .array(
        z
          .object({
            movieId: movieMemoryIdSchema,
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
const TMDB_DISCOVER_FETCH_TIMEOUT_MS = 8_000;
const TMDB_DISCOVER_MAX_PAGES = 3;
const movieService = new MovieService();

const tmdbCandidateSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().optional().nullable(),
  release_date: z.string().optional().nullable(),
  poster_path: z.string().nullable(),
  overview: z.string().optional().nullable(),
  vote_average: z.number().optional(),
});

const tmdbDiscoverResponseSchema = z.object({
  results: z.array(tmdbCandidateSchema).optional(),
});

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

function parseRequestedLocale(req: NextRequest): Locale {
  const localeParam = req.nextUrl.searchParams.get('locale');
  return localeParam ? parseLocale(localeParam) : parseLocaleFromRequest(req);
}

function getPosterURL(posterPath: string | null | undefined): string | null {
  return posterPath ? `${IMAGE_BASE_URL}/w500${posterPath}` : null;
}

function buildMemoryExclusionSet(items: UserMovieMemorySummary[]): Set<string> {
  const excluded = new Set<string>();
  for (const item of items) {
    excluded.add(item.movieKey);
    const derivedKey = getMovieIdentityKey({
      tmdbId: item.tmdbId,
      title: item.movieName,
      year: item.movieYear,
    });
    if (derivedKey) excluded.add(derivedKey);
  }

  return excluded;
}

async function getTMDBMovieMemoryCandidatesForUser(
  userId: string,
  limit: number,
  locale: Locale,
): Promise<Awaited<ReturnType<typeof getMovieMemoryCandidatesForUser>>> {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return [];

  const memoryItems = await getUserMovieMemorySummaries(userId, 100);
  const excluded = buildMemoryExclusionSet(memoryItems);
  const candidates: Awaited<ReturnType<typeof getMovieMemoryCandidatesForUser>> = [];
  const seenCandidateKeys = new Set<string>();
  const tmdbLanguage = LOCALE_TO_TMDB_LANG[locale] ?? 'en-US';

  for (let page = 1; page <= TMDB_DISCOVER_MAX_PAGES && candidates.length < limit; page++) {
    const url = new URL('https://api.themoviedb.org/3/discover/movie');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('language', tmdbLanguage);
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort_by', 'vote_average.desc');
    url.searchParams.set('vote_count.gte', '1000');

    const parsed = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tmdbApiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TMDB_DISCOVER_FETCH_TIMEOUT_MS),
    })
      .then(async (response) => {
        if (!response.ok) {
          logger.warn({ status: response.status, page }, 'Movie memory TMDB fallback failed');
          return null;
        }

        const responseBody = tmdbDiscoverResponseSchema.safeParse(await response.json());
        if (!responseBody.success) {
          logger.warn(
            { err: responseBody.error, page },
            'Movie memory TMDB fallback response invalid',
          );
          return null;
        }

        return responseBody.data;
      })
      .catch((err: unknown) => {
        logger.warn({ err, page }, 'Movie memory TMDB fallback failed');
        return null;
      });
    if (!parsed) {
      break;
    }

    for (const movie of parsed.results ?? []) {
      const movieYear = getYearFromReleaseDate(movie.release_date);
      const canonicalTitle = movie.original_title?.trim() || movie.title;
      const localizedTitle =
        locale !== 'en' && movie.title.trim() && movie.title.trim() !== canonicalTitle
          ? movie.title
          : null;
      const movieKey = getMovieIdentityKey({
        tmdbId: movie.id,
        title: canonicalTitle,
        year: movieYear,
      });
      if (!movieKey || excluded.has(movieKey) || seenCandidateKeys.has(movieKey)) continue;

      seenCandidateKeys.add(movieKey);
      candidates.push({
        id: -movie.id,
        tmdbId: movie.id,
        movieName: canonicalTitle,
        movieYear,
        posterURL: getPosterURL(movie.poster_path),
        localizedName: localizedTitle,
        duration: null,
        description: locale === 'en' ? movie.overview || null : null,
        localizedOverview: locale === 'en' ? null : movie.overview || null,
      });

      if (candidates.length >= limit) break;
    }
  }

  return candidates;
}

async function addUserMovieMemoryFromTMDB(
  userId: string,
  transientMovieId: number,
  kind: 'watched' | 'not_seen',
  locale: Locale,
) {
  const tmdbId = Math.abs(transientMovieId);
  const movie = await movieService.getMovieById(tmdbId);
  if (!movie) return null;

  const localized =
    locale === 'en'
      ? undefined
      : await movieService.getLocalizedMovieInfo(tmdbId, LOCALE_TO_TMDB_LANG[locale]);

  const localizedName =
    localized?.title && localized.title.trim() !== movie.title.trim() ? localized.title : null;
  const posterURL =
    movieService.getPosterURL(localized?.poster_path ?? movie.poster_path, 'w500') ?? null;

  return addUserMovieMemoryFromExternalMovie(
    userId,
    {
      tmdbId: movie.id,
      movieName: movie.title,
      movieYear: getYearFromReleaseDate(movie.release_date),
      posterURL,
      localizedName,
    },
    kind,
  );
}

async function addUserMovieMemoryItem(
  userId: string,
  movieId: number,
  kind: 'watched' | 'not_seen',
  locale: Locale,
) {
  if (movieId < 0) {
    return addUserMovieMemoryFromTMDB(userId, movieId, kind, locale);
  }

  return addUserMovieMemoryFromCatalog(userId, movieId, kind);
}

async function addUserMovieMemoryBatch(
  userId: string,
  items: Array<{ movieId: number; kind?: 'watched' | 'not_seen' }>,
  locale: Locale,
) {
  const localItems = items.filter((item) => item.movieId > 0);
  const tmdbItems = items.filter((item) => item.movieId < 0);
  const saved = await addUserMovieMemoryBatchFromCatalog(userId, localItems);

  for (const item of tmdbItems) {
    const result = await addUserMovieMemoryFromTMDB(
      userId,
      item.movieId,
      item.kind ?? 'watched',
      locale,
    );
    if (result) saved.push(result);
  }

  return saved;
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
      let movies = await getMovieMemoryCandidatesForUser(session.sub, CANDIDATE_LIMIT);
      let emptyStats: Awaited<ReturnType<typeof getMovieMemoryCandidateStatsForUser>> | undefined;
      let source: 'catalog' | 'tmdb' = 'catalog';
      if (movies.length === 0) {
        try {
          emptyStats = await getMovieMemoryCandidateStatsForUser(session.sub);
        } catch (statsErr) {
          logger.warn(
            { err: statsErr, userId: session.sub, requestKind },
            'Failed to collect empty movie memory candidate stats',
          );
        }
        try {
          movies = await getTMDBMovieMemoryCandidatesForUser(session.sub, CANDIDATE_LIMIT, locale);
          if (movies.length > 0) source = 'tmdb';
        } catch (tmdbErr) {
          logger.warn(
            { err: tmdbErr, userId: session.sub, requestKind, locale },
            'Movie memory TMDB fallback failed',
          );
        }
      }
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
      const page = await getUserMovieMemoryPage(session.sub, parsed.data);
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
    const locale = parsedBatch.data.locale ?? parseLocaleFromRequest(req);
    try {
      const items = await addUserMovieMemoryBatch(session.sub, parsedBatch.data.items, locale);
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
    const item = await addUserMovieMemoryItem(
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
