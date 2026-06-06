import { describe, expect, it } from 'vitest';

import { getDeckCardAnimate, getDeckKeyboardAction } from './movieMemoryDeckViewModel';
import {
  formatDuration,
  formatMovieName,
  getMovieSummary,
  getMovieTitle,
  getOriginalTitle,
} from './movieMemoryDisplayViewModel';

describe('movieMemoryViewModel', () => {
  it('maps deck keyboard shortcuts when the event can be handled', () => {
    const baseEvent = {
      altKey: false,
      ctrlKey: false,
      defaultPrevented: false,
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    expect(getDeckKeyboardAction({ ...baseEvent, key: 'ArrowLeft' })).toBe('not_seen');
    expect(getDeckKeyboardAction({ ...baseEvent, key: 'ArrowRight' })).toBe('watched');
    expect(getDeckKeyboardAction({ ...baseEvent, key: 'ArrowDown' })).toBe('unsure');
    expect(getDeckKeyboardAction({ ...baseEvent, key: 'Enter' })).toBeNull();
  });

  it('ignores deck keyboard shortcuts when modifier or handled state is present', () => {
    const baseEvent = {
      altKey: false,
      ctrlKey: false,
      defaultPrevented: false,
      key: 'ArrowRight',
      metaKey: false,
      shiftKey: false,
      target: null,
    };

    expect(getDeckKeyboardAction({ ...baseEvent, defaultPrevented: true })).toBeNull();
    expect(getDeckKeyboardAction({ ...baseEvent, metaKey: true })).toBeNull();
    expect(getDeckKeyboardAction({ ...baseEvent, ctrlKey: true })).toBeNull();
    expect(getDeckKeyboardAction({ ...baseEvent, altKey: true })).toBeNull();
    expect(getDeckKeyboardAction({ ...baseEvent, shiftKey: true })).toBeNull();
  });

  it('returns deck card animation variants', () => {
    expect(getDeckCardAnimate(null, false)).toEqual({
      opacity: 1,
      rotate: 0,
      scale: 1,
      x: 0,
      y: 0,
    });
    expect(getDeckCardAnimate('watched', false)).toMatchObject({ opacity: 0, x: 520 });
    expect(getDeckCardAnimate('not_seen', false)).toMatchObject({ opacity: 0, x: -520 });
    expect(getDeckCardAnimate('unsure', false)).toMatchObject({ opacity: 0, y: 150 });
    expect(getDeckCardAnimate('watched', true)).toEqual({
      opacity: 0,
      rotate: 0,
      scale: 0.98,
      x: 0,
      y: 0,
    });
  });

  it('formats localized movie titles and summaries', () => {
    expect(getMovieTitle({ movieName: 'Original', localizedName: 'Localized' }, 'ru')).toBe(
      'Localized',
    );
    expect(getMovieTitle({ movieName: 'Original', localizedName: 'Localized' }, 'en')).toBe(
      'Original',
    );
    expect(formatMovieName('Movie', 1999)).toBe('Movie (1999)');
    expect(formatMovieName('Movie', null)).toBe('Movie');
    expect(getOriginalTitle({ movieName: 'Original', localizedName: 'Localized' }, 'ru')).toBe(
      'Original',
    );
    expect(getOriginalTitle({ movieName: 'Original', localizedName: 'Original' }, 'ru')).toBeNull();
    expect(
      getOriginalTitle({ movieName: 'Original', localizedName: 'Localized' }, 'en'),
    ).toBeNull();

    expect(
      getMovieSummary({ description: '  English overview  ', localizedOverview: null }, 'en'),
    ).toBe('English overview');
    expect(getMovieSummary({ description: 'English', localizedOverview: 'Localized' }, 'fi')).toBe(
      'Localized',
    );
    expect(getMovieSummary({ description: '   ', localizedOverview: null }, 'en')).toBeNull();
    expect(
      getMovieSummary({ description: 'x'.repeat(300), localizedOverview: null }, 'en'),
    ).toHaveLength(260);
  });

  it('formats durations per supported locale', () => {
    expect(formatDuration(null, 'en')).toBeNull();
    expect(formatDuration(0, 'en')).toBeNull();
    expect(formatDuration(45, 'en')).toBe('45 m');
    expect(formatDuration(125, 'en')).toBe('2 h 5 m');
    expect(formatDuration(120, 'en')).toBe('2 h');
    expect(formatDuration(125, 'ru')).toBe('2 ч 5 мин');
    expect(formatDuration(120, 'ru')).toBe('2 ч');
    expect(formatDuration(125, 'fi')).toBe('2 t 5 min');
    expect(formatDuration(125, 'es')).toBe('2 h 5 m');
  });
});
