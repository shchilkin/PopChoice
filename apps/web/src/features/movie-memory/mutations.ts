import { MovieService } from '@/integrations/tmdb';
import {
  addUserMovieMemoryBatchFromCatalog,
  addUserMovieMemoryFromCatalog,
  addUserMovieMemoryFromExternalMovie,
} from '@/lib/db/recommendations';
import { LOCALE_TO_TMDB_LANG } from '@/lib/locale';
import { getYearFromReleaseDate } from '@/lib/movieIdentity';

import type { MovieMemoryInteractionKind } from './types';
import type { UserMovieMemorySummary } from '@/lib/db/recommendations';
import type { Locale } from '@/lib/locale';

const movieService = new MovieService();

async function addUserMovieMemoryFromTMDB(
  userId: string,
  transientMovieId: number,
  kind: MovieMemoryInteractionKind,
  locale: Locale,
): Promise<UserMovieMemorySummary | null> {
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

export async function addMovieMemoryItemForUser(
  userId: string,
  movieId: number,
  kind: MovieMemoryInteractionKind,
  locale: Locale,
): Promise<UserMovieMemorySummary | null> {
  if (movieId < 0) {
    return addUserMovieMemoryFromTMDB(userId, movieId, kind, locale);
  }

  return addUserMovieMemoryFromCatalog(userId, movieId, kind);
}

export async function addMovieMemoryBatchForUser(
  userId: string,
  items: Array<{ movieId: number; kind?: MovieMemoryInteractionKind }>,
  locale: Locale,
): Promise<UserMovieMemorySummary[]> {
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
