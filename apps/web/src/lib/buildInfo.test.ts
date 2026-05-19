import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBuildInfo } from './buildInfo';

describe('getBuildInfo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns beta defaults without deployment metadata', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info).toMatchObject({
      app: 'PopChoice',
      version: '0.1.0-beta.0',
      channel: 'beta',
      commitSha: null,
      commitShortSha: null,
      branch: null,
      environment: 'production',
      timestamp: '2026-05-19T12:00:00.000Z',
    });
  });

  it('uses explicit app metadata and shortens commit hash', () => {
    vi.stubEnv('APP_VERSION', '0.2.0-beta.3');
    vi.stubEnv('APP_CHANNEL', 'beta');
    vi.stubEnv('APP_COMMIT_SHA', 'abcdef1234567890abcdef1234567890abcdef12');
    vi.stubEnv('APP_GIT_BRANCH', 'development');
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://pop-choice.shchilkin.dev');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info).toMatchObject({
      version: '0.2.0-beta.3',
      channel: 'beta',
      commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
      commitShortSha: 'abcdef1',
      branch: 'development',
      baseUrl: 'https://pop-choice.shchilkin.dev',
    });
  });

  it('ignores invalid commit values instead of exposing arbitrary env content', () => {
    vi.stubEnv('APP_COMMIT_SHA', 'not a real commit; token=secret');
    vi.stubEnv('SOURCE_COMMIT', '1234567');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info.commitSha).toBe('1234567');
    expect(info.commitShortSha).toBe('1234567');
  });
});
