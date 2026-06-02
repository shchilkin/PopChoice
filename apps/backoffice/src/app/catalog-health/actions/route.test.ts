import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  catalogRepairMessage: vi.fn(),
  getBackofficeErrorStatus: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
  parseBackofficeReturnPath: vi.fn(),
  performCatalogRepairAction: vi.fn(),
}));

vi.mock('../../../lib/backoffice', () => ({
  catalogRepairMessage: mocks.catalogRepairMessage,
  getBackofficeErrorStatus: mocks.getBackofficeErrorStatus,
  logBackofficeError: mocks.logBackofficeError,
  parseBackofficeReturnPath: mocks.parseBackofficeReturnPath,
  performCatalogRepairAction: mocks.performCatalogRepairAction,
}));

vi.mock('../../../lib/sameOriginRequest', () => ({
  isSameOriginRequest: mocks.isSameOriginRequest,
}));

import { POST } from './route';

function createRepairRequest({
  accept,
  action = 'enqueue_backfill',
  returnTo = '/catalog-health',
  requestedWith,
}: {
  accept?: string;
  action?: string;
  returnTo?: string;
  requestedWith?: string;
} = {}) {
  const formData = new FormData();
  formData.set('action', action);
  formData.set('issue_key', 'missing_poster_url');
  formData.set('movie_id', '42');
  formData.set('return_to', returnTo);

  const headers = new Headers();
  if (accept) headers.set('accept', accept);
  if (requestedWith) headers.set('x-requested-with', requestedWith);

  return new Request('https://backoffice.test/catalog-health/actions', {
    body: formData,
    headers,
    method: 'POST',
  });
}

describe('catalog health repair action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.catalogRepairMessage.mockImplementation((status: string) => `message:${status}`);
    mocks.getBackofficeErrorStatus.mockReturnValue(500);
    mocks.isSameOriginRequest.mockReturnValue(true);
    mocks.parseBackofficeReturnPath.mockImplementation((value: FormDataEntryValue | null) =>
      typeof value === 'string' ? value : '/',
    );
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createRepairRequest({ accept: 'application/json' }) as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: 'failed',
      message: 'Forbidden.',
    });
    expect(mocks.performCatalogRepairAction).not.toHaveBeenCalled();
  });

  it('returns the JSON queued contract for successful single repairs', async () => {
    mocks.performCatalogRepairAction.mockResolvedValue({
      issueKey: 'missing_poster_url',
      job: { jobId: 'backfill-42', status: 'queued' },
      mode: 'single',
      movieId: '42',
      status: 'queued',
    });

    const response = await POST(createRepairRequest({ requestedWith: 'fetch' }) as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      issueKey: 'missing_poster_url',
      job: { jobId: 'backfill-42', status: 'queued' },
      message: 'message:queued',
      mode: 'single',
      movieId: '42',
      ok: true,
      status: 'queued',
    });
    expect(mocks.performCatalogRepairAction).toHaveBeenCalledWith(
      expect.any(FormData),
      expect.any(Headers),
    );
  });

  it('returns a partial JSON status for partially queued bulk repairs', async () => {
    const summary = {
      attempted: 25,
      deduped: 0,
      failed: 1,
      issueKey: 'missing_poster_url',
      jobs: [],
      limit: 25,
      movieIds: ['42'],
      queued: 24,
      totalCandidates: 100,
      unavailable: 0,
    };
    mocks.performCatalogRepairAction.mockResolvedValue({
      issueKey: 'missing_poster_url',
      mode: 'bulk',
      status: 'partial',
      summary,
    });

    const response = await POST(
      createRepairRequest({
        accept: 'application/json',
        action: 'bulk_enqueue_backfill',
      }) as never,
    );

    expect(response.status).toBe(207);
    await expect(response.json()).resolves.toEqual({
      issueKey: 'missing_poster_url',
      message: 'message:partial',
      mode: 'bulk',
      ok: false,
      status: 'partial',
      summary,
    });
  });

  it('redirects browser form submissions back with repair status', async () => {
    mocks.performCatalogRepairAction.mockResolvedValue({
      issueKey: 'missing_poster_url',
      job: { jobId: 'backfill-42', status: 'queued' },
      mode: 'single',
      movieId: '42',
      status: 'queued',
    });

    const response = await POST(
      createRepairRequest({ returnTo: '/catalog-health?issue=missing_poster_url' }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://backoffice.test/catalog-health?issue=missing_poster_url&repair=queued',
    );
  });

  it('returns the public JSON error contract when repair action fails', async () => {
    const error = { publicMessage: 'Movie not found.' };
    mocks.getBackofficeErrorStatus.mockReturnValue(404);
    mocks.performCatalogRepairAction.mockRejectedValue(error);

    const response = await POST(createRepairRequest({ accept: 'application/json' }) as never);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: 'failed',
      message: 'Movie not found.',
    });
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to apply catalog-health repair action',
      error,
    );
  });
});
