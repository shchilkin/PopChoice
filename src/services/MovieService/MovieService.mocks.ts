import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from './MovieService';

// TODO: mock https://api.themoviedb.org/3/search/movie
// TODO: Write mocks once MovieService is more solidly implemented

export const handlers = [
  http.get(`${API_BASE_URL}/search/movie`, () => {
    return HttpResponse.json({
      results: [], // Return an empty array for results
    });
  }),
];
