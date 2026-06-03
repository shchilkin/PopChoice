import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBackofficeFormRequest,
  expectBackofficeActionFailureJson,
  expectBackofficeActionJson,
} from '../../../../test/backofficeActionRoute';

const mocks = vi.hoisted(() => ({
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
  retryCatalogRepairBatchItem: vi.fn(),
}));

vi.mock('../../../../lib/backoffice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/backoffice')>();
  return {
    ...actual,
    logBackofficeError: mocks.logBackofficeError,
    retryCatalogRepairBatchItem: mocks.retryCatalogRepairBatchItem,
  };
});

vi.mock('../../../../lib/sameOriginRequest', () => ({
  isSameOriginRequest: mocks.isSameOriginRequest,
}));

import { POST } from './route';

function createRetryRequest(fields: Record<string, string> = {}) {
  return createBackofficeFormRequest({
    fields: {
      action: 'retry_item',
      item_id: 'item-1',
      return_to: '/repair-batches/batch-1?status=needs_review',
      ...fields,
    },
    requestedWith: 'fetch',
    url: 'https://backoffice.test/repair-batches/batch-1/actions',
  });
}

describe('repair batch action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOriginRequest.mockReturnValue(true);
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createRetryRequest() as never, {
      params: Promise.resolve({ id: 'batch-1' }),
    });

    await expectBackofficeActionFailureJson(response, { message: 'Forbidden.', status: 403 });
    expect(mocks.retryCatalogRepairBatchItem).not.toHaveBeenCalled();
  });

  it('returns the JSON retry contract for queued repair batch items', async () => {
    const item = {
      batchId: 'batch-1',
      id: 'item-1',
      issueKey: 'missing_poster_url',
      movieId: '42',
      status: 'queued',
    };
    const job = {
      jobId: 'job-42',
      jobName: 'backfill-movie',
      language: 'en',
      queueName: 'catalog-maintenance',
      status: 'queued',
    };
    mocks.retryCatalogRepairBatchItem.mockResolvedValue({
      batchId: 'batch-1',
      issueKey: 'missing_poster_url',
      item,
      job,
      status: 'queued',
    });

    const response = await POST(createRetryRequest({ batch_id: '' }) as never, {
      params: Promise.resolve({ id: 'batch-1' }),
    });

    await expectBackofficeActionJson(response, {
      body: {
        batchId: 'batch-1',
        issueKey: 'missing_poster_url',
        item,
        job,
        message: 'Repair batch item retry queued.',
        ok: true,
        redirectTo: '/repair-batches/batch-1?status=needs_review',
        status: 'queued',
      },
      status: 200,
    });

    const formData = mocks.retryCatalogRepairBatchItem.mock.calls[0]?.[0] as FormData;
    expect(formData.get('batch_id')).toBe('batch-1');
    expect(mocks.retryCatalogRepairBatchItem).toHaveBeenCalledWith(
      expect.any(FormData),
      expect.any(Headers),
    );
  });
});
