import { escapeLikePattern, getDurationBounds, isInRange, normalizeQuery } from './filterUtils';

import type { DurationBounds, Movie, MoviesPageFilters } from './types';
import type { QueryFilter, QuerySelect } from '@/clients/dbClient';

type QueryFilterApplier<T extends Movie> = (
  query: QuerySelect<T> | QueryFilter<T>,
  filters: MoviesPageFilters,
) => QuerySelect<T> | QueryFilter<T>;

function applyTitleQueryFilter<T extends Movie>(
  query: QuerySelect<T> | QueryFilter<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  const titleQuery = normalizeQuery(filters.query);
  return titleQuery ? query.ilike('name', `%${escapeLikePattern(titleQuery)}%`) : query;
}

function applyRangeQueryFilter<T extends Movie>(
  query: QuerySelect<T> | QueryFilter<T>,
  column: keyof Movie & string,
  range: DurationBounds | undefined,
): QuerySelect<T> | QueryFilter<T> {
  let nextQuery = query;
  if (typeof range?.min === 'number') nextQuery = nextQuery.gte(column, range.min);
  if (typeof range?.max === 'number') nextQuery = nextQuery.lte(column, range.max);
  return nextQuery;
}

function applyYearQueryFilter<T extends Movie>(
  query: QuerySelect<T> | QueryFilter<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  return applyRangeQueryFilter(query, 'year', { min: filters.yearFrom, max: filters.yearTo });
}

function applyDurationQueryFilter<T extends Movie>(
  query: QuerySelect<T> | QueryFilter<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  return applyRangeQueryFilter(query, 'duration', getDurationBounds(filters.duration));
}

function applyScoreQueryFilter<T extends Movie>(
  query: QuerySelect<T> | QueryFilter<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  return typeof filters.minScore === 'number' ? query.gte('score_rating', filters.minScore) : query;
}

function applyAgeRatingQueryFilter<T extends Movie>(
  query: QuerySelect<T> | QueryFilter<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  return filters.ageRatings?.length ? query.in('age_rating', filters.ageRatings) : query;
}

const QUERY_FILTER_APPLIERS = [
  applyTitleQueryFilter,
  applyYearQueryFilter,
  applyDurationQueryFilter,
  applyScoreQueryFilter,
  applyAgeRatingQueryFilter,
] satisfies QueryFilterApplier<Movie>[];

export function applyMovieFilters<T extends Movie>(
  select: QuerySelect<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  return QUERY_FILTER_APPLIERS.reduce<QuerySelect<T> | QueryFilter<T>>(
    (query, applyFilter) => applyFilter(query, filters),
    select,
  );
}

export function filterMockMovies(movies: Movie[], filters: MoviesPageFilters): Movie[] {
  const titleQuery = normalizeQuery(filters.query)?.toLocaleLowerCase();
  return movies.filter((movie) => movieMatchesFilters(movie, filters, titleQuery));
}

function movieMatchesFilters(
  movie: Movie,
  filters: MoviesPageFilters,
  titleQuery: string | undefined,
): boolean {
  return (
    (!titleQuery || movie.name.toLocaleLowerCase().includes(titleQuery)) &&
    isInRange(movie.year, { min: filters.yearFrom, max: filters.yearTo }) &&
    isInRange(movie.duration, getDurationBounds(filters.duration)) &&
    (typeof filters.minScore !== 'number' || movie.score_rating >= filters.minScore) &&
    (!filters.ageRatings?.length || filters.ageRatings.includes(movie.age_rating))
  );
}
