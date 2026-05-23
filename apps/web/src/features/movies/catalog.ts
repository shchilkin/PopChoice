import { getDbClient } from '@/clients/dbClient';

import type { DbClient, QueryFilter, QuerySelect } from '@/clients/dbClient';

export interface Movie {
  id: number;
  name: string;
  age_rating: string;
  duration: number;
  score_rating: number;
  year: number;
}

export interface MoviesResponse {
  movies: Movie[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type MovieDurationFilter = 'under-90' | '90-120' | 'over-120';

export interface MoviesPageFilters {
  query?: string;
  yearFrom?: number;
  yearTo?: number;
  duration?: MovieDurationFilter;
  minScore?: number;
  ageRatings?: string[];
}

interface CountRow {
  count: number | string;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function normalizeQuery(query: string | undefined): string | undefined {
  const trimmed = query?.trim();
  return trimmed ? trimmed : undefined;
}

function applyMovieFilters<T extends Movie>(
  select: QuerySelect<T>,
  filters: MoviesPageFilters,
): QuerySelect<T> | QueryFilter<T> {
  let query: QuerySelect<T> | QueryFilter<T> = select;
  const titleQuery = normalizeQuery(filters.query);

  if (titleQuery) {
    query = query.ilike('name', `%${escapeLikePattern(titleQuery)}%`);
  }
  if (typeof filters.yearFrom === 'number') {
    query = query.gte('year', filters.yearFrom);
  }
  if (typeof filters.yearTo === 'number') {
    query = query.lte('year', filters.yearTo);
  }
  if (filters.duration === 'under-90') {
    query = query.lte('duration', 89);
  } else if (filters.duration === '90-120') {
    query = query.gte('duration', 90).lte('duration', 120);
  } else if (filters.duration === 'over-120') {
    query = query.gte('duration', 121);
  }
  if (typeof filters.minScore === 'number') {
    query = query.gte('score_rating', filters.minScore);
  }
  if (filters.ageRatings && filters.ageRatings.length > 0) {
    query = query.in('age_rating', filters.ageRatings);
  }

  return query;
}

function addSqlParam(values: unknown[], value: unknown): string {
  values.push(value);
  return `$${values.length}`;
}

function buildMoviesWhereSql(filters: MoviesPageFilters): { whereSql: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const searchQuery = normalizeQuery(filters.query);

  if (searchQuery) {
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
  if (typeof filters.yearFrom === 'number') {
    clauses.push(`movies.year >= ${addSqlParam(values, filters.yearFrom)}`);
  }
  if (typeof filters.yearTo === 'number') {
    clauses.push(`movies.year <= ${addSqlParam(values, filters.yearTo)}`);
  }
  if (filters.duration === 'under-90') {
    clauses.push(`movies.duration <= ${addSqlParam(values, 89)}`);
  } else if (filters.duration === '90-120') {
    clauses.push(
      `movies.duration BETWEEN ${addSqlParam(values, 90)} AND ${addSqlParam(values, 120)}`,
    );
  } else if (filters.duration === 'over-120') {
    clauses.push(`movies.duration >= ${addSqlParam(values, 121)}`);
  }
  if (typeof filters.minScore === 'number') {
    clauses.push(`movies.score_rating >= ${addSqlParam(values, filters.minScore)}`);
  }
  if (filters.ageRatings && filters.ageRatings.length > 0) {
    clauses.push(`movies.age_rating = ANY(${addSqlParam(values, filters.ageRatings)}::text[])`);
  }

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

async function getMoviesPageFromSql(
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
      SELECT id, name, age_rating, duration, score_rating, year
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

function filterMockMovies(movies: Movie[], filters: MoviesPageFilters): Movie[] {
  const titleQuery = normalizeQuery(filters.query)?.toLocaleLowerCase();
  return movies.filter((movie) => {
    const matchesTitle = titleQuery ? movie.name.toLocaleLowerCase().includes(titleQuery) : true;
    const matchesYearFrom =
      typeof filters.yearFrom === 'number' ? movie.year >= filters.yearFrom : true;
    const matchesYearTo = typeof filters.yearTo === 'number' ? movie.year <= filters.yearTo : true;
    const matchesDuration =
      filters.duration === 'under-90'
        ? movie.duration < 90
        : filters.duration === '90-120'
          ? movie.duration >= 90 && movie.duration <= 120
          : filters.duration === 'over-120'
            ? movie.duration > 120
            : true;
    const matchesScore =
      typeof filters.minScore === 'number' ? movie.score_rating >= filters.minScore : true;
    const matchesAgeRating =
      filters.ageRatings && filters.ageRatings.length > 0
        ? filters.ageRatings.includes(movie.age_rating)
        : true;
    return (
      matchesTitle &&
      matchesYearFrom &&
      matchesYearTo &&
      matchesDuration &&
      matchesScore &&
      matchesAgeRating
    );
  });
}

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

function buildMoviesResponse(movies: Movie[], page: number, pageSize: number): MoviesResponse {
  const totalCount = movies.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const offset = (page - 1) * pageSize;

  return {
    movies: movies.slice(offset, offset + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

function generateMockMovies(): Movie[] {
  const movies: Movie[] = [];
  const sampleMovies = [
    {
      name: 'Casablanca',
      age_rating: 'PG',
      duration: 102,
      score_rating: 8.5,
      year: 1942,
    },
    {
      name: 'Seven Samurai',
      age_rating: 'NR',
      duration: 207,
      score_rating: 8.6,
      year: 1954,
    },
    {
      name: 'The Godfather',
      age_rating: 'R',
      duration: 175,
      score_rating: 9.2,
      year: 1972,
    },
    {
      name: "One Flew Over the Cuckoo's Nest",
      age_rating: '15',
      duration: 133,
      score_rating: 8.7,
      year: 1975,
    },
    {
      name: 'Star Wars: Episode IV - A New Hope',
      age_rating: 'G',
      duration: 121,
      score_rating: 8.6,
      year: 1977,
    },
    {
      name: 'The Avengers',
      age_rating: 'PG-13',
      duration: 143,
      score_rating: 8.0,
      year: 2012,
    },
    {
      name: "Harry Potter and the Philosopher's Stone",
      age_rating: '12+',
      duration: 152,
      score_rating: 7.6,
      year: 2001,
    },
    {
      name: 'Deadpool',
      age_rating: '16+',
      duration: 108,
      score_rating: 8.0,
      year: 2016,
    },
    {
      name: 'John Wick',
      age_rating: '18+',
      duration: 101,
      score_rating: 7.4,
      year: 2014,
    },
  ];

  for (let i = 0; i < 123; i++) {
    const baseMovie = sampleMovies[i % sampleMovies.length];
    movies.push({
      id: i + 1,
      name:
        i === 0 ? baseMovie.name : `${baseMovie.name} ${Math.floor(i / sampleMovies.length) + 1}`,
      age_rating: baseMovie.age_rating,
      duration: baseMovie.duration + (i % 10),
      score_rating: Math.round((baseMovie.score_rating + (i % 20) * 0.1) * 10) / 10,
      year: baseMovie.year + (i % 40),
    });
  }

  return movies;
}
