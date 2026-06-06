import { z } from 'zod';

import { IMAGE_BASE_URL } from '@/integrations/tmdb';
import {
  getMovieMemoryCandidateStatsForUser,
  getMovieMemoryCandidatesForUser,
  getUserMovieMemorySummaries,
} from '@/lib/db/recommendations';
import { LOCALE_TO_TMDB_LANG } from '@/lib/locale';
import logger from '@/lib/logger';
import { getMovieIdentityKey, getYearFromReleaseDate } from '@/lib/movieIdentity';

import { CANDIDATE_LIMIT } from './types';

import type {
  MovieMemoryCandidate,
  MovieMemoryCandidateResult,
  MovieMemoryCandidateSource,
  MovieMemoryLogContext,
} from './types';
import type { UserMovieMemorySummary } from '@/lib/db/recommendations';
import type { Locale } from '@/lib/locale';

const TMDB_DISCOVER_FETCH_TIMEOUT_MS = 8_000;
const TMDB_DISCOVER_MAX_PAGES = 3;

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

type TMDBCandidate = z.infer<typeof tmdbCandidateSchema>;
type TMDBDiscoverResponse = z.infer<typeof tmdbDiscoverResponseSchema>;

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

function buildTMDBDiscoverUrl(page: number, tmdbLanguage: string): string {
  const url = new URL('https://api.themoviedb.org/3/discover/movie');
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('language', tmdbLanguage);
  url.searchParams.set('page', String(page));
  url.searchParams.set('sort_by', 'vote_average.desc');
  url.searchParams.set('vote_count.gte', '1000');
  return url.toString();
}

async function fetchTMDBDiscoverPage(
  page: number,
  tmdbApiKey: string,
  tmdbLanguage: string,
): Promise<TMDBDiscoverResponse | null> {
  try {
    const response = await fetch(buildTMDBDiscoverUrl(page, tmdbLanguage), {
      headers: { Authorization: `Bearer ${tmdbApiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TMDB_DISCOVER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, page }, 'Movie memory TMDB fallback failed');
      return null;
    }

    const responseBody = tmdbDiscoverResponseSchema.safeParse(await response.json());
    if (!responseBody.success) {
      logger.warn({ err: responseBody.error, page }, 'Movie memory TMDB fallback response invalid');
      return null;
    }

    return responseBody.data;
  } catch (err: unknown) {
    logger.warn({ err, page }, 'Movie memory TMDB fallback failed');
    return null;
  }
}

function getTMDBCandidateTitles(movie: TMDBCandidate, locale: Locale) {
  const canonicalTitle = movie.original_title?.trim() || movie.title;
  const localizedName =
    locale !== 'en' && movie.title.trim() && movie.title.trim() !== canonicalTitle
      ? movie.title
      : null;

  return { canonicalTitle, localizedName };
}

function toMovieMemoryCandidate(
  movie: TMDBCandidate,
  locale: Locale,
): MovieMemoryCandidate | undefined {
  const movieYear = getYearFromReleaseDate(movie.release_date);
  const { canonicalTitle, localizedName } = getTMDBCandidateTitles(movie, locale);
  const movieKey = getMovieIdentityKey({
    tmdbId: movie.id,
    title: canonicalTitle,
    year: movieYear,
  });
  if (!movieKey) return undefined;

  return {
    id: -movie.id,
    tmdbId: movie.id,
    movieName: canonicalTitle,
    movieYear,
    posterURL: getPosterURL(movie.poster_path),
    localizedName,
    duration: null,
    description: locale === 'en' ? movie.overview || null : null,
    localizedOverview: locale === 'en' ? null : movie.overview || null,
  };
}

function appendTMDBMemoryCandidate(
  candidates: MovieMemoryCandidate[],
  seenCandidateKeys: Set<string>,
  excluded: Set<string>,
  movie: TMDBCandidate,
  locale: Locale,
): void {
  const candidate = toMovieMemoryCandidate(movie, locale);
  if (!candidate) return;

  const movieKey = getMovieIdentityKey({
    tmdbId: candidate.tmdbId,
    title: candidate.movieName,
    year: candidate.movieYear,
  });
  if (!movieKey || excluded.has(movieKey) || seenCandidateKeys.has(movieKey)) return;

  seenCandidateKeys.add(movieKey);
  candidates.push(candidate);
}

function appendTMDBMemoryCandidates(
  candidates: MovieMemoryCandidate[],
  seenCandidateKeys: Set<string>,
  excluded: Set<string>,
  movies: TMDBCandidate[],
  locale: Locale,
  limit: number,
): void {
  for (const movie of movies) {
    appendTMDBMemoryCandidate(candidates, seenCandidateKeys, excluded, movie, locale);
    if (candidates.length >= limit) break;
  }
}

async function getTMDBMovieMemoryCandidatesForUser(
  userId: string,
  limit: number,
  locale: Locale,
): Promise<MovieMemoryCandidate[]> {
  const tmdbApiKey = process.env.TMDB_API_KEY;
  if (!tmdbApiKey) return [];

  const memoryItems = await getUserMovieMemorySummaries(userId, 100);
  const excluded = buildMemoryExclusionSet(memoryItems);
  const candidates: MovieMemoryCandidate[] = [];
  const seenCandidateKeys = new Set<string>();
  const tmdbLanguage = LOCALE_TO_TMDB_LANG[locale] ?? 'en-US';

  for (let page = 1; page <= TMDB_DISCOVER_MAX_PAGES && candidates.length < limit; page++) {
    const parsed = await fetchTMDBDiscoverPage(page, tmdbApiKey, tmdbLanguage);
    if (!parsed) break;
    appendTMDBMemoryCandidates(
      candidates,
      seenCandidateKeys,
      excluded,
      parsed.results ?? [],
      locale,
      limit,
    );
  }

  return candidates;
}

export async function loadMovieMemoryCandidatesForUser(
  userId: string,
  locale: Locale,
  {
    limit = CANDIDATE_LIMIT,
    logContext = {},
  }: { limit?: number; logContext?: MovieMemoryLogContext } = {},
): Promise<MovieMemoryCandidateResult> {
  let movies = await getMovieMemoryCandidatesForUser(userId, limit);
  let emptyStats: MovieMemoryCandidateResult['emptyStats'];
  let source: MovieMemoryCandidateSource = 'catalog';

  if (movies.length === 0) {
    try {
      emptyStats = await getMovieMemoryCandidateStatsForUser(userId);
    } catch (statsErr) {
      logger.warn(
        { err: statsErr, userId, ...logContext },
        'Failed to collect empty movie memory candidate stats',
      );
    }

    try {
      movies = await getTMDBMovieMemoryCandidatesForUser(userId, limit, locale);
      if (movies.length > 0) source = 'tmdb';
    } catch (tmdbErr) {
      logger.warn(
        { err: tmdbErr, userId, locale, ...logContext },
        'Movie memory TMDB fallback failed',
      );
    }
  }

  return { movies, source, emptyStats };
}
