import { describe, expect, it } from 'vitest';

import { extractYearFromTitleLine } from './extractYearFromTitleLine';

describe('extractYearFromTitleLine', () => {
  it('should extract year from standard title line format', () => {
    expect(extractYearFromTitleLine('The Matrix: 1999 | R | 2h 16m | 8.7 rating')).toBe(1999);
    expect(extractYearFromTitleLine('Inception: 2010 | PG-13 | 2h 28m | 8.8 rating')).toBe(2010);
    expect(extractYearFromTitleLine('The Godfather: 1972 | R | 2h 55m | 9.2 rating')).toBe(1972);
  });

  it('should handle spaces around the year', () => {
    expect(extractYearFromTitleLine('The Matrix:   1999   | R | 2h 16m | 8.7 rating')).toBe(1999);
    expect(extractYearFromTitleLine('Inception:1999| PG-13 | 2h 28m | 8.8 rating')).toBe(1999);
    expect(extractYearFromTitleLine('The Godfather:\t1999\t| R | 2h 55m | 9.2 rating')).toBe(1999);
  });

  it('should return 0 when no year is found', () => {
    expect(extractYearFromTitleLine('Movie Title | R | 2h | 8.0 rating')).toBe(0);
    expect(extractYearFromTitleLine('No Year Movie: | PG | 1h 30m | 7.5 rating')).toBe(0);
    expect(extractYearFromTitleLine('Invalid Format')).toBe(0);
  });

  it('should return 0 when year format is incorrect', () => {
    expect(extractYearFromTitleLine('Movie: 99 | R | 2h | 8.0 rating')).toBe(0); // 2-digit year
    expect(extractYearFromTitleLine('Movie: 12345 | R | 2h | 8.0 rating')).toBe(0); // 5-digit number
    expect(extractYearFromTitleLine('Movie: abc | R | 2h | 8.0 rating')).toBe(0); // Non-numeric
  });

  it('should handle movies with colons in the title', () => {
    expect(
      extractYearFromTitleLine(
        'The Lord of the Rings: The Fellowship of the Ring: 2001 | PG-13 | 2h 58m | 8.8 rating',
      ),
    ).toBe(2001);
    expect(
      extractYearFromTitleLine(
        'Star Wars: Episode IV - A New Hope: 1977 | PG | 2h 1m | 8.6 rating',
      ),
    ).toBe(1977);
    expect(
      extractYearFromTitleLine(
        'Spider-Man: Into the Spider-Verse: 2018 | PG | 1h 57m | 8.4 rating',
      ),
    ).toBe(2018);
  });

  it('should handle different metadata formats', () => {
    expect(extractYearFromTitleLine('Movie: 2020 | G | 90m | 7.0')).toBe(2020);
    expect(extractYearFromTitleLine('Movie: 2021 | PG-13 | 2h | 8.5 rating')).toBe(2021);
    expect(extractYearFromTitleLine('Movie: 2022 | R | 1h 45m | 9.0 out of 10')).toBe(2022);
  });

  it('should handle edge case years', () => {
    expect(extractYearFromTitleLine('Metropolis: 1927 | NR | 2h 33m | 8.3 rating')).toBe(1927);
    expect(
      extractYearFromTitleLine('The Cabinet of Dr. Caligari: 1920 | NR | 1h 16m | 8.0 rating'),
    ).toBe(1920);
    expect(extractYearFromTitleLine('Future Movie: 2099 | R | 2h | 7.5 rating')).toBe(2099);
  });

  it('should handle international age ratings', () => {
    expect(extractYearFromTitleLine('Movie: 2020 | 12+ | 2h | 8.0 rating')).toBe(2020);
    expect(extractYearFromTitleLine('Movie: 2021 | 15 | 1h 45m | 7.5 rating')).toBe(2021);
    expect(extractYearFromTitleLine('Movie: 2022 | 16+ | 2h 10m | 8.2 rating')).toBe(2022);
    expect(extractYearFromTitleLine('Movie: 2023 | 18+ | 1h 55m | 8.8 rating')).toBe(2023);
  });

  it('should return 0 when pipe separator is missing', () => {
    expect(extractYearFromTitleLine('Movie: 1999 R 2h 16m 8.7 rating')).toBe(0);
    expect(extractYearFromTitleLine('Movie: 2000')).toBe(0);
    expect(extractYearFromTitleLine('Movie: 2001 - R - 2h - 8.0')).toBe(0);
  });

  it('should return 0 when colon is missing', () => {
    expect(extractYearFromTitleLine('Movie 1999 | R | 2h | 8.0 rating')).toBe(0);
    expect(extractYearFromTitleLine('Movie Title 2000 | PG | 1h 30m | 7.5 rating')).toBe(0);
  });

  it('should handle empty or invalid input', () => {
    expect(extractYearFromTitleLine('')).toBe(0);
    expect(extractYearFromTitleLine('   ')).toBe(0);
    expect(extractYearFromTitleLine('|')).toBe(0);
    expect(extractYearFromTitleLine(':')).toBe(0);
  });

  it('should extract the first valid year when multiple years are present', () => {
    expect(
      extractYearFromTitleLine('Movie: 1999 | Based on 1985 novel | R | 2h | 8.0 rating'),
    ).toBe(1999);
    expect(
      extractYearFromTitleLine(
        'The Year 2000 Problem: 1999 | Sci-fi from 2020 | PG | 1h 30m | 7.0',
      ),
    ).toBe(1999);
  });

  it('should handle years at the beginning of the millennium', () => {
    expect(extractYearFromTitleLine('Y2K Movie: 2000 | R | 2h | 7.5 rating')).toBe(2000);
    expect(extractYearFromTitleLine('New Millennium: 2001 | PG | 1h 45m | 8.0 rating')).toBe(2001);
  });

  it('should handle movies with numbers in the title', () => {
    expect(extractYearFromTitleLine('2001: A Space Odyssey: 1968 | G | 2h 29m | 8.3 rating')).toBe(
      1968,
    );
    expect(extractYearFromTitleLine('12 Monkeys: 1995 | R | 2h 9m | 8.0 rating')).toBe(1995);
    expect(extractYearFromTitleLine('300: 2006 | R | 1h 57m | 7.6 rating')).toBe(2006);
    expect(extractYearFromTitleLine('Blade Runner 2049: 2017 | R | 2h 44m | 8.0 rating')).toBe(
      2017,
    );
  });

  it('should handle special characters in movie titles', () => {
    expect(extractYearFromTitleLine('Amélie: 2001 | R | 2h 2m | 8.3 rating')).toBe(2001);
    expect(
      extractYearFromTitleLine('The Good, the Bad and the Ugly: 1966 | R | 2h 58m | 8.8 rating'),
    ).toBe(1966);
    expect(
      extractYearFromTitleLine('Crouching Tiger, Hidden Dragon: 2000 | PG-13 | 2h | 7.9 rating'),
    ).toBe(2000);
  });

  it('should handle parentheses in movie titles', () => {
    expect(
      extractYearFromTitleLine(
        "The Shawshank Redemption (Director's Cut): 1994 | R | 2h 22m | 9.3 rating",
      ),
    ).toBe(1994);
    expect(
      extractYearFromTitleLine('Aliens (Special Edition): 1986 | R | 2h 17m | 8.4 rating'),
    ).toBe(1986);
  });

  it('should handle very long movie titles', () => {
    const longTitle =
      "The Extraordinary Adventures of Adèle Blanc-Sec: The Mummy's Revenge and the Secret of the Pharaoh's Tomb";
    expect(extractYearFromTitleLine(`${longTitle}: 2010 | PG-13 | 1h 47m | 6.3 rating`)).toBe(2010);
  });

  it('should handle minimal metadata', () => {
    expect(extractYearFromTitleLine('Movie: 2020 | R')).toBe(2020);
    expect(extractYearFromTitleLine('Movie: 2021 |')).toBe(2021);
  });

  it('should not extract years from later parts of the line', () => {
    // The regex specifically looks for year after colon and before pipe
    expect(
      extractYearFromTitleLine('Modern Movie: 2020 | Based on events from 1995 | R | 2h | 8.0'),
    ).toBe(2020);
    expect(
      extractYearFromTitleLine('Time Travel: 2021 | Character goes to 1985 | PG | 1h 30m | 7.5'),
    ).toBe(2021);
  });

  it('should handle mixed spacing in the entire line', () => {
    expect(extractYearFromTitleLine('  Movie  :  2020  |  R  |  2h  |  8.0  rating  ')).toBe(2020);
    expect(extractYearFromTitleLine('\tTitle\t:\t2021\t|\tPG\t|\t1h\t|\t7.5\t')).toBe(2021);
  });
});
