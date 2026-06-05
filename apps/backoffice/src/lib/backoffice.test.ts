import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUEUE_JOB_PAGE_SIZE,
  DEFAULT_RECOMMENDATION_EVAL_PAGE_SIZE,
  DEFAULT_REPAIR_BATCH_ITEM_PAGE_SIZE,
  DEFAULT_REPAIR_BATCH_PAGE_SIZE,
  MAX_QUEUE_JOB_PAGE_SIZE,
  MAX_RECOMMENDATION_EVAL_PAGE_SIZE,
  MAX_REPAIR_BATCH_PAGE_SIZE,
  buildRecommendationEvalActionBody,
  buildRecommendationEvalFormDataFromJsonBody,
  getRecommendationEvalActionStatusCode,
  parseCatalogMaintenanceQueueParams,
  parseRecommendationEvalListParams,
  parseRecommendationEvalMode,
  parseRepairBatchItemParams,
  parseRepairBatchListParams,
} from './backoffice';

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

describe('recommendation eval params and actions', () => {
  it('defaults eval run pagination', () => {
    expect(parseRecommendationEvalListParams({})).toEqual({
      page: 1,
      pageSize: DEFAULT_RECOMMENDATION_EVAL_PAGE_SIZE,
      limit: DEFAULT_RECOMMENDATION_EVAL_PAGE_SIZE,
      offset: 0,
    });
  });

  it('clamps eval run pagination', () => {
    expect(parseRecommendationEvalListParams({ page: '3', pageSize: '999' })).toEqual({
      page: 3,
      pageSize: MAX_RECOMMENDATION_EVAL_PAGE_SIZE,
      limit: MAX_RECOMMENDATION_EVAL_PAGE_SIZE,
      offset: 200,
    });
  });

  it('accepts safe eval modes without live acknowledgement', () => {
    const formData = new FormData();
    formData.set('mode', 'real-data');

    expect(parseRecommendationEvalMode(formData)).toBe('real-data');
  });

  it('requires an explicit guard for live evals', () => {
    const rejected = new FormData();
    rejected.set('mode', 'live');

    expect(() => parseRecommendationEvalMode(rejected)).toThrow(
      'Live recommendation evals require checking the cost acknowledgement',
    );

    const accepted = new FormData();
    accepted.set('mode', 'live');
    accepted.set('acknowledge_live_cost', 'yes');
    accepted.set('live_confirmation', 'RUN LIVE RECOMMENDATION EVAL');

    expect(parseRecommendationEvalMode(accepted)).toBe('live');
  });

  it('builds recommendation eval action JSON contracts and status codes', () => {
    expect(
      buildRecommendationEvalActionBody({
        jobId: 'job-1',
        mode: 'mock',
        runId: 'run-1',
        status: 'queued',
      }),
    ).toMatchObject({
      jobId: 'job-1',
      ok: true,
      status: 'queued',
    });
    expect(getRecommendationEvalActionStatusCode('queued')).toBe(200);

    expect(
      buildRecommendationEvalActionBody({
        errorMessage: 'redis down',
        mode: 'real-data',
        runId: 'run-2',
        status: 'unavailable',
      }),
    ).toMatchObject({
      errorMessage: 'redis down',
      ok: false,
      status: 'unavailable',
    });
    expect(getRecommendationEvalActionStatusCode('unavailable')).toBe(503);
    expect(getRecommendationEvalActionStatusCode('failed')).toBe(500);
  });

  it('maps recommendation eval JSON API bodies into action form data', () => {
    const formData = buildRecommendationEvalFormDataFromJsonBody({
      acknowledgeLiveCost: true,
      liveConfirmation: 'RUN LIVE RECOMMENDATION EVAL',
      mode: 'live',
    });

    expect(formData.get('mode')).toBe('live');
    expect(formData.get('acknowledge_live_cost')).toBe('yes');
    expect(formData.get('live_confirmation')).toBe('RUN LIVE RECOMMENDATION EVAL');

    const snakeCase = buildRecommendationEvalFormDataFromJsonBody({
      acknowledge_live_cost: 'yes',
      live_confirmation: 'RUN LIVE RECOMMENDATION EVAL',
    });
    expect(snakeCase.get('acknowledge_live_cost')).toBe('yes');
    expect(snakeCase.get('live_confirmation')).toBe('RUN LIVE RECOMMENDATION EVAL');
  });
});
