import { getDbClient } from '@/clients/dbClient';

import { buildMoviesResponse, generateMockMovies } from './catalog/mock';
import { filterMockMovies, applyMovieFilters } from './catalog/queryFilters';
import { getMoviesPageFromSql } from './catalog/sql';

import type { Movie, MoviesPageFilters, MoviesResponse } from './catalog/types';
import type { DbClient } from '@/clients/dbClient';

export type {
  Movie,
  MovieDurationFilter,
  MoviesPageFilters,
  MoviesResponse,
} from './catalog/types';

export async function getMoviesPage(
  page: number,
  pageSize: number,
  filters: MoviesPageFilters = {},
): Promise<MoviesResponse> {
  const db = getDbClient();

  if (!db.isConfigured()) {
    return buildMoviesResponse(filterMockMovies(generateMockMovies(), filters), page, pageSize);
  }

  if (db.query) {
    return getMoviesPageFromSql(
      db as DbClient & Required<Pick<DbClient, 'query'>>,
      page,
      pageSize,
      filters,
    );
  }

  const offset = (page - 1) * pageSize;
  const {
    data: movies,
    error,
    count,
  } = await applyMovieFilters(
    db
      .from<Movie>('movies')
      .select('id, name, age_rating, duration, score_rating, year', { count: 'exact' }),
    filters,
  )
    .range(offset, offset + pageSize - 1)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return {
    movies: movies ?? [],
    totalCount: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}
