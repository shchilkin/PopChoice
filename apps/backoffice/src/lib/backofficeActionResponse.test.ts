import { describe, expect, it } from 'vitest';

import {
  backofficeActionErrorResponse,
  backofficeActionFailureResponse,
  getBackofficePublicErrorMessage,
  wantsBackofficeJsonResponse,
} from './backofficeActionResponse';
import { backofficeActionError, getBackofficeErrorStatus } from './backofficeRuntime';

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://backoffice.test/actions', { headers });
}

describe('backoffice action response helpers', () => {
  it('detects JSON action requests by accept header or fetch marker', () => {
    expect(wantsBackofficeJsonResponse(request())).toBe(false);
    expect(wantsBackofficeJsonResponse(request({ accept: 'application/json' }))).toBe(true);
    expect(wantsBackofficeJsonResponse(request({ 'x-requested-with': 'fetch' }))).toBe(true);
    expect(wantsBackofficeJsonResponse(request({ 'x-requested-with': 'FETCH' }))).toBe(true);
  });

  it('builds the shared failure JSON contract', async () => {
    const response = backofficeActionFailureResponse('Forbidden.', 403);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: 'failed',
      message: 'Forbidden.',
    });
  });

  it('uses public messages only when exposed by action errors', () => {
    expect(
      getBackofficePublicErrorMessage({ publicMessage: 'Movie not found.' }, 'Fallback.'),
    ).toBe('Movie not found.');
    expect(getBackofficePublicErrorMessage(new Error('private detail'), 'Fallback.')).toBe(
      'Fallback.',
    );
  });

  it('maps action error statuses into the failure JSON contract', async () => {
    const error = backofficeActionError('Candidate is unavailable.', 409);

    const response = backofficeActionErrorResponse(error, 'Fallback.');

    expect(getBackofficeErrorStatus(error)).toBe(409);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: 'failed',
      message: 'Candidate is unavailable.',
    });
  });

  it('keeps unexpected error details out of the failure JSON contract', async () => {
    const response = backofficeActionErrorResponse(
      new Error('database password leaked'),
      'Fallback.',
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      status: 'failed',
      message: 'Fallback.',
    });
  });
});
