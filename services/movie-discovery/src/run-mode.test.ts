import { describe, expect, it } from 'vitest';

import { shouldRunOneShot } from './run-mode.js';

describe('shouldRunOneShot', () => {
  it('returns true when the --once flag is present', () => {
    expect(shouldRunOneShot(['node', 'dist/index.js', '--once'], '0 0 * * 0')).toBe(true);
  });

  it('returns true when the schedule is intentionally empty', () => {
    expect(shouldRunOneShot(['node', 'dist/index.js'], '')).toBe(true);
  });

  it('returns false when a schedule is configured and no --once flag is present', () => {
    expect(shouldRunOneShot(['node', 'dist/index.js'], '0 0 * * 0')).toBe(false);
  });
});
