import { NextRequest, NextResponse } from 'next/server';

import { getDbClient } from '@/clients/dbClient';
import logger from '@/lib/logger';
import { withAuth } from '@/lib/withAuth';

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

async function getHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Validate page and pageSize
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: 'Invalid page or pageSize parameters' }, { status: 400 });
    }

    // Check if database is configured
    const db = getDbClient();

    if (!db.isConfigured()) {
      // Return mock data when database is not configured (for development/demo)
      const mockMovies = generateMockMovies();
      const totalCount = mockMovies.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (page - 1) * pageSize;
      const paginatedMovies = mockMovies.slice(offset, offset + pageSize);

      const response: MoviesResponse = {
        movies: paginatedMovies,
        totalCount,
        page,
        pageSize,
        totalPages,
      };

      return NextResponse.json(response);
    }

    const offset = (page - 1) * pageSize;

    // Fetch paginated movies and total count in a single query
    const {
      data: movies,
      error,
      count,
    } = await db
      .from<Movie>('movies')
      .select('id, name, age_rating, duration, score_rating, year', { count: 'exact' })
      .range(offset, offset + pageSize - 1)
      .order('id', { ascending: true });

    if (error) {
      logger.error({ err: error }, 'Error fetching movies');
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }

    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const response: MoviesResponse = {
      movies: movies ?? [],
      totalCount,
      page,
      pageSize,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in movies API');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);

// Generate mock data for development/demo purposes
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

  // Create multiple pages of data by repeating and varying the sample movies
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
