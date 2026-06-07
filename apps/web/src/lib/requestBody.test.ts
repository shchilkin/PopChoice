import { describe, expect, it } from 'vitest';

import { requestValidationErrorResponse } from './requestBody';

describe('request body helpers', () => {
  it('formats validation issues for invalid request data responses', async () => {
    const response = requestValidationErrorResponse([
      { path: ['people', 0, 'tonePreference'], message: 'Required' },
    ]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      details: 'people.0.tonePreference: Required',
      error: 'Invalid request data',
    });
  });
});
