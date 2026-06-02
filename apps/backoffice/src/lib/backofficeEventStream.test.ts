import type { QueueEvents } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import {
  bindCatalogMaintenanceQueueEvents,
  createServerSentEventResponse,
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

  it('creates SSE responses with streaming-safe headers', () => {
    const stream = new ReadableStream<Uint8Array>();
    const response = createServerSentEventResponse(stream);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('binds and cleans up catalog maintenance queue event listeners', () => {
    const listeners = new Map<string, Array<(payload: unknown) => void>>();
    const queueEvents = {
      off: vi.fn((eventName: string, listener: (payload: unknown) => void) => {
        listeners.set(
          eventName,
          (listeners.get(eventName) ?? []).filter((current) => current !== listener),
        );
      }),
      on: vi.fn((eventName: string, listener: (payload: unknown) => void) => {
        listeners.set(eventName, [...(listeners.get(eventName) ?? []), listener]);
      }),
    } as unknown as QueueEvents;
    const forward = vi.fn((eventName: string) => vi.fn((payload) => ({ eventName, payload })));

    const cleanup = bindCatalogMaintenanceQueueEvents(queueEvents, forward);

    expect(queueEvents.on).toHaveBeenCalledTimes(8);
    expect(forward).toHaveBeenCalledWith('waiting');
    expect(forward).toHaveBeenCalledWith('progress');

    cleanup();

    expect(queueEvents.off).toHaveBeenCalledTimes(8);
    expect([...listeners.values()].every((entries) => entries.length === 0)).toBe(true);
  });
});
