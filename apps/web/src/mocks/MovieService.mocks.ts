import { http, HttpResponse } from 'msw';

import { API_BASE_URL, TMDB_MovieDetailsSchema } from '../integrations/tmdb';

const makeMockMovie = (overrides: Partial<ReturnType<typeof TMDB_MovieDetailsSchema.parse>> = {}) =>
  TMDB_MovieDetailsSchema.parse({
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
    ...overrides,
  });

export const mockMovie = makeMockMovie();

// A second film with the same title but a different year — used to test disambiguation.
export const mockMovieAlt = makeMockMovie({
  id: 99999,
  title: 'Mock Movie',
  release_date: '2000-06-15',
  overview: 'An older film with the same title.',
});

// A film whose title is a subtitle extension of the base title.
export const mockMovieWithSubtitle = makeMockMovie({
  id: 54321,
  title: 'Mock Movie: The Return',
  release_date: '2025-03-10',
});

export const handlers = [
  // Search endpoint — returns the main mock, an alt with the same title, and a subtitle variant
  http.get(`${API_BASE_URL}/search/movie`, () => {
    return HttpResponse.json({
      results: [mockMovie, mockMovieAlt, mockMovieWithSubtitle],
    });
  }),

  // Direct ID lookup + localized info (both use /movie/:id)
  http.get(`${API_BASE_URL}/movie/:id`, ({ params }) => {
    const id = Number(params.id);
    if (id === mockMovie.id) {
      return HttpResponse.json({
        ...mockMovie,
        title: 'Mock Movie (localized)',
        poster_path: '/localized-poster.jpg',
        overview: 'Localized overview text.',
      });
    }
    return HttpResponse.json({ status_code: 34, status_message: 'Not found' }, { status: 404 });
  }),
];
