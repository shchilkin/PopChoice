import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBackofficeFormRequest,
  expectBackofficeActionFailureJson,
  expectBackofficeActionJson,
} from '../../../../test/backofficeActionRoute';

const mocks = vi.hoisted(() => ({
  applyTMDBReviewFormAction: vi.fn(),
  backofficeActionErrorResponse: vi.fn(),
  backofficeActionFailureResponse: vi.fn(),
  getBackofficeErrorStatus: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
  wantsBackofficeJsonResponse: vi.fn(),
}));

vi.mock('../../../../lib/backoffice', () => ({
  applyTMDBReviewFormAction: mocks.applyTMDBReviewFormAction,
  backofficeActionErrorResponse: mocks.backofficeActionErrorResponse,
  backofficeActionFailureResponse: mocks.backofficeActionFailureResponse,
  getBackofficeErrorStatus: mocks.getBackofficeErrorStatus,
  logBackofficeError: mocks.logBackofficeError,
  wantsBackofficeJsonResponse: mocks.wantsBackofficeJsonResponse,
}));

vi.mock('../../../../lib/sameOriginRequest', () => ({
  isSameOriginRequest: mocks.isSameOriginRequest,
}));

import { POST } from './route';

function createReviewRequest({
  accept,
  requestedWith,
}: {
  accept?: string;
  requestedWith?: string;
} = {}) {
  return createBackofficeFormRequest({
    accept,
    fields: {
      action: 'apply_candidate',
      candidate_id: '12',
    },
    requestedWith,
    url: 'https://backoffice.test/tmdb-reviews/review-1/actions',
  });
}

describe('TMDB review action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyTMDBReviewFormAction.mockResolvedValue({
      action: 'apply_candidate',
      redirectTo: '/tmdb-reviews/review-1',
      review: { id: 'review-1' },
    });
    mocks.getBackofficeErrorStatus.mockReturnValue(500);
    mocks.isSameOriginRequest.mockReturnValue(true);
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

  it('rejects cross-origin review action submissions', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createReviewRequest() as never, {
      params: Promise.resolve({ id: 'review-1' }),
    });

    expect(response.status).toBe(403);
    expect(response.headers.get('content-type')).toContain('text/plain');
    await expect(response.text()).resolves.toBe('Forbidden.');
    expect(mocks.applyTMDBReviewFormAction).not.toHaveBeenCalled();
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createReviewRequest({ accept: 'application/json' }) as never, {
      params: Promise.resolve({ id: 'review-1' }),
    });

    await expectBackofficeActionFailureJson(response, { message: 'Forbidden.', status: 403 });
    expect(mocks.applyTMDBReviewFormAction).not.toHaveBeenCalled();
  });

  it('applies the review action and redirects to the review detail page', async () => {
    const response = await POST(createReviewRequest() as never, {
      params: Promise.resolve({ id: 'review-1' }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://backoffice.test/tmdb-reviews/review-1');
    expect(mocks.applyTMDBReviewFormAction).toHaveBeenCalledWith(
      'review-1',
      expect.any(FormData),
      expect.any(Headers),
    );
  });

  it('returns the JSON applied contract for successful fetches', async () => {
    const response = await POST(createReviewRequest({ requestedWith: 'fetch' }) as never, {
      params: Promise.resolve({ id: 'review-1' }),
    });

    await expectBackofficeActionJson(response, {
      body: {
        ok: true,
        status: 'applied',
        message: 'Review action applied.',
        action: 'apply_candidate',
        reviewId: 'review-1',
        redirectTo: '/tmdb-reviews/review-1',
      },
      status: 200,
    });
    expect(mocks.applyTMDBReviewFormAction).toHaveBeenCalledWith(
      'review-1',
      expect.any(FormData),
      expect.any(Headers),
    );
  });

  it('returns the public error contract when the review action fails', async () => {
    const error = new Error('candidate missing');
    mocks.applyTMDBReviewFormAction.mockRejectedValue(error);
    mocks.getBackofficeErrorStatus.mockReturnValue(400);

    const response = await POST(createReviewRequest() as never, {
      params: Promise.resolve({ id: 'review-1' }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('text/plain');
    await expect(response.text()).resolves.toBe(
      'Review action failed. Check backoffice logs for details.',
    );
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to apply TMDB match review action',
      error,
    );
  });

  it('returns the JSON public error contract when review fetches fail', async () => {
    const error = { publicMessage: 'Candidate is no longer available.' };
    mocks.applyTMDBReviewFormAction.mockRejectedValue(error);
    mocks.getBackofficeErrorStatus.mockReturnValue(409);

    const response = await POST(createReviewRequest({ accept: 'application/json' }) as never, {
      params: Promise.resolve({ id: 'review-1' }),
    });

    await expectBackofficeActionFailureJson(response, {
      message: 'Candidate is no longer available.',
      status: 409,
    });
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to apply TMDB match review action',
      error,
    );
  });
});
