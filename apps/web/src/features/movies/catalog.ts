import { getDbClient } from '@/clients/dbClient';

import type { QueryFilter, QuerySelect } from '@/clients/dbClient';

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

export interface MoviesPageFilters {
  query?: string;
  yearFrom?: number;
  yearTo?: number;
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

  return query;
}

function filterMockMovies(movies: Movie[], filters: MoviesPageFilters): Movie[] {
  const titleQuery = normalizeQuery(filters.query)?.toLocaleLowerCase();
  return movies.filter((movie) => {
    const matchesTitle = titleQuery ? movie.name.toLocaleLowerCase().includes(titleQuery) : true;
    const matchesYearFrom =
      typeof filters.yearFrom === 'number' ? movie.year >= filters.yearFrom : true;
    const matchesYearTo = typeof filters.yearTo === 'number' ? movie.year <= filters.yearTo : true;
    return matchesTitle && matchesYearFrom && matchesYearTo;
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
