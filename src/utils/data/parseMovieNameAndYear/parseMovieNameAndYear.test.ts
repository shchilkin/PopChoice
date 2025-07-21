import { describe, expect, it } from 'vitest';

import { parseMovieNameAndYear } from './parseMovieNameAndYear';

describe('parseMovieNameAndYear', () => {
  it('should parse movie name and year from standard format', () => {
    expect(parseMovieNameAndYear('The Matrix: 1999')).toEqual({
      name: 'The Matrix',
      year: 1999,
    });

    expect(parseMovieNameAndYear('Inception: 2010')).toEqual({
      name: 'Inception',
      year: 2010,
    });

    expect(parseMovieNameAndYear('The Godfather: 1972')).toEqual({
      name: 'The Godfather',
      year: 1972,
    });
  });

  it('should handle spaces around the year', () => {
    expect(parseMovieNameAndYear('The Matrix:   1999')).toEqual({
      name: 'The Matrix',
      year: 1999,
    });

    expect(parseMovieNameAndYear('Inception:   1999   ')).toEqual({
      name: 'Inception',
      year: 1999,
    });

    expect(parseMovieNameAndYear('The Godfather:\t1999\t')).toEqual({
      name: 'The Godfather',
      year: 1999,
    });
  });

  it('should handle movies with colons in the title', () => {
    expect(
      parseMovieNameAndYear('The Lord of the Rings: The Fellowship of the Ring: 2001'),
    ).toEqual({
      name: 'The Lord of the Rings: The Fellowship of the Ring',
      year: 2001,
    });

    expect(parseMovieNameAndYear('Star Wars: Episode IV - A New Hope: 1977')).toEqual({
      name: 'Star Wars: Episode IV - A New Hope',
      year: 1977,
    });

    expect(parseMovieNameAndYear('Spider-Man: Into the Spider-Verse: 2018')).toEqual({
      name: 'Spider-Man: Into the Spider-Verse',
      year: 2018,
    });
  });

  it('should return year 0 when no year is found', () => {
    expect(parseMovieNameAndYear('Movie Title')).toEqual({
      name: 'Movie Title',
      year: 0,
    });

    expect(parseMovieNameAndYear('No Year Here:')).toEqual({
      name: 'No Year Here:',
      year: 0,
    });

    expect(parseMovieNameAndYear('Invalid Format: abc')).toEqual({
      name: 'Invalid Format: abc',
      year: 0,
    });
  });

  it('should return year 0 for invalid year formats', () => {
    expect(parseMovieNameAndYear('Movie: 99')).toEqual({
      name: 'Movie: 99',
      year: 0,
    });

    expect(parseMovieNameAndYear('Movie: 12345')).toEqual({
      name: 'Movie: 12345',
      year: 0,
    });

    expect(parseMovieNameAndYear('Movie: twenty twenty')).toEqual({
      name: 'Movie: twenty twenty',
      year: 0,
    });
  });

  it('should handle edge case years', () => {
    expect(parseMovieNameAndYear('Metropolis: 1927')).toEqual({
      name: 'Metropolis',
      year: 1927,
    });

    expect(parseMovieNameAndYear('The Cabinet of Dr. Caligari: 1920')).toEqual({
      name: 'The Cabinet of Dr. Caligari',
      year: 1920,
    });

    expect(parseMovieNameAndYear('Future Movie: 2099')).toEqual({
      name: 'Future Movie',
      year: 2099,
    });

    expect(parseMovieNameAndYear('Y2K Movie: 2000')).toEqual({
      name: 'Y2K Movie',
      year: 2000,
    });
  });

  it('should handle movies with numbers in the title', () => {
    expect(parseMovieNameAndYear('2001: A Space Odyssey: 1968')).toEqual({
      name: '2001: A Space Odyssey',
      year: 1968,
    });

    expect(parseMovieNameAndYear('12 Monkeys: 1995')).toEqual({
      name: '12 Monkeys',
      year: 1995,
    });

    expect(parseMovieNameAndYear('300: 2006')).toEqual({
      name: '300',
      year: 2006,
    });

    expect(parseMovieNameAndYear('Blade Runner 2049: 2017')).toEqual({
      name: 'Blade Runner 2049',
      year: 2017,
    });
  });

  it('should handle special characters in movie titles', () => {
    expect(parseMovieNameAndYear('Amélie: 2001')).toEqual({
      name: 'Amélie',
      year: 2001,
    });

    expect(parseMovieNameAndYear('The Good, the Bad and the Ugly: 1966')).toEqual({
      name: 'The Good, the Bad and the Ugly',
      year: 1966,
    });

    expect(parseMovieNameAndYear('Crouching Tiger, Hidden Dragon: 2000')).toEqual({
      name: 'Crouching Tiger, Hidden Dragon',
      year: 2000,
    });
  });

  it('should handle parentheses in movie titles', () => {
    expect(parseMovieNameAndYear("The Shawshank Redemption (Director's Cut): 1994")).toEqual({
      name: "The Shawshank Redemption (Director's Cut)",
      year: 1994,
    });

    expect(parseMovieNameAndYear('Aliens (Special Edition): 1986')).toEqual({
      name: 'Aliens (Special Edition)',
      year: 1986,
    });
  });

  it('should trim whitespace from movie name', () => {
    expect(parseMovieNameAndYear('  The Matrix  : 1999')).toEqual({
      name: 'The Matrix',
      year: 1999,
    });

    expect(parseMovieNameAndYear('\tInception\t: 2010')).toEqual({
      name: 'Inception',
      year: 2010,
    });

    expect(parseMovieNameAndYear('   The Godfather   : 1972   ')).toEqual({
      name: 'The Godfather',
      year: 1972,
    });
  });

  it('should handle empty or whitespace-only input', () => {
    expect(parseMovieNameAndYear('')).toEqual({
      name: '',
      year: 0,
    });

    expect(parseMovieNameAndYear('   ')).toEqual({
      name: '',
      year: 0,
    });

    expect(parseMovieNameAndYear('\t\n')).toEqual({
      name: '',
      year: 0,
    });
  });

  it('should handle very long movie titles', () => {
    const longTitle =
      "The Extraordinary Adventures of Adèle Blanc-Sec: The Mummy's Revenge and the Secret of the Pharaoh's Tomb";
    expect(parseMovieNameAndYear(`${longTitle}: 2010`)).toEqual({
      name: longTitle,
      year: 2010,
    });
  });

  it('should only match year at the end of the string', () => {
    expect(parseMovieNameAndYear('Movie from 1999: 2020')).toEqual({
      name: 'Movie from 1999',
      year: 2020,
    });

    expect(parseMovieNameAndYear('Based on 1985 novel: 1999')).toEqual({
      name: 'Based on 1985 novel',
      year: 1999,
    });

    expect(parseMovieNameAndYear('The Year 2000 Problem: 1999')).toEqual({
      name: 'The Year 2000 Problem',
      year: 1999,
    });
  });

  it('should handle movie titles ending with numbers', () => {
    expect(parseMovieNameAndYear("Ocean's 11: 2001")).toEqual({
      name: "Ocean's 11",
      year: 2001,
    });

    expect(parseMovieNameAndYear('Apollo 13: 1995')).toEqual({
      name: 'Apollo 13',
      year: 1995,
    });

    expect(parseMovieNameAndYear('District 9: 2009')).toEqual({
      name: 'District 9',
      year: 2009,
    });
  });

  it('should handle franchise titles with sequels', () => {
    expect(parseMovieNameAndYear('The Matrix Reloaded: 2003')).toEqual({
      name: 'The Matrix Reloaded',
      year: 2003,
    });

    expect(parseMovieNameAndYear('Terminator 2: Judgment Day: 1991')).toEqual({
      name: 'Terminator 2: Judgment Day',
      year: 1991,
    });

    expect(parseMovieNameAndYear('Indiana Jones and the Last Crusade: 1989')).toEqual({
      name: 'Indiana Jones and the Last Crusade',
      year: 1989,
    });
  });

  it('should handle animated and family movies', () => {
    expect(parseMovieNameAndYear('Toy Story: 1995')).toEqual({
      name: 'Toy Story',
      year: 1995,
    });

    expect(parseMovieNameAndYear('Finding Nemo: 2003')).toEqual({
      name: 'Finding Nemo',
      year: 2003,
    });

    expect(parseMovieNameAndYear('Shrek: 2001')).toEqual({
      name: 'Shrek',
      year: 2001,
    });
  });

  it('should handle movies with dashes and hyphens', () => {
    expect(parseMovieNameAndYear('Spider-Man: 2002')).toEqual({
      name: 'Spider-Man',
      year: 2002,
    });

    expect(parseMovieNameAndYear('X-Men: 2000')).toEqual({
      name: 'X-Men',
      year: 2000,
    });

    expect(parseMovieNameAndYear('Ant-Man: 2015')).toEqual({
      name: 'Ant-Man',
      year: 2015,
    });
  });

  it('should handle movies with apostrophes', () => {
    expect(
      parseMovieNameAndYear('Pirates of the Caribbean: The Curse of the Black Pearl: 2003'),
    ).toEqual({
      name: 'Pirates of the Caribbean: The Curse of the Black Pearl',
      year: 2003,
    });

    expect(parseMovieNameAndYear("Ocean's Eleven: 2001")).toEqual({
      name: "Ocean's Eleven",
      year: 2001,
    });

    expect(parseMovieNameAndYear("Don't Look Up: 2021")).toEqual({
      name: "Don't Look Up",
      year: 2021,
    });
  });

  it('should handle years at the very beginning of cinema history', () => {
    expect(parseMovieNameAndYear('A Trip to the Moon: 1902')).toEqual({
      name: 'A Trip to the Moon',
      year: 1902,
    });

    expect(parseMovieNameAndYear('The Great Train Robbery: 1903')).toEqual({
      name: 'The Great Train Robbery',
      year: 1903,
    });
  });

  it('should handle modern and future years', () => {
    expect(parseMovieNameAndYear('Current Movie: 2024')).toEqual({
      name: 'Current Movie',
      year: 2024,
    });

    expect(parseMovieNameAndYear('Near Future Film: 2030')).toEqual({
      name: 'Near Future Film',
      year: 2030,
    });
  });
});
