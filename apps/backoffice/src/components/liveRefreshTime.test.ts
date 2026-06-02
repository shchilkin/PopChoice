import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatLiveSyncTime } from './liveRefreshTime';

const TODAY_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
});

const STALE_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
});

const OLD_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

describe('formatLiveSyncTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns unknown for invalid timestamps', () => {
    expect(formatLiveSyncTime('not-a-date')).toBe('unknown');
  });

  it('formats same-day timestamps as an operator-friendly local update time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 2, 13, 45));

    const timestamp = new Date(2026, 5, 2, 9, 13);

    expect(formatLiveSyncTime(timestamp)).toBe(
      `today at ${TODAY_TIME_FORMATTER.format(timestamp)}`,
    );
  });

  it('adds date context for stale timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 2, 13, 45));

    const timestamp = new Date(2026, 5, 1, 23, 55);

    expect(formatLiveSyncTime(timestamp)).toBe(
      `${STALE_DATE_FORMATTER.format(timestamp)} at ${TODAY_TIME_FORMATTER.format(timestamp)}`,
    );
  });

  it('keeps the year for old timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 2, 13, 45));

    const timestamp = new Date(2025, 11, 31, 23, 55);

    expect(formatLiveSyncTime(timestamp)).toBe(
      `${OLD_DATE_FORMATTER.format(timestamp)} at ${TODAY_TIME_FORMATTER.format(timestamp)}`,
    );
  });
});
