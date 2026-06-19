import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBackofficeFormRequest,
  expectBackofficeActionFailureJson,
  expectBackofficeActionJson,
} from '../../../test/backofficeActionRoute';

const mocks = vi.hoisted(() => ({
  ensureBackofficeReady: vi.fn(),
  getBackofficeErrorStatus: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
  performCatalogSeedAction: vi.fn(),
}));

vi.mock('../../../lib/backoffice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/backoffice')>();
  return {
    ...actual,
    ensureBackofficeReady: mocks.ensureBackofficeReady,
    getBackofficeErrorStatus: mocks.getBackofficeErrorStatus,
    logBackofficeError: mocks.logBackofficeError,
    performCatalogSeedAction: mocks.performCatalogSeedAction,
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

function createSeedActionRequest({
  fetch = true,
  fields = { action: 'trigger_movie_seed' },
  url = 'https://backoffice.test/catalog-seed/actions',
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

describe('catalog seed form action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureBackofficeReady.mockResolvedValue(undefined);
    mocks.getBackofficeErrorStatus.mockReturnValue(500);
    mocks.isSameOriginRequest.mockReturnValue(true);
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createSeedActionRequest() as never);

    await expectBackofficeActionFailureJson(response, { message: 'Forbidden.', status: 403 });
    expect(mocks.performCatalogSeedAction).not.toHaveBeenCalled();
  });

  it('returns the JSON trigger contract for fetch requests', async () => {
    mocks.performCatalogSeedAction.mockResolvedValue({
      message: 'Movie seed queued.',
      status: 'triggered',
    });

    const response = await POST(createSeedActionRequest() as never);

    await expectBackofficeActionJson(response, {
      body: {
        message: 'Movie seed queued.',
        ok: true,
        status: 'triggered',
      },
      status: 202,
    });
    expect(mocks.performCatalogSeedAction).toHaveBeenCalledWith({
      formData: expect.any(FormData),
      headers: expect.any(Headers),
    });
  });

  it('does not redirect browser form posts to a bind address', async () => {
    mocks.performCatalogSeedAction.mockResolvedValue({
      message: 'Movie seed queued.',
      status: 'triggered',
    });

    const response = await POST(
      createSeedActionRequest({
        fetch: false,
        url: 'http://0.0.0.0:3000/catalog-seed/actions',
      }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/catalog-seed?seed=triggered',
    );
  });

  it('keeps forbidden browser redirects off bind addresses', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(
      createSeedActionRequest({
        fetch: false,
        url: 'http://0.0.0.0:3000/catalog-seed/actions',
      }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/catalog-seed?seed=forbidden',
    );
    expect(mocks.performCatalogSeedAction).not.toHaveBeenCalled();
  });

  it('keeps failed browser redirects off bind addresses', async () => {
    const error = new Error('boom');
    mocks.getBackofficeErrorStatus.mockReturnValue(503);
    mocks.performCatalogSeedAction.mockRejectedValue(error);

    const response = await POST(
      createSeedActionRequest({
        fetch: false,
        url: 'http://0.0.0.0:3000/catalog-seed/actions',
      }) as never,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/catalog-seed?seed=failed&code=503',
    );
    expect(mocks.logBackofficeError).toHaveBeenCalledWith(
      'Failed to apply catalog seed action',
      error,
    );
  });
});
