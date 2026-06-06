import logger from '@/lib/logger';
import { recordTMDBProviderError } from '@/lib/metrics';
import { GENRE_LABEL_TO_TMDB_ID } from '@/lib/tmdb';

import { MAX_TOTAL_MOVIES } from '../config';

import { getTopTMDBGenreIds } from './genreSelection';
import { tmdbDiscoverResponseSchema } from './types';

import type { PersonFormData } from '../types';
import type { TMDBDiscoverMovie, TMDBDiscoverQueryShape } from './types';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_DISCOVER_FETCH_TIMEOUT_MS = 8_000;

function getPreferenceText(allPeopleData: PersonFormData[]): string {
  return allPeopleData
    .flatMap((person) => [
      person.favoriteMovieWhy,
      person.newVsClassic,
      person.tonePreference,
      ...person.moodPreference,
    ])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLocaleLowerCase('en-US');
}

function hasAnyPreferenceTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function getWithoutGenreIds(preferenceText: string) {
  const withoutGenreIds = new Set<number>();
  if (hasAnyPreferenceTerm(preferenceText, ['avoid: horror', 'avoid horror', 'no horror'])) {
    withoutGenreIds.add(GENRE_LABEL_TO_TMDB_ID.horror);
  }
  if (hasAnyPreferenceTerm(preferenceText, ['avoid: gore', 'avoid gore', 'no gore'])) {
    withoutGenreIds.add(GENRE_LABEL_TO_TMDB_ID.horror);
  }
  return withoutGenreIds;
}

function getDominantEra(allPeopleData: PersonFormData[]) {
  const eraCounts: Record<string, number> = {};
  allPeopleData.forEach((person) => {
    const era = person.newVsClassic.toLowerCase();
    let key: string;
    if (era.includes('both')) {
      key = 'both';
    } else if (era.includes('classic')) {
      key = 'classic';
    } else if (era.includes('new')) {
      key = 'new';
    } else {
      key = 'both';
    }
    eraCounts[key] = (eraCounts[key] ?? 0) + 1;
  });
  return Object.entries(eraCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'both';
}

function getDominantTone(allPeopleData: PersonFormData[]) {
  const toneCounts: Record<string, number> = {};
  allPeopleData.forEach((person) => {
    const tone = person.tonePreference.toLowerCase();
    let key: string;
    if (tone.includes('serious')) {
      key = 'serious';
    } else if (tone.includes('dark')) {
      key = 'dark';
    } else if (tone.includes('balanced')) {
      key = 'balanced';
    } else {
      key = 'light';
    }
    toneCounts[key] = (toneCounts[key] ?? 0) + 1;
  });
  return Object.entries(toneCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'light';
}

function getReleaseDateBounds(dominantEra: string) {
  const currentYear = new Date().getFullYear();
  if (dominantEra === 'new') {
    return { primary_release_date_gte: `${currentYear - 5}-01-01` };
  }
  if (dominantEra === 'classic') {
    return { primary_release_date_lte: '2000-12-31' };
  }
  return {};
}

function getSortPreferences(preferenceText: string, dominantTone: string) {
  let sortBy =
    dominantTone === 'serious' || dominantTone === 'dark' ? 'vote_average.desc' : 'popularity.desc';
  let voteCountGte = 100;

  if (
    hasAnyPreferenceTerm(preferenceText, [
      'discovery appetite: safe hit',
      'proven hits',
      'familiar crowd-pleasers',
    ])
  ) {
    voteCountGte = 500;
    sortBy = 'popularity.desc';
  } else if (
    hasAnyPreferenceTerm(preferenceText, [
      'discovery appetite: surprise me',
      'unexpected picks',
      'surprise me',
    ])
  ) {
    voteCountGte = 50;
  }

  if (hasAnyPreferenceTerm(preferenceText, ['slow pacing'])) {
    voteCountGte = Math.max(voteCountGte, 250);
  }

  return { sortBy, voteCountGte };
}

export function buildTMDBDiscoverQueryShape(
  allPeopleData: PersonFormData[],
): TMDBDiscoverQueryShape {
  const preferenceText = getPreferenceText(allPeopleData);
  const withoutGenreIds = getWithoutGenreIds(preferenceText);
  const dominantEra = getDominantEra(allPeopleData);
  const dominantTone = getDominantTone(allPeopleData);
  const genreIds = getTopTMDBGenreIds(
    allPeopleData.flatMap((person) => person.moodPreference),
    { withoutGenreIds },
  );
  const with_runtime_lte = hasAnyPreferenceTerm(preferenceText, ['long runtime']) ? 125 : undefined;

  return {
    genreIds,
    withoutGenreIds: Array.from(withoutGenreIds),
    ...getReleaseDateBounds(dominantEra),
    ...getSortPreferences(preferenceText, dominantTone),
    with_runtime_lte,
  };
}

function buildDiscoverUrl(params: TMDBDiscoverQueryShape) {
  const url = new URL(`${TMDB_API_BASE}/discover/movie`);
  if (params.genreIds.length > 0) {
    url.searchParams.set('with_genres', params.genreIds.join('|'));
  }
  if (params.withoutGenreIds.length > 0) {
    url.searchParams.set('without_genres', params.withoutGenreIds.join('|'));
  }
  url.searchParams.set('sort_by', params.sortBy);
  url.searchParams.set('vote_count.gte', String(params.voteCountGte));
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('page', '1');
  if (params.primary_release_date_gte) {
    url.searchParams.set('primary_release_date.gte', params.primary_release_date_gte);
  }
  if (params.primary_release_date_lte) {
    url.searchParams.set('primary_release_date.lte', params.primary_release_date_lte);
  }
  if (params.with_runtime_lte) {
    url.searchParams.set('with_runtime.lte', String(params.with_runtime_lte));
  }
  return url.toString();
}

export async function fetchTMDBDiscoverMovies(
  allPeopleData: PersonFormData[],
  tmdbApiKey: string,
): Promise<TMDBDiscoverMovie[]> {
  try {
    const response = await fetch(buildDiscoverUrl(buildTMDBDiscoverQueryShape(allPeopleData)), {
      headers: {
        Authorization: `Bearer ${tmdbApiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(TMDB_DISCOVER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      recordTMDBProviderError('movie_discover', 'http_error');
      logger.warn({ status: response.status }, 'TMDB discover request failed');
      return [];
    }

    const parsedResponse = tmdbDiscoverResponseSchema.safeParse(await response.json());
    if (!parsedResponse.success) {
      recordTMDBProviderError('movie_discover', 'invalid_response');
      logger.warn({ zodError: parsedResponse.error }, 'TMDB discover response validation failed');
      return [];
    }
    return (parsedResponse.data.results ?? []).slice(0, MAX_TOTAL_MOVIES);
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      recordTMDBProviderError('movie_discover', 'timeout');
      logger.warn({ timeoutMs: TMDB_DISCOVER_FETCH_TIMEOUT_MS }, 'TMDB discover request timed out');
      return [];
    }
    recordTMDBProviderError('movie_discover', 'error');
    logger.warn({ err: error }, 'Error fetching movies from TMDB discover');
    return [];
  }
}
