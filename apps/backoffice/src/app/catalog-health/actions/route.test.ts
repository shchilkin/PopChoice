import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBackofficeFormRequest,
  expectBackofficeActionFailureJson,
  expectBackofficeActionJson,
} from '../../../test/backofficeActionRoute';

const mocks = vi.hoisted(() => ({
  backofficeActionErrorResponse: vi.fn(),
  backofficeActionFailureResponse: vi.fn(),
  catalogRepairMessage: vi.fn(),
  getBackofficeErrorStatus: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
  parseBackofficeReturnPath: vi.fn(),
  performCatalogRepairAction: vi.fn(),
  wantsBackofficeJsonResponse: vi.fn(),
}));

vi.mock('../../../lib/backoffice', () => ({
  backofficeActionErrorResponse: mocks.backofficeActionErrorResponse,
  backofficeActionFailureResponse: mocks.backofficeActionFailureResponse,
  catalogRepairMessage: mocks.catalogRepairMessage,
  getBackofficeErrorStatus: mocks.getBackofficeErrorStatus,
  logBackofficeError: mocks.logBackofficeError,
  parseBackofficeReturnPath: mocks.parseBackofficeReturnPath,
  performCatalogRepairAction: mocks.performCatalogRepairAction,
  wantsBackofficeJsonResponse: mocks.wantsBackofficeJsonResponse,
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
  return createBackofficeFormRequest({
    accept,
    fields: {
      action,
      issue_key: 'missing_poster_url',
      movie_id: '42',
      return_to: returnTo,
    },
    requestedWith,
    url: 'https://backoffice.test/catalog-health/actions',
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
    mocks.wantsBackofficeJsonResponse.mockImplementation((request: Request) => {
      const accept = request.headers.get('accept') ?? '';
      const requestedWith = request.headers.get('x-requested-with') ?? '';
      return accept.includes('application/json') || requestedWith.toLowerCase() === 'fetch';
    });
    mocks.backofficeActionFailureResponse.mockImplementation((message: string, status: number) =>
      Response.json({ ok: false, status: 'failed', message }, { status }),
    );
    mocks.backofficeActionErrorResponse.mockImplementation((error: unknown, fallback: string) => {
      const publicMessage =
        typeof error === 'object' && error !== null && 'publicMessage' in error
          ? (error as { publicMessage?: unknown }).publicMessage
          : undefined;
      const message =
        typeof publicMessage === 'string' && publicMessage.trim() !== '' ? publicMessage : fallback;
      return Response.json(
        { ok: false, status: 'failed', message },
        { status: mocks.getBackofficeErrorStatus(error) },
      );
    });
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createRepairRequest({ accept: 'application/json' }) as never);

    await expectBackofficeActionFailureJson(response, { message: 'Forbidden.', status: 403 });
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

    await expectBackofficeActionJson(response, {
      body: {
        issueKey: 'missing_poster_url',
        job: { jobId: 'backfill-42', status: 'queued' },
        message: 'message:queued',
        mode: 'single',
        movieId: '42',
        ok: true,
        status: 'queued',
      },
      status: 200,
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

    await expectBackofficeActionJson(response, {
      body: {
        issueKey: 'missing_poster_url',
        message: 'message:partial',
        mode: 'bulk',
        ok: false,
        status: 'partial',
        summary,
      },
      status: 207,
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

    await expectBackofficeActionFailureJson(response, { message: 'Movie not found.', status: 404 });
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to apply catalog-health repair action',
      error,
    );
  });
});
