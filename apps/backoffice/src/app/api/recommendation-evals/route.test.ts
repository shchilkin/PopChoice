import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ensureBackofficeReady: vi.fn(),
  isSameOriginRequest: vi.fn(),
  listRecommendationEvalRunPage: vi.fn(),
  logBackofficeError: vi.fn(),
  parseRecommendationEvalListParams: vi.fn(),
  performRecommendationEvalAction: vi.fn(),
}));

vi.mock('@pop-choice/shared', () => ({
  listRecommendationEvalRunPage: mocks.listRecommendationEvalRunPage,
}));

vi.mock('../../../lib/backoffice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/backoffice')>();
  return {
    ...actual,
    ensureBackofficeReady: mocks.ensureBackofficeReady,
    logBackofficeError: mocks.logBackofficeError,
    parseRecommendationEvalListParams: mocks.parseRecommendationEvalListParams,
    performRecommendationEvalAction: mocks.performRecommendationEvalAction,
  };
});

vi.mock('../../../lib/sameOriginRequest', () => ({
  isSameOriginRequest: mocks.isSameOriginRequest,
}));

import { GET, POST } from './route';

function createJsonRequest(body: unknown = {}) {
  return new Request('https://backoffice.test/api/recommendation-evals', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-csrf-token': 'token' },
    method: 'POST',
  });
}

describe('recommendation eval API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureBackofficeReady.mockResolvedValue({ redisUrl: 'redis://example.test' });
    mocks.isSameOriginRequest.mockReturnValue(true);
    mocks.parseRecommendationEvalListParams.mockReturnValue({ limit: 25, offset: 0 });
  });

  it('returns a no-store eval run page JSON response', async () => {
    const runPage = { limit: 25, offset: 0, runs: [], totalCount: 0 };
    mocks.listRecommendationEvalRunPage.mockResolvedValue(runPage);

    const response = await GET(new Request('https://backoffice.test/api/recommendation-evals'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(runPage);
    expect(mocks.listRecommendationEvalRunPage).toHaveBeenCalledWith({ limit: 25, offset: 0 });
  });

  it('rejects cross-origin action requests', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createJsonRequest({ mode: 'mock' }) as never);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: 'Forbidden.',
      ok: false,
      status: 'failed',
    });
    expect(mocks.performRecommendationEvalAction).not.toHaveBeenCalled();
  });

  it('maps JSON bodies into the shared eval action response contract', async () => {
    mocks.performRecommendationEvalAction.mockResolvedValue({
      jobId: 'job-1',
      mode: 'live',
      runId: 'run-1',
      status: 'queued',
    });

    const response = await POST(
      createJsonRequest({
        acknowledgeLiveCost: true,
        liveConfirmation: 'RUN LIVE RECOMMENDATION EVAL',
        mode: 'live',
      }) as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      jobId: 'job-1',
      mode: 'live',
      ok: true,
      runId: 'run-1',
      status: 'queued',
    });

    const formData = mocks.performRecommendationEvalAction.mock.calls[0]?.[0] as FormData;
    expect(formData.get('mode')).toBe('live');
    expect(formData.get('acknowledge_live_cost')).toBe('yes');
    expect(formData.get('live_confirmation')).toBe('RUN LIVE RECOMMENDATION EVAL');
  });

  it('returns unavailable action results with a 503 JSON contract', async () => {
    mocks.performRecommendationEvalAction.mockResolvedValue({
      errorMessage: 'queue unavailable',
      mode: 'mock',
      runId: 'run-2',
      status: 'unavailable',
    });

    const response = await POST(createJsonRequest({ mode: 'mock' }) as never);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      errorMessage: 'queue unavailable',
      ok: false,
      status: 'unavailable',
    });
  });
});
