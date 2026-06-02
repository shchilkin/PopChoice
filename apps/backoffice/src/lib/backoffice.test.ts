import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUEUE_JOB_PAGE_SIZE,
  DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE,
  DEFAULT_REPAIR_BATCH_PAGE_SIZE,
  MAX_QUEUE_JOB_PAGE_SIZE,
  MAX_REPAIR_BATCH_PAGE_SIZE,
  parseBackofficeReturnPath,
  parseCatalogMaintenanceQueueParams,
  parseRepairBatchItemParams,
  parseRepairBatchListParams,
} from './backoffice';

describe('backoffice action return paths', () => {
  it('keeps safe relative return paths with query and hash', () => {
    expect(parseBackofficeReturnPath('/movies/42?tab=repair#audit')).toBe(
      '/movies/42?tab=repair#audit',
    );
  });

  it('falls back for external, protocol-relative, or missing return paths', () => {
    expect(parseBackofficeReturnPath('https://evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath('//evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath('\\//evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath('\\/evil.example/movies/42')).toBe('/');
    expect(parseBackofficeReturnPath(null)).toBe('/');
  });
});

describe('repair batch query params', () => {
  it('defaults list pagination for recent repair batches', () => {
    expect(parseRepairBatchListParams({})).toEqual({
      page: 1,
      pageSize: DEFAULT_REPAIR_BATCH_PAGE_SIZE,
      limit: DEFAULT_REPAIR_BATCH_PAGE_SIZE,
      offset: 0,
      sort: 'newest',
      status: 'all',
    });
  });

  it('clamps list page size and calculates offset', () => {
    expect(
      parseRepairBatchListParams({
        page: '3',
        pageSize: '999',
        sort: 'needs_review',
        status: 'partial',
      }),
    ).toEqual({
      page: 3,
      pageSize: MAX_REPAIR_BATCH_PAGE_SIZE,
      limit: MAX_REPAIR_BATCH_PAGE_SIZE,
      offset: 200,
      sort: 'needs_review',
      status: 'partial',
    });
  });

  it('uses independent item pagination names for detail pages', () => {
    expect(
      parseRepairBatchItemParams({
        itemPage: '2',
        itemPageSize: '10',
        itemSort: 'newest',
        itemStatus: 'completed_unresolved',
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      limit: 10,
      offset: 10,
      sort: 'newest',
      status: 'completed_unresolved',
    });
  });

  it('falls back for invalid item pagination values', () => {
    expect(
      parseRepairBatchItemParams({
        itemPage: 'zero',
        itemPageSize: '-1',
        itemSort: 'unknown',
        itemStatus: 'unknown',
      }),
    ).toEqual({
      page: 1,
      pageSize: DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE,
      limit: DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE,
      offset: 0,
      sort: 'needs_review',
      status: 'needs_review',
    });
  });

  it('defaults catalog maintenance queue filters', () => {
    expect(parseCatalogMaintenanceQueueParams({})).toEqual({
      state: 'waiting',
      page: 1,
      pageSize: DEFAULT_QUEUE_JOB_PAGE_SIZE,
      limit: DEFAULT_QUEUE_JOB_PAGE_SIZE,
      offset: 0,
    });
  });

  it('clamps catalog maintenance queue pagination and validates state', () => {
    expect(
      parseCatalogMaintenanceQueueParams({
        page: '4',
        pageSize: '999',
        state: 'failed',
      }),
    ).toEqual({
      state: 'failed',
      page: 4,
      pageSize: MAX_QUEUE_JOB_PAGE_SIZE,
      limit: MAX_QUEUE_JOB_PAGE_SIZE,
      offset: 150,
    });

    expect(parseCatalogMaintenanceQueueParams({ state: 'unknown' }).state).toBe('waiting');
  });
});
