import { describe, expect, it } from 'vitest';

import { sanitizeBackofficeActionLog } from './backofficeActionLog';

describe('backoffice action logging', () => {
  it('keeps operator action logs low-cardinality and secret-safe', () => {
    const payload = sanitizeBackofficeActionLog({
      action: 'enqueue_backfill',
      actor: 'operator@example.test',
      durationMs: 12.7,
      issueKey: 'missing_poster_url',
      mode: 'single',
      repairBatchId: 'batch-1',
      repairBatchItemId: 'item-1',
      requestId: 'request-1',
      resultStatus: 'queued',
      targetId: '42',
      targetType: 'movie',
      // Extra properties are intentionally ignored by the sanitizer.
      authorization: 'Basic secret',
      databaseUrl: 'postgres://secret',
      note: 'private operator note',
      redisUrl: 'redis://secret',
    } as never);

    expect(payload).toEqual({
      action: 'enqueue_backfill',
      actor: 'operator@example.test',
      durationMs: 13,
      issueKey: 'missing_poster_url',
      mode: 'single',
      repairBatchId: 'batch-1',
      repairBatchItemId: 'item-1',
      requestId: 'request-1',
      resultStatus: 'queued',
      targetId: '42',
      targetType: 'movie',
    });
    expect(JSON.stringify(payload)).not.toContain('secret');
    expect(JSON.stringify(payload)).not.toContain('private operator note');
  });
});
