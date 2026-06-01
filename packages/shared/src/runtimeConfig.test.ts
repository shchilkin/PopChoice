import { describe, expect, it } from 'vitest';

import { readBackofficeRuntimeConfig } from './runtimeConfig';

const baseBackofficeEnv = {
  DATABASE_URL: 'postgresql://popchoice:popchoice@localhost:5432/popchoice',
};

describe('backoffice runtime config', () => {
  it('accepts an optional Bull Board URL for queue shortcuts', () => {
    const config = readBackofficeRuntimeConfig({
      ...baseBackofficeEnv,
      BULL_BOARD_URL: 'https://bullboard.pop-choice.example',
    });

    expect(config.bullBoardUrl).toBe('https://bullboard.pop-choice.example');
  });

  it('rejects non-http Bull Board URLs', () => {
    expect(() =>
      readBackofficeRuntimeConfig({
        ...baseBackofficeEnv,
        BULL_BOARD_URL: 'ftp://bullboard.pop-choice.example',
      }),
    ).toThrow(/BULL_BOARD_URL must use one of: http:, https:/);
  });
});
