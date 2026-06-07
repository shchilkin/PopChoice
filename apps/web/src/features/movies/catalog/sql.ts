import { escapeLikePattern, getDurationBounds, normalizeQuery } from './filterUtils';

import type { CountRow, DurationBounds, Movie, MoviesPageFilters, MoviesResponse } from './types';
import type { DbClient } from '@/clients/dbClient';

type SqlClauseBuilder = (clauses: string[], values: unknown[], filters: MoviesPageFilters) => void;

function addSqlParam(values: unknown[], value: unknown): string {
  values.push(value);
  return `$${values.length}`;
}

function addTitleSqlClause(clauses: string[], values: unknown[], filters: MoviesPageFilters): void {
  const searchQuery = normalizeQuery(filters.query);
  if (!searchQuery) return;

  const patternParam = addSqlParam(values, `%${escapeLikePattern(searchQuery)}%`);
  clauses.push(`(
      movies.name ILIKE ${patternParam} ESCAPE '\\'
      OR EXISTS (
        SELECT 1
        FROM movie_people
        JOIN catalog_people ON catalog_people.id = movie_people.person_id
        WHERE movie_people.movie_id = movies.id
          AND catalog_people.name ILIKE ${patternParam} ESCAPE '\\'
      )
      OR EXISTS (
        SELECT 1
        FROM movie_genres
        JOIN catalog_genres ON catalog_genres.id = movie_genres.genre_id
        WHERE movie_genres.movie_id = movies.id
          AND catalog_genres.name ILIKE ${patternParam} ESCAPE '\\'
      )
    )`);
}

function addRangeSqlClause(
  clauses: string[],
  values: unknown[],
  column: keyof Movie & string,
  range: DurationBounds | undefined,
): void {
  if (typeof range?.min === 'number' && typeof range.max === 'number') {
    clauses.push(
      `movies.${column} BETWEEN ${addSqlParam(values, range.min)} AND ${addSqlParam(
        values,
        range.max,
      )}`,
    );
    return;
  }

  if (typeof range?.min === 'number')
    clauses.push(`movies.${column} >= ${addSqlParam(values, range.min)}`);
  if (typeof range?.max === 'number')
    clauses.push(`movies.${column} <= ${addSqlParam(values, range.max)}`);
}

function addYearSqlClause(clauses: string[], values: unknown[], filters: MoviesPageFilters): void {
  addRangeSqlClause(clauses, values, 'year', { min: filters.yearFrom, max: filters.yearTo });
}

function addDurationSqlClause(
  clauses: string[],
  values: unknown[],
  filters: MoviesPageFilters,
): void {
  addRangeSqlClause(clauses, values, 'duration', getDurationBounds(filters.duration));
}

function addScoreSqlClause(clauses: string[], values: unknown[], filters: MoviesPageFilters): void {
  if (typeof filters.minScore === 'number') {
    clauses.push(`movies.score_rating >= ${addSqlParam(values, filters.minScore)}`);
  }
}

function addAgeRatingSqlClause(
  clauses: string[],
  values: unknown[],
  filters: MoviesPageFilters,
): void {
  if (filters.ageRatings?.length) {
    clauses.push(`movies.age_rating = ANY(${addSqlParam(values, filters.ageRatings)}::text[])`);
  }
}

const SQL_CLAUSE_BUILDERS = [
  addTitleSqlClause,
  addYearSqlClause,
  addDurationSqlClause,
  addScoreSqlClause,
  addAgeRatingSqlClause,
] satisfies SqlClauseBuilder[];

function buildMoviesWhereSql(filters: MoviesPageFilters): { whereSql: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  SQL_CLAUSE_BUILDERS.forEach((buildClause) => buildClause(clauses, values, filters));

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join('\n  AND ')}` : '',
    values,
  };
}

function parseCount(value: CountRow['count'] | undefined): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function getMoviesPageFromSql(
  db: DbClient & Required<Pick<DbClient, 'query'>>,
  page: number,
  pageSize: number,
  filters: MoviesPageFilters,
): Promise<MoviesResponse> {
  const offset = (page - 1) * pageSize;
  const { whereSql, values } = buildMoviesWhereSql(filters);
  const countResult = await db.query<CountRow>(
    `
      SELECT COUNT(*)::int AS count
      FROM movies
      ${whereSql}
    `,
    values,
  );
  const totalCount = parseCount(countResult.rows[0]?.count);
  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;
  const moviesResult = await db.query<Movie>(
    `
      SELECT id, name, localized_name, poster_url, age_rating, duration, score_rating, year
      FROM movies
      ${whereSql}
      ORDER BY id ASC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    [...values, pageSize, offset],
  );

  return {
    movies: moviesResult.rows,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
