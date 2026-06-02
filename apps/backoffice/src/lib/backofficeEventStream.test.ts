import { describe, expect, it } from 'vitest';

import {
  encodeServerSentEvent,
  getSearchParamsRecord,
  normalizeQueueEventPayload,
  withBackofficeStreamMetadata,
} from './backofficeEventStream';

describe('backoffice event stream helpers', () => {
  it('encodes server-sent events with JSON payloads', () => {
    const encoded = new TextDecoder().decode(encodeServerSentEvent('snapshot', { ok: true }));

    expect(encoded).toBe('event: snapshot\ndata: {"ok":true}\n\n');
  });

  it('normalizes BullMQ primitive payloads into records', () => {
    expect(normalizeQueueEventPayload('job-1')).toEqual({ value: 'job-1' });
    expect(normalizeQueueEventPayload(42)).toEqual({ value: 42 });
    expect(normalizeQueueEventPayload(null)).toEqual({ value: null });
  });

  it('keeps BullMQ object payloads as records', () => {
    expect(normalizeQueueEventPayload({ jobId: 'backfill-1' })).toEqual({ jobId: 'backfill-1' });
    expect(
      normalizeQueueEventPayload(['unexpected'] as unknown as Record<string, unknown>),
    ).toEqual({ value: ['unexpected'] });
  });

  it('adds queue metadata without dropping the original payload', () => {
    const message = withBackofficeStreamMetadata({ trigger: 'connected' }, { queueName: 'queue' });

    expect(message).toMatchObject({ queueName: 'queue', trigger: 'connected' });
    expect(typeof message.receivedAt).toBe('string');
  });

  it('converts repeated URL search params into arrays', () => {
    const params = new URLSearchParams('state=waiting&state=failed&page=2');

    expect(getSearchParamsRecord(params)).toEqual({
      page: '2',
      state: ['waiting', 'failed'],
    });
  });
});
