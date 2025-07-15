import { setupServer } from 'msw/node';
import { describe, beforeEach, it, expect, beforeAll, afterEach, afterAll } from 'vitest';

import { handlers } from '../../mocks/MovieService.mocks';

import { MovieService } from './MovieService';

export const server = setupServer(...handlers);

// TODO: Write tests once MovieService is more solidly implemented

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
});
