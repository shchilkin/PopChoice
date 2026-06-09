import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBackofficeFormRequest,
  expectBackofficeActionFailureJson,
  expectBackofficeActionJson,
} from '../../../../test/backofficeActionRoute';

const mocks = vi.hoisted(() => ({
  applyCatalogMovieManualFormAction: vi.fn(),
  isSameOriginRequest: vi.fn(),
  logBackofficeError: vi.fn(),
}));

vi.mock('../../../../lib/backoffice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/backoffice')>();
  return {
    ...actual,
    applyCatalogMovieManualFormAction: mocks.applyCatalogMovieManualFormAction,
    logBackofficeError: mocks.logBackofficeError,
  };
});

vi.mock('../../../../lib/sameOriginRequest', () => ({
  isSameOriginRequest: mocks.isSameOriginRequest,
}));

import { POST } from './route';

function createManualRequest(fields: Record<string, string> = {}) {
  return createBackofficeFormRequest({
    fetch: true,
    fields: {
      return_to: '/movies/42',
      tmdb_id: '475557',
      ...fields,
    },
    url: 'https://backoffice.test/movies/42/actions',
  });
}

describe('catalog movie manual action route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOriginRequest.mockReturnValue(true);
  });

  it('returns the JSON forbidden contract for cross-origin fetches', async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);

    const response = await POST(createManualRequest() as never, {
      params: Promise.resolve({ id: '42' }),
    });

    await expectBackofficeActionFailureJson(response, { message: 'Forbidden.', status: 403 });
    expect(mocks.applyCatalogMovieManualFormAction).not.toHaveBeenCalled();
  });

  it('returns the JSON update contract for manual movie field updates', async () => {
    mocks.applyCatalogMovieManualFormAction.mockResolvedValue({
      audit: { id: '7' },
      movie: { id: '42' },
      redirectTo: '/movies/42',
      updatedFields: ['tmdbId'],
    });

    const response = await POST(createManualRequest() as never, {
      params: Promise.resolve({ id: '42' }),
    });

    await expectBackofficeActionJson(response, {
      body: {
        auditId: '7',
        movieId: '42',
        redirectTo: '/movies/42',
        status: 'updated',
        updatedFields: ['tmdbId'],
      },
      status: 200,
    });
    expect(mocks.applyCatalogMovieManualFormAction).toHaveBeenCalledWith(
      '42',
      expect.any(FormData),
      expect.any(Headers),
    );
  });

  it('maps manual update errors to the JSON failure contract', async () => {
    const error = new Error('duplicate') as Error & { publicMessage: string; statusCode: number };
    error.publicMessage = 'TMDB id is already assigned.';
    error.statusCode = 409;
    mocks.applyCatalogMovieManualFormAction.mockRejectedValue(error);

    const response = await POST(createManualRequest() as never, {
      params: Promise.resolve({ id: '42' }),
    });

    await expectBackofficeActionFailureJson(response, {
      message: 'TMDB id is already assigned.',
      status: 409,
    });
  });
});
