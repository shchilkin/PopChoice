import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBackofficeFormRequest,
  expectBackofficeActionFailureJson,
  expectBackofficeActionJson,
} from '../../../test/backofficeActionRoute';

const mocks = vi.hoisted(() => ({
  getBackofficeErrorStatus: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
  performRecommendationEvalAction: vi.fn(),
}));

vi.mock('../../../lib/backoffice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/backoffice')>();
  return {
    ...actual,
    getBackofficeErrorStatus: mocks.getBackofficeErrorStatus,
    logBackofficeError: mocks.logBackofficeError,
    performRecommendationEvalAction: mocks.performRecommendationEvalAction,
  };
});

vi.mock('../../../lib/sameOriginRequest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/sameOriginRequest')>();
  return {
    ...actual,
    isSameOriginRequest: mocks.isSameOriginRequest,
  };
});

import { POST } from './route';

function createEvalActionRequest({
  fetch = true,
  fields = { mode: 'mock' },
  url = 'https://backoffice.test/recommendation-evals/actions',
}: {
  fetch?: boolean;
  fields?: Record<string, string>;
  url?: string;
} = {}) {
  return createBackofficeFormRequest({
    fetch,
    fields,
    url,
  });
}

describe('recommendation eval form action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBackofficeErrorStatus.mockReturnValue(500);
    mocks.isSameOriginRequest.mockReturnValue(true);
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createEvalActionRequest() as never);

    await expectBackofficeActionFailureJson(response, { message: 'Forbidden.', status: 403 });
    expect(mocks.performRecommendationEvalAction).not.toHaveBeenCalled();
  });

  it('returns the shared queued JSON contract for fetch requests', async () => {
    mocks.performRecommendationEvalAction.mockResolvedValue({
      jobId: 'job-1',
      mode: 'mock',
      runId: 'run-1',
      status: 'queued',
    });

    const response = await POST(createEvalActionRequest() as never);

    await expectBackofficeActionJson(response, {
      body: expect.objectContaining({
        jobId: 'job-1',
        mode: 'mock',
        ok: true,
        runId: 'run-1',
        status: 'queued',
      }),
      status: 200,
    });
    expect(mocks.performRecommendationEvalAction).toHaveBeenCalledWith(
      expect.any(FormData),
      expect.any(Headers),
    );
  });

  it('redirects non-fetch form posts with the eval status', async () => {
    mocks.performRecommendationEvalAction.mockResolvedValue({
      errorMessage: 'queue unavailable',
      mode: 'mock',
      runId: 'run-2',
      status: 'unavailable',
    });

    const response = await POST(createEvalActionRequest({ fetch: false }) as never);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://backoffice.test/recommendation-evals?eval=unavailable',
    );
  });

  it('does not redirect browser form posts to a bind address', async () => {
    mocks.performRecommendationEvalAction.mockResolvedValue({
      errorMessage: 'queue unavailable',
      mode: 'real-data',
      runId: 'run-2',
      status: 'unavailable',
    });

    const response = await POST(
      createEvalActionRequest({
        fetch: false,
        fields: { mode: 'real-data' },
        url: 'http://0.0.0.0:3000/recommendation-evals/actions',
      }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/recommendation-evals?eval=unavailable',
    );
  });

  it('keeps forbidden browser redirects off bind addresses', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(
      createEvalActionRequest({
        fetch: false,
        url: 'http://0.0.0.0:3000/recommendation-evals/actions',
      }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/recommendation-evals?eval=forbidden',
    );
    expect(mocks.performRecommendationEvalAction).not.toHaveBeenCalled();
  });

  it('returns the JSON error contract when the action throws', async () => {
    const error = new Error('boom');
    mocks.getBackofficeErrorStatus.mockReturnValue(422);
    mocks.performRecommendationEvalAction.mockRejectedValue(error);

    const response = await POST(createEvalActionRequest() as never);

    await expectBackofficeActionJson(response, {
      body: {
        message: 'Recommendation eval action failed. Check backoffice logs for details.',
        ok: false,
        status: 'failed',
      },
      status: 422,
    });
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to apply recommendation eval action',
      error,
    );
  });

  it('keeps failed browser redirects off bind addresses', async () => {
    const error = new Error('boom');
    mocks.performRecommendationEvalAction.mockRejectedValue(error);

    const response = await POST(
      createEvalActionRequest({
        fetch: false,
        url: 'http://0.0.0.0:3000/recommendation-evals/actions',
      }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/recommendation-evals?eval=failed',
    );
  });
});
