import { describe, expect, it } from 'vitest';

import { COLOR_PAIRS, getPersonColors } from './colors';

describe('getPersonColors', () => {
  it('should return the correct color pair for indices within the COLOR_PAIRS range', () => {
    expect(getPersonColors(0)).toBe(COLOR_PAIRS[0]);
    expect(getPersonColors(5)).toBe(COLOR_PAIRS[5]);
    expect(getPersonColors(9)).toBe(COLOR_PAIRS[9]);
  });

  it('should wrap around correctly using modulo for indices larger than COLOR_PAIRS.length', () => {
    const len = COLOR_PAIRS.length;
    expect(getPersonColors(len)).toBe(COLOR_PAIRS[0]);
    expect(getPersonColors(len + 1)).toBe(COLOR_PAIRS[1]);
    expect(getPersonColors(2 * len)).toBe(COLOR_PAIRS[0]);
    expect(getPersonColors(2 * len + 5)).toBe(COLOR_PAIRS[5]);
  });

  it('should handle large indices consistently', () => {
    const largeIndex = 123456;
    expect(getPersonColors(largeIndex)).toBe(COLOR_PAIRS[largeIndex % COLOR_PAIRS.length]);
  });

  it('should return undefined for negative indices (current behavior)', () => {
    // In JavaScript, -1 % 10 is -1, and COLOR_PAIRS[-1] is undefined
    expect(getPersonColors(-1)).toBeUndefined();
    expect(getPersonColors(-10)).toBeUndefined();
  });
});
