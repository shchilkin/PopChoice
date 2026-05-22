import { describe, expect, it } from 'vitest';

import {
  applyFeedbackToLocalMovies,
  excludeMentionedLocalMovies,
  excludeMentionedTMDBMovies,
  excludeFeedbackTMDBMovies,
  getFeedbackCandidateSignals,
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

  it('matches mentioned movie titles written in non-Latin scripts', () => {
    const mentioned = getMentionedMovieTitleKeys([person('Сталкер'), person('千と千尋の神隠し')]);

    expect(isMentionedMovieTitle('сталкер', mentioned)).toBe(true);
    expect(isMentionedMovieTitle('千と千尋の神隠し', mentioned)).toBe(true);
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

  it('filters candidates the signed-in user marked as already watched', () => {
    const signals = getFeedbackCandidateSignals([
      {
        kind: 'watched',
        movieKey: 'title:matrix:1999',
        tmdbId: null,
        movieName: 'The Matrix',
        movieYear: 1999,
      },
    ]);

    expect(
      applyFeedbackToLocalMovies([movie('Matrix'), movie('Dark City')], signals).map(
        (candidate) => candidate.name,
      ),
    ).toEqual(['Dark City']);

    expect(
      excludeFeedbackTMDBMovies(
        [
          {
            id: 1,
            title: 'The Matrix',
            overview: 'Reality bends.',
            release_date: '1999-03-31',
            vote_average: 8.2,
            poster_path: null,
          },
          {
            id: 2,
            title: 'Dark City',
            overview: 'A noir mystery.',
            release_date: '1998-02-27',
            vote_average: 7.3,
            poster_path: null,
          },
        ],
        signals,
      ).map((candidate) => candidate.title),
    ).toEqual(['Dark City']);
  });

  it('filters exact repeat candidates with negative feedback', () => {
    const signals = getFeedbackCandidateSignals([
      { kind: 'wrong_mood', movieName: 'Arrival', movieYear: 2016 },
      { kind: 'too_obvious', movieName: 'Interstellar', movieYear: 2014 },
      { kind: 'too_obscure', movieName: 'Primer', movieYear: 2004 },
      { kind: 'useful', movieName: 'Past Lives', movieYear: 2023 },
    ]);
    const arrival = { ...movie('Arrival'), similarity: 0.91 };
    const interstellar = { ...movie('Interstellar'), similarity: 0.9 };
    const primer = { ...movie('Primer'), similarity: 0.89 };
    const pastLives = { ...movie('Past Lives'), similarity: 0.85 };

    const result = applyFeedbackToLocalMovies([arrival, interstellar, primer, pastLives], signals);

    expect(result.map((candidate) => candidate.name)).toEqual(['Past Lives', 'Arrival']);
    expect(result.find((candidate) => candidate.name === 'Arrival')?.similarity).toBeCloseTo(0.83);
  });

  it('boosts liked memory enough to affect local recommendation ordering', () => {
    const signals = getFeedbackCandidateSignals([
      { kind: 'liked', movieName: 'Past Lives', movieYear: 2023 },
    ]);
    const steadyMatch = { ...movie('After Yang'), similarity: 0.8 };
    const likedMatch = { ...movie('Past Lives'), similarity: 0.77 };

    const result = applyFeedbackToLocalMovies([steadyMatch, likedMatch], signals);

    expect(result.map((candidate) => candidate.name)).toEqual(['Past Lives', 'After Yang']);
    expect(result[0]?.similarity).toBeCloseTo(0.81);
  });

  it('keeps watched exclusions ahead of liked boosts so watched movies do not repeat', () => {
    const signals = getFeedbackCandidateSignals([
      { kind: 'liked', movieName: 'Past Lives', movieYear: 2023 },
      { kind: 'watched', movieName: 'Past Lives', movieYear: 2023 },
    ]);

    expect(
      applyFeedbackToLocalMovies(
        [
          { ...movie('Past Lives'), similarity: 0.77 },
          { ...movie('After Yang'), similarity: 0.76 },
        ],
        signals,
      ).map((candidate) => candidate.name),
    ).toEqual(['After Yang']);
  });

  it('keeps wrong-mood down-ranking intact when a title also has liked memory', () => {
    const signals = getFeedbackCandidateSignals([
      { kind: 'liked', movieName: 'Arrival', movieYear: 2016 },
      { kind: 'wrong_mood', movieName: 'Arrival', movieYear: 2016 },
    ]);
    const arrival = { ...movie('Arrival'), similarity: 0.91 };
    const afterYang = { ...movie('After Yang'), similarity: 0.84 };

    const result = applyFeedbackToLocalMovies([arrival, afterYang], signals);

    expect(result.map((candidate) => candidate.name)).toEqual(['After Yang', 'Arrival']);
    expect(result.find((candidate) => candidate.name === 'Arrival')?.similarity).toBeCloseTo(0.83);
  });

  it('filters TMDB candidates by durable movie identity when available', () => {
    const signals = getFeedbackCandidateSignals([
      {
        kind: 'watched',
        movieKey: 'tmdb:475557',
        tmdbId: 475557,
        movieName: 'Joker',
        movieYear: 2019,
      },
    ]);

    expect(
      excludeFeedbackTMDBMovies(
        [
          {
            id: 475557,
            title: 'A completely different localized title',
            overview: 'A lonely comedian spirals.',
            release_date: '2019-10-02',
            vote_average: 8.1,
            poster_path: null,
          },
          {
            id: 603,
            title: 'The Matrix',
            overview: 'Reality bends.',
            release_date: '1999-03-31',
            vote_average: 8.2,
            poster_path: null,
          },
        ],
        signals,
      ).map((candidate) => candidate.title),
    ).toEqual(['The Matrix']);
  });

  it('filters local candidates by TMDB identity when the local row has been matched', () => {
    const signals = getFeedbackCandidateSignals([
      {
        kind: 'already_watched',
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
      },
    ]);

    expect(
      applyFeedbackToLocalMovies(
        [
          { ...movie('A localized title'), tmdbId: 129 },
          { ...movie('Kiki’s Delivery Service'), tmdbId: 16859 },
        ],
        signals,
      ).map((candidate) => candidate.name),
    ).toEqual(['Kiki’s Delivery Service']);
  });

  it('filters recent completed recommendations so signed-in users do not get immediate repeats', () => {
    const signals = getFeedbackCandidateSignals([
      {
        kind: 'recently_recommended',
        movieKey: 'tmdb:129',
        tmdbId: 129,
        movieName: 'Spirited Away',
        movieYear: 2001,
      },
    ]);

    expect(
      applyFeedbackToLocalMovies(
        [
          { ...movie('Spirited Away'), tmdbId: 129 },
          { ...movie('Princess Mononoke'), tmdbId: 128 },
        ],
        signals,
      ).map((candidate) => candidate.name),
    ).toEqual(['Princess Mononoke']);

    expect(
      excludeFeedbackTMDBMovies(
        [
          {
            id: 129,
            title: '千と千尋の神隠し',
            overview: 'A girl enters a world of spirits.',
            release_date: '2001-07-20',
            vote_average: 8.5,
            poster_path: null,
          },
          {
            id: 128,
            title: 'Princess Mononoke',
            overview: 'A prince is caught in a conflict.',
            release_date: '1997-07-12',
            vote_average: 8.3,
            poster_path: null,
          },
        ],
        signals,
      ).map((candidate) => candidate.title),
    ).toEqual(['Princess Mononoke']);
  });
});
