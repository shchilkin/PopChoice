import { NextRequest, NextResponse } from 'next/server';

export interface Movie {
  id: number;
  name: string;
  age_rating: string;
  description: string;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Validate page and pageSize
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: 'Invalid page or pageSize parameters' }, { status: 400 });
    }

    // Check if Supabase is configured
    const privateKey = process.env.SUPABASE_API_KEY;
    const url = process.env.SUPABASE_URL;

    if (!privateKey || !url) {
      // Return mock data when Supabase is not configured (for development/demo)
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

    // Only import Supabase when we have the credentials
    const { supabase } = await import('@/clients/supabaseClient');
    const offset = (page - 1) * pageSize;

    // Get total count first
    const { count, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting movie count:', countError);
      return NextResponse.json({ error: 'Failed to fetch movie count' }, { status: 500 });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get paginated movies
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, name, age_rating, description, duration, score_rating, year')
      .range(offset, offset + pageSize - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching movies:', error);
      return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
    }

    const response: MoviesResponse = {
      movies: movies || [],
      totalCount,
      page,
      pageSize,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in movies API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate mock data for development/demo purposes
function generateMockMovies(): Movie[] {
  const movies: Movie[] = [];
  const sampleMovies = [
    {
      name: 'Casablanca',
      age_rating: 'PG',
      description:
        'In Vichy-controlled Morocco, cynical nightclub owner Rick Blaine uncovers letters of transit that could provide escape from the war-torn city.',
      duration: 102,
      score_rating: 8.5,
      year: 1942,
    },
    {
      name: 'Seven Samurai',
      age_rating: 'NR',
      description:
        'When bandits threaten to raid a poor farming village, the desperate villagers seek help from wandering samurai.',
      duration: 207,
      score_rating: 8.6,
      year: 1954,
    },
    {
      name: 'The Godfather',
      age_rating: 'R',
      description:
        'As aging Don Vito Corleone navigates wartime and family politics, his reluctant son Michael is drawn into the family business.',
      duration: 175,
      score_rating: 9.2,
      year: 1972,
    },
    {
      name: 'One Flew Over the Cuckoo&apos;s Nest',
      age_rating: '15',
      description:
        'Charming rogue Randle P. McMurphy feigns mental illness to serve his sentence in a psychiatric hospital instead of prison.',
      duration: 133,
      score_rating: 8.7,
      year: 1975,
    },
    {
      name: 'Star Wars: Episode IV - A New Hope',
      age_rating: 'G',
      description:
        'Farm boy Luke Skywalker joins a rebellion against the evil Galactic Empire in this epic space opera.',
      duration: 121,
      score_rating: 8.6,
      year: 1977,
    },
    {
      name: 'The Avengers',
      age_rating: 'PG-13',
      description:
        'Earth&apos;s mightiest heroes must come together and learn to fight as a team to stop the mischievous Loki and his alien army.',
      duration: 143,
      score_rating: 8.0,
      year: 2012,
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
      description: baseMovie.description,
      duration: baseMovie.duration + (i % 10),
      score_rating: Math.round((baseMovie.score_rating + (i % 20) * 0.1) * 10) / 10,
      year: baseMovie.year + (i % 40),
    });
  }

  return movies;
}
