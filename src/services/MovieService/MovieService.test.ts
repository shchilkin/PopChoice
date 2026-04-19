import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, beforeEach, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';

import {
  handlers,
  mockMovie,
  mockMovieAlt,
  mockMovieWithSubtitle,
} from '../../mocks/MovieService.mocks';

import { API_BASE_URL, MovieService } from './MovieService';

vi.stubEnv('TMDB_API_KEY', 'test-key');

export const server = setupServer(...handlers);

describe('MovieService', () => {
  let movieService: MovieService;

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    movieService = new MovieService();
  });

  it('should be defined', () => {
    expect(movieService).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // getMovieById
  // -------------------------------------------------------------------------

  describe('getMovieById', () => {
    it('returns the movie when the TMDB ID exists', async () => {
      const result = await movieService.getMovieById(mockMovie.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockMovie.id);
    });

    it('returns undefined when the TMDB ID does not exist', async () => {
      const result = await movieService.getMovieById(0);
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getMovieByTitle — match quality cascade
  // -------------------------------------------------------------------------

  describe('getMovieByTitle', () => {
    it('returns an exact title match', async () => {
      const result = await movieService.getMovieByTitle('Mock Movie');
      expect(result).toBeDefined();
      expect(result?.title).toBe('Mock Movie');
    });

    it('strips a year suffix appended by OpenAI before searching', async () => {
      // OpenAI sometimes returns "Brother (1997)" — the suffix must be stripped
      const result = await movieService.getMovieByTitle('Mock Movie (2025)');
      expect(result).toBeDefined();
      expect(result?.title).toBe('Mock Movie');
    });

    it('is case-insensitive', async () => {
      const result = await movieService.getMovieByTitle('mock movie');
      expect(result).toBeDefined();
      expect(result?.title.toLowerCase()).toBe('mock movie');
    });

    it('matches via prefix when full title includes a subtitle', async () => {
      // "Mock Movie: The Return" should match a search for "Mock Movie: The Return"
      server.use(
        http.get(`${API_BASE_URL}/search/movie`, () =>
          HttpResponse.json({ results: [mockMovieWithSubtitle] }),
        ),
      );
      const result = await movieService.getMovieByTitle('Mock Movie: The Return');
      expect(result?.id).toBe(mockMovieWithSubtitle.id);
    });

    it('disambiguates by year when multiple films share the same title', async () => {
      // mockMovie: 2025, mockMovieAlt: 2000 — asking for year 2000 must return the alt
      const result = await movieService.getMovieByTitle('Mock Movie', 2000);
      expect(result?.id).toBe(mockMovieAlt.id);
    });

    it('accepts a ±1 year tolerance for release-date shifts', async () => {
      // Film released late in 2024 may be listed as 2025 in some regions
      const result = await movieService.getMovieByTitle('Mock Movie', 2024);
      expect(result?.id).toBe(mockMovie.id); // 2025 is within ±1 of 2024
    });

    it('falls back to a year-less search when the year-scoped search returns no results', async () => {
      let callCount = 0;
      server.use(
        http.get(`${API_BASE_URL}/search/movie`, ({ request }) => {
          const url = new URL(request.url);
          callCount++;
          // First call (with year) returns empty; second call returns results
          if (url.searchParams.has('year')) {
            return HttpResponse.json({ results: [] });
          }
          return HttpResponse.json({ results: [mockMovie] });
        }),
      );
      const result = await movieService.getMovieByTitle('Mock Movie', 2025);
      expect(result?.id).toBe(mockMovie.id);
      expect(callCount).toBe(2); // both calls were made
    });

    it('returns undefined when no results are found at all', async () => {
      server.use(
        http.get(`${API_BASE_URL}/search/movie`, () => HttpResponse.json({ results: [] })),
      );
      const result = await movieService.getMovieByTitle('Totally Unknown Film XYZ');
      expect(result).toBeUndefined();
    });

    it('returns undefined when the TMDB API call fails', async () => {
      server.use(http.get(`${API_BASE_URL}/search/movie`, () => HttpResponse.error()));
      const result = await movieService.getMovieByTitle('Mock Movie');
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getLocalizedMovieInfo
  // -------------------------------------------------------------------------

  describe('getLocalizedMovieInfo', () => {
    it('returns localized title, poster_path, and overview', async () => {
      const result = await movieService.getLocalizedMovieInfo(mockMovie.id, 'ru-RU');
      expect(result).toBeDefined();
      expect(result?.title).toBe('Mock Movie (localized)');
      expect(result?.poster_path).toBe('/localized-poster.jpg');
      expect(result?.overview).toBe('Localized overview text.');
    });

    it('returns undefined when the movie ID is not found', async () => {
      const result = await movieService.getLocalizedMovieInfo(0, 'ru-RU');
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // getPosterURL
  // -------------------------------------------------------------------------

  describe('getPosterURL', () => {
    it('builds a correct poster URL for a known size', () => {
      const url = movieService.getPosterURL('/mock-poster.jpg', 'w500');
      expect(url).toBe('https://image.tmdb.org/t/p/w500/mock-poster.jpg');
    });

    it('throws for an unrecognised size', () => {
      expect(() =>
        // @ts-expect-error — intentionally passing invalid size
        movieService.getPosterURL('/mock-poster.jpg', 'w9999'),
      ).toThrow();
    });
  });
});
