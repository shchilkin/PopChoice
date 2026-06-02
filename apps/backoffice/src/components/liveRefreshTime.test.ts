import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatLiveSyncTime } from './liveRefreshTime';

const TODAY_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

const STALE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

describe('formatLiveSyncTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns unknown for invalid timestamps', () => {
    expect(formatLiveSyncTime('not-a-date')).toBe('unknown');
  });

  it('formats same-day timestamps as local time only', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 2, 13, 45));

    const timestamp = new Date(2026, 5, 2, 9, 13);

    expect(formatLiveSyncTime(timestamp)).toBe(TODAY_TIME_FORMATTER.format(timestamp));
  });

  it('adds date context for stale timestamps', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 2, 13, 45));

    const timestamp = new Date(2026, 5, 1, 23, 55);

    expect(formatLiveSyncTime(timestamp)).toBe(STALE_TIME_FORMATTER.format(timestamp));
  });
});
