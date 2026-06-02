import { describe, expect, it } from 'vitest';

import {
  compactJobValue,
  getCountForState,
  isCatalogMaintenanceQueueJobState,
  normalizeLanguage,
  summarizeCatalogMaintenanceJobPayload,
  toBullMQJobIdPart,
} from './catalogMaintenanceQueueHelpers';

describe('catalog maintenance queue pure helpers', () => {
  it('normalizes blank languages to the default TMDB language', () => {
    expect(normalizeLanguage()).toBe('en-US');
    expect(normalizeLanguage('')).toBe('en-US');
    expect(normalizeLanguage('  ')).toBe('en-US');
    expect(normalizeLanguage(' ru-RU ')).toBe('ru-RU');
  });

  it('sanitizes BullMQ job id parts without changing safe characters', () => {
    expect(toBullMQJobIdPart('tmdb:331')).toBe('tmdb-331');
    expect(toBullMQJobIdPart('batch/one two')).toBe('batch-one-two');
    expect(toBullMQJobIdPart('safe_ID.42-7')).toBe('safe_ID.42-7');
  });

  it('recognizes only states exposed by the backoffice queue view', () => {
    expect(isCatalogMaintenanceQueueJobState('waiting')).toBe(true);
    expect(isCatalogMaintenanceQueueJobState('completed')).toBe(true);
    expect(isCatalogMaintenanceQueueJobState('waiting-children')).toBe(false);
    expect(isCatalogMaintenanceQueueJobState(undefined)).toBe(false);
  });

  it('compacts only scalar payload values for operator display', () => {
    expect(compactJobValue('  Movie  ')).toBe('Movie');
    expect(compactJobValue('  ')).toBeNull();
    expect(compactJobValue(42)).toBe('42');
    expect(compactJobValue(false)).toBe('false');
    expect(compactJobValue({ nested: true })).toBeNull();
  });

  it('maps selected job state counts from BullMQ count shape', () => {
    const counts = {
      active: 2,
      completed: 3,
      delayed: 5,
      failed: 7,
      prioritized: 11,
      waiting: 13,
      waitingChildren: 17,
    };

    expect(getCountForState(counts, 'waiting')).toBe(13);
    expect(getCountForState(counts, 'active')).toBe(2);
    expect(getCountForState(counts, 'completed')).toBe(3);
  });

  it('keeps unknown job payloads intentionally compact', () => {
    expect(
      summarizeCatalogMaintenanceJobPayload('unknown-job', {
        movieId: 331,
        tmdbId: 122,
        source: 'tmdb',
        page: 4,
        language: 'en-US',
        version: 1,
        largeObject: { ignored: true },
      }),
    ).toEqual([
      { label: 'Movie', value: '331' },
      { label: 'TMDB', value: '122' },
      { label: 'Source', value: 'tmdb' },
      { label: 'Page', value: '4' },
      { label: 'Language', value: 'en-US' },
      { label: 'Version', value: '1' },
    ]);
  });
});
