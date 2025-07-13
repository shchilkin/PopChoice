import { http, HttpResponse } from 'msw';
import { API_BASE_URL, TMDB_MovieDetailsSchema } from '@/services';

// TODO: mock https://api.themoviedb.org/3/search/movie
// TODO: Write mocks once MovieService is more solidly implemented

const mockMovie = TMDB_MovieDetailsSchema.parse({
  adult: false,
  backdrop_path: '/mock-backdrop.jpg',
  genre_ids: [28, 12],
  id: 12345,
  original_language: 'en',
  original_title: 'Mock Movie',
  overview: 'This is a mock movie used for testing.',
  popularity: 100.0,
  poster_path: '/mock-poster.jpg',
  release_date: '2025-01-01',
  title: 'Mock Movie',
  video: false,
  vote_average: 8.5,
  vote_count: 1000,
});

export const handlers = [
  http.get(`${API_BASE_URL}/search/movie`, () => {
    return HttpResponse.json({
      // TODO: Add missing fields
      results: [mockMovie],
    });
  }),
];
