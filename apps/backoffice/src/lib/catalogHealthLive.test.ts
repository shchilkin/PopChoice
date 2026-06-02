import { describe, expect, it } from 'vitest';

import {
  catalogHealthLiveFingerprint,
  isCatalogHealthLiveData,
  parseCatalogHealthSnapshotMessage,
  type CatalogHealthLiveData,
} from './catalogHealthLive';

const liveData: CatalogHealthLiveData = {
  auditPage: {
    limit: 25,
    offset: 0,
    totalCount: 3,
  },
  issueMoviePage: {
    issueKey: 'missing_poster_url',
    limit: 25,
    offset: 0,
    totalCount: 12,
  },
  queueSnapshot: {
    available: true,
    counts: {
      active: 1,
      completed: 10,
      delayed: 0,
      failed: 0,
      prioritized: 0,
      waiting: 2,
      waitingChildren: 0,
    },
    openJobs: 3,
    queueName: 'catalog-maintenance',
    updatedAt: '2026-06-02T12:00:00.000Z',
  },
  report: {
    activeIssues: 2,
    duplicateGroups: 0,
    generatedAt: '2026-06-02T12:00:00.000Z',
    issueCounts: {
      missing_poster_url: 12,
      missing_runtime: 4,
    },
    staleAfterDays: 180,
    totalMovies: 351,
  },
};

describe('catalog health live snapshots', () => {
  it('parses a valid stream snapshot payload', () => {
    const message = parseCatalogHealthSnapshotMessage(
      JSON.stringify({
        data: liveData,
        queueEvent: { type: 'completed' },
        receivedAt: '2026-06-02T12:00:01.000Z',
        trigger: 'queue-event',
      }),
    );

    expect(message).toEqual({
      data: liveData,
      queueEvent: { type: 'completed' },
      receivedAt: '2026-06-02T12:00:01.000Z',
      trigger: 'queue-event',
    });
  });

  it('rejects malformed stream payloads', () => {
    expect(parseCatalogHealthSnapshotMessage('not-json')).toBeNull();
    expect(parseCatalogHealthSnapshotMessage(JSON.stringify({ data: { report: {} } }))).toBeNull();
    expect(isCatalogHealthLiveData({ report: {} })).toBe(false);
    expect(
      isCatalogHealthLiveData({
        ...liveData,
        auditPage: { totalCount: liveData.auditPage.totalCount },
      }),
    ).toBe(false);
    expect(
      isCatalogHealthLiveData({
        ...liveData,
        queueSnapshot: {
          ...liveData.queueSnapshot,
          counts: {
            ...liveData.queueSnapshot.counts,
            waiting: Number.NaN,
          },
        },
      }),
    ).toBe(false);
    expect(
      isCatalogHealthLiveData({
        ...liveData,
        issueMoviePage: { issueKey: 'missing_poster_url', totalCount: 12 },
      }),
    ).toBe(false);
  });

  it('fingerprints the live fields that should trigger a server refresh', () => {
    const original = catalogHealthLiveFingerprint(liveData);
    const changed = catalogHealthLiveFingerprint({
      ...liveData,
      queueSnapshot: {
        ...liveData.queueSnapshot,
        counts: {
          ...liveData.queueSnapshot.counts,
          waiting: 1,
        },
        openJobs: 2,
      },
    });

    expect(changed).not.toBe(original);
  });
});
