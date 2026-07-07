import { describe, expect, it } from 'vitest';

import { getBackfillReasonForIssue, getBulkRepairStatus } from './catalogRepairActionHelpers';
import {
  buildCatalogRepairActionBody,
  getCatalogRepairActionStatusCode,
  getCatalogRepairRedirectStatus,
} from './catalogRepairActionResponse';
import { catalogRepairMessage, REPAIRABLE_CATALOG_ISSUE_KEYS } from './catalogRepairActions';

describe('catalog repair actions', () => {
  it('keeps every known automatic repair issue registered as repairable', () => {
    expect([...REPAIRABLE_CATALOG_ISSUE_KEYS].sort()).toEqual([
      'missing_age_rating',
      'missing_cast_metadata',
      'missing_director_metadata',
      'missing_genre_metadata',
      'missing_keyword_metadata',
      'missing_localized_name',
      'missing_poster_url',
      'missing_runtime',
      'missing_tmdb_id',
      'missing_tmdb_matched_at',
      'stale_tmdb_metadata',
    ]);
  });

  it('maps repair result statuses to operator-facing messages', () => {
    expect(catalogRepairMessage('orchestration_queued')).toContain('orchestration accepted');
    expect(catalogRepairMessage('queued')).toContain('backfill job queued');
    expect(catalogRepairMessage('deduped')).toContain('already queued');
    expect(catalogRepairMessage('empty')).toContain('No affected movies');
    expect(catalogRepairMessage('partial')).toContain('partially queued');
    expect(catalogRepairMessage('failed')).toContain('failed to enqueue');
    expect(catalogRepairMessage('unavailable')).toContain('queue is unavailable');
  });

  it('maps catalog issues to the right backfill intent', () => {
    expect(getBackfillReasonForIssue('missing_tmdb_id')).toBe('missing_tmdb_id');
    expect(getBackfillReasonForIssue('stale_tmdb_metadata')).toBe('manual_refresh');
    expect(getBackfillReasonForIssue('missing_poster_url')).toBe('missing_metadata');
  });

  it('classifies bulk repair outcomes from counters', () => {
    const base = {
      attempted: 10,
      deduped: 0,
      failed: 0,
      queued: 0,
      unavailable: 0,
    };

    expect(getBulkRepairStatus({ ...base, attempted: 0 })).toBe('empty');
    expect(getBulkRepairStatus({ ...base, queued: 4 })).toBe('queued');
    expect(getBulkRepairStatus({ ...base, deduped: 4 })).toBe('queued');
    expect(getBulkRepairStatus({ ...base, failed: 1, queued: 4 })).toBe('partial');
    expect(getBulkRepairStatus({ ...base, failed: 1 })).toBe('failed');
    expect(getBulkRepairStatus({ ...base, unavailable: 10 })).toBe('unavailable');
  });

  it('builds catalog repair JSON contracts and response status codes', () => {
    expect(
      buildCatalogRepairActionBody({
        issueKey: 'missing_poster_url',
        job: {
          jobId: 'backfill-42',
          jobName: 'catalog-backfill-movie',
          language: 'en-US',
          queueName: 'catalog-maintenance',
          status: 'queued',
        },
        mode: 'single',
        movieId: '42',
        status: 'queued',
      }),
    ).toMatchObject({
      issueKey: 'missing_poster_url',
      job: {
        jobId: 'backfill-42',
        jobName: 'catalog-backfill-movie',
        language: 'en-US',
        queueName: 'catalog-maintenance',
        status: 'queued',
      },
      mode: 'single',
      movieId: '42',
      ok: true,
      status: 'queued',
    });
    expect(getCatalogRepairActionStatusCode('queued')).toBe(200);

    expect(
      buildCatalogRepairActionBody({
        issueKey: 'missing_poster_url',
        mode: 'bulk',
        status: 'partial',
        summary: {
          attempted: 2,
          deduped: 0,
          failed: 1,
          issueKey: 'missing_poster_url',
          jobs: [],
          limit: 2,
          movieIds: ['42'],
          queued: 1,
          totalCandidates: 2,
          unavailable: 0,
        },
      }),
    ).toMatchObject({
      mode: 'bulk',
      ok: false,
      status: 'partial',
    });
    expect(getCatalogRepairActionStatusCode('partial')).toBe(207);
    expect(getCatalogRepairActionStatusCode('unavailable')).toBe(503);
    expect(getCatalogRepairActionStatusCode('failed')).toBe(500);
  });

  it('maps catalog repair results into redirect status flags', () => {
    expect(
      getCatalogRepairRedirectStatus({
        issueKey: 'missing_poster_url',
        job: {
          jobId: 'backfill-42',
          jobName: 'catalog-backfill-movie',
          language: 'en-US',
          queueName: 'catalog-maintenance',
          status: 'queued',
        },
        mode: 'single',
        movieId: '42',
        status: 'queued',
      }),
    ).toBe('queued');
    expect(
      getCatalogRepairRedirectStatus({
        issueKey: 'missing_poster_url',
        mode: 'bulk',
        status: 'orchestration_queued',
        summary: {
          attempted: 0,
          deduped: 0,
          failed: 0,
          issueKey: 'missing_poster_url',
          jobs: [],
          limit: 10,
          movieIds: [],
          queued: 0,
          totalCandidates: 10,
          unavailable: 0,
        },
      }),
    ).toBe('bulk-orchestration-queued');
  });
});
