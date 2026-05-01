import { http, HttpResponse } from 'msw';

// Mock handlers for Storybook-specific requests to reduce warnings
export const storybookHandlers = [
  // Handle any Storybook internal requests that might be causing warnings
  http.get('/iframe.html*', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Handle hot reload and development requests
  http.get('/__webpack_hmr*', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Handle static assets that might be requested
  http.get('/static/*', () => {
    return new HttpResponse(null, { status: 200 });
  }),
];

// Application-specific handlers
export const appHandlers = [
  // Movie recommendation API
  http.post('/api/movie-recommendation', async () => {
    await new Promise((res) => setTimeout(res, 1000));
    return HttpResponse.json({
      title: 'The Godfather',
      description: 'A masterpiece of cinema that explores themes of family, power, and loyalty.',
      posterURL: 'https://example.com/godfather-poster.jpg',
    });
  }),
];

// Combined handlers for easier use
export const handlers = [...storybookHandlers, ...appHandlers];
