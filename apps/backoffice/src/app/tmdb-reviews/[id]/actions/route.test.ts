import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyTMDBReviewFormAction: vi.fn(),
  getBackofficeErrorStatus: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
}));

vi.mock('../../../../lib/backoffice', () => ({
  applyTMDBReviewFormAction: mocks.applyTMDBReviewFormAction,
  getBackofficeErrorStatus: mocks.getBackofficeErrorStatus,
  logBackofficeError: mocks.logBackofficeError,
}));

vi.mock('../../../../lib/sameOriginRequest', () => ({
  isSameOriginRequest: mocks.isSameOriginRequest,
}));

import { POST } from './route';

function createReviewRequest() {
  const formData = new FormData();
  formData.set('action', 'apply_candidate');
  formData.set('candidate_id', '12');

  return new Request('https://backoffice.test/tmdb-reviews/review-1/actions', {
    body: formData,
    method: 'POST',
  });
}

describe('TMDB review action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBackofficeErrorStatus.mockReturnValue(500);
    mocks.isSameOriginRequest.mockReturnValue(true);
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
});
