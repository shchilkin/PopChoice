import { NextRequest, NextResponse } from 'next/server';

export interface Movie {
  id: number;
  name: string;
  age_rating: string;
  description: string;
  duration: number;
  score_rating: number;
  year: number;
  // Extended fields for enhanced search (available in mock data)
  cast?: string[];
  director?: string;
  genres?: string[];
}

export interface MoviesResponse {
  movies: Movie[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchParams {
  title?: string;
  cast?: string;
  director?: string;
  genres?: string[];
  yearFrom?: number;
  yearTo?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Extract search parameters
    const searchTitle = searchParams.get('title') || '';
    const searchCast = searchParams.get('cast') || '';
    const searchDirector = searchParams.get('director') || '';
    const searchGenres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
    const yearFrom = searchParams.get('yearFrom')
      ? parseInt(searchParams.get('yearFrom')!, 10)
      : undefined;
    const yearTo = searchParams.get('yearTo')
      ? parseInt(searchParams.get('yearTo')!, 10)
      : undefined;

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

      // Apply search filters to mock data
      const filteredMovies = searchMovies(mockMovies, {
        title: searchTitle,
        cast: searchCast,
        director: searchDirector,
        genres: searchGenres,
        yearFrom,
        yearTo,
      });

      const totalCount = filteredMovies.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const offset = (page - 1) * pageSize;
      const paginatedMovies = filteredMovies.slice(offset, offset + pageSize);

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

    // Build Supabase query with search filters
    let query = supabase
      .from('movies')
      .select('id, name, age_rating, description, duration, score_rating, year');

    // Apply search filters (basic fields only since extended fields don't exist in DB)
    if (searchTitle) {
      query = query.ilike('name', `%${searchTitle}%`);
    }

    if (yearFrom) {
      query = query.gte('year', yearFrom);
    }

    if (yearTo) {
      query = query.lte('year', yearTo);
    }

    // Get total count first
    const { count, error: countError } = await query.select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting movie count:', countError);
      return NextResponse.json({ error: 'Failed to fetch movie count' }, { status: 500 });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;

    // Get paginated movies with same filters
    const { data: movies, error } = await query
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

// Search function for filtering movies
function searchMovies(movies: Movie[], searchParams: SearchParams): Movie[] {
  return movies.filter((movie) => {
    // Title search (case-insensitive, partial match)
    if (searchParams.title) {
      const titleMatch = movie.name.toLowerCase().includes(searchParams.title.toLowerCase());
      if (!titleMatch) return false;
    }

    // Cast search (case-insensitive, partial match in any cast member)
    if (searchParams.cast && movie.cast) {
      const castMatch = movie.cast.some((actor) =>
        actor.toLowerCase().includes(searchParams.cast!.toLowerCase()),
      );
      if (!castMatch) return false;
    }

    // Director search (case-insensitive, partial match)
    if (searchParams.director && movie.director) {
      const directorMatch = movie.director
        .toLowerCase()
        .includes(searchParams.director.toLowerCase());
      if (!directorMatch) return false;
    }

    // Genre search (movie must have all selected genres)
    if (searchParams.genres && searchParams.genres.length > 0 && movie.genres) {
      const hasAllGenres = searchParams.genres.every((searchGenre) =>
        movie.genres!.some((movieGenre) =>
          movieGenre.toLowerCase().includes(searchGenre.toLowerCase()),
        ),
      );
      if (!hasAllGenres) return false;
    }

    // Year range search
    if (searchParams.yearFrom && movie.year < searchParams.yearFrom) {
      return false;
    }
    if (searchParams.yearTo && movie.year > searchParams.yearTo) {
      return false;
    }

    return true;
  });
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
      cast: ['Humphrey Bogart', 'Ingrid Bergman', 'Paul Henreid', 'Claude Rains'],
      director: 'Michael Curtiz',
      genres: ['Drama', 'Romance', 'War'],
    },
    {
      name: 'Seven Samurai',
      age_rating: 'NR',
      description:
        'When bandits threaten to raid a poor farming village, the desperate villagers seek help from wandering samurai.',
      duration: 207,
      score_rating: 8.6,
      year: 1954,
      cast: ['Toshiro Mifune', 'Takashi Shimura', 'Keiko Tsushima', 'Yukiko Shimazaki'],
      director: 'Akira Kurosawa',
      genres: ['Action', 'Adventure', 'Drama'],
    },
    {
      name: 'The Godfather',
      age_rating: 'R',
      description:
        'As aging Don Vito Corleone navigates wartime and family politics, his reluctant son Michael is drawn into the family business.',
      duration: 175,
      score_rating: 9.2,
      year: 1972,
      cast: ['Marlon Brando', 'Al Pacino', 'James Caan', 'Diane Keaton'],
      director: 'Francis Ford Coppola',
      genres: ['Crime', 'Drama'],
    },
    {
      name: 'One Flew Over the Cuckoo&apos;s Nest',
      age_rating: '15',
      description:
        'Charming rogue Randle P. McMurphy feigns mental illness to serve his sentence in a psychiatric hospital instead of prison.',
      duration: 133,
      score_rating: 8.7,
      year: 1975,
      cast: ['Jack Nicholson', 'Louise Fletcher', 'Danny DeVito', 'Christopher Lloyd'],
      director: 'Milos Forman',
      genres: ['Drama'],
    },
    {
      name: 'Star Wars: Episode IV - A New Hope',
      age_rating: 'G',
      description:
        'Farm boy Luke Skywalker joins a rebellion against the evil Galactic Empire in this epic space opera.',
      duration: 121,
      score_rating: 8.6,
      year: 1977,
      cast: ['Mark Hamill', 'Harrison Ford', 'Carrie Fisher', 'Alec Guinness'],
      director: 'George Lucas',
      genres: ['Adventure', 'Fantasy', 'Sci-Fi'],
    },
    {
      name: 'The Avengers',
      age_rating: 'PG-13',
      description:
        'Earth&apos;s mightiest heroes must come together and learn to fight as a team to stop the mischievous Loki and his alien army.',
      duration: 143,
      score_rating: 8.0,
      year: 2012,
      cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson', 'Mark Ruffalo'],
      director: 'Joss Whedon',
      genres: ['Action', 'Adventure', 'Sci-Fi'],
    },
    {
      name: 'Harry Potter and the Philosopher&apos;s Stone',
      age_rating: '12+',
      description:
        'An orphaned boy enrolls in a school of wizardry, where he learns the truth about himself and his parents.',
      duration: 152,
      score_rating: 7.6,
      year: 2001,
      cast: ['Daniel Radcliffe', 'Emma Watson', 'Rupert Grint', 'Alan Rickman'],
      director: 'Chris Columbus',
      genres: ['Adventure', 'Family', 'Fantasy'],
    },
    {
      name: 'Deadpool',
      age_rating: '16+',
      description:
        'A former Special Forces operative turned mercenary is subjected to a rogue experiment.',
      duration: 108,
      score_rating: 8.0,
      year: 2016,
      cast: ['Ryan Reynolds', 'Morena Baccarin', 'T.J. Miller', 'Ed Skrein'],
      director: 'Tim Miller',
      genres: ['Action', 'Comedy', 'Adventure'],
    },
    {
      name: 'John Wick',
      age_rating: '18+',
      description:
        'An ex-hit-man comes out of retirement to track down the gangsters that took everything from him.',
      duration: 101,
      score_rating: 7.4,
      year: 2014,
      cast: ['Keanu Reeves', 'Michael Nyqvist', 'Alfie Allen', 'Adrianne Palicki'],
      director: 'Chad Stahelski',
      genres: ['Action', 'Crime', 'Thriller'],
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
      cast: baseMovie.cast,
      director: baseMovie.director,
      genres: baseMovie.genres,
    });
  }

  return movies;
}
