import { describe, expect, it } from 'vitest';

import {
  excludeMentionedLocalMovies,
  excludeMentionedTMDBMovies,
  getMentionedMovieTitleKeys,
  isMentionedMovieTitle,
} from './candidateFilters';

import type { EnhancedMovieMatch, PersonFormData } from './types';

const person = (favoriteMovie: string): PersonFormData => ({
  favoriteMovie,
  newVsClassic: 'Both new and classic',
  moodPreference: ['Drama'],
  tonePreference: 'Balanced',
});

let movieId = 1;
const movie = (name: string): EnhancedMovieMatch => ({
  id: movieId++,
  name,
  age_rating: 'PG',
  description: `${name} description`,
  duration: 120,
  score_rating: 8,
  year: 2020,
  similarity: 0.8,
  content: `${name} (2020)`,
});

describe('candidateFilters', () => {
  it('matches mentioned movie titles with punctuation, case, and leading article differences', () => {
    const mentioned = getMentionedMovieTitleKeys([person('The Dark Knight')]);

    expect(isMentionedMovieTitle('dark knight', mentioned)).toBe(true);
    expect(isMentionedMovieTitle('THE DARK-KNIGHT', mentioned)).toBe(true);
  });

  it('does not treat related titles as the same movie', () => {
    const mentioned = getMentionedMovieTitleKeys([person('Alien')]);

    expect(isMentionedMovieTitle('Aliens', mentioned)).toBe(false);
    expect(isMentionedMovieTitle('Alien: Covenant', mentioned)).toBe(false);
  });

  it('filters local candidates that were explicitly mentioned by any participant', () => {
    const mentioned = getMentionedMovieTitleKeys([person('Arrival'), person('Paddington 2')]);

    expect(
      excludeMentionedLocalMovies(
        [movie('Arrival'), movie('Paddington 2'), movie('Past Lives')],
        mentioned,
      ).map((candidate) => candidate.name),
    ).toEqual(['Past Lives']);
  });

  it('filters TMDB candidates that were explicitly mentioned by any participant', () => {
    const mentioned = getMentionedMovieTitleKeys([person('Inception')]);

    expect(
      excludeMentionedTMDBMovies(
        [
          {
            id: 1,
            title: 'Inception',
            overview: 'A dream heist.',
            release_date: '2010-07-16',
            vote_average: 8.4,
            poster_path: null,
          },
          {
            id: 2,
            title: 'Paprika',
            overview: 'Dreams and reality blur.',
            release_date: '2006-11-25',
            vote_average: 7.8,
            poster_path: null,
          },
        ],
        mentioned,
      ).map((candidate) => candidate.title),
    ).toEqual(['Paprika']);
  });
});
