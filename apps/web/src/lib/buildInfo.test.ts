import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBuildInfo } from './buildInfo';

const buildMetadataEnvKeys = [
  'APP_VERSION',
  'APP_CHANNEL',
  'APP_COMMIT_SHA',
  'BUILD_APP_COMMIT_SHA',
  'SOURCE_COMMIT',
  'BUILD_SOURCE_COMMIT',
  'GITHUB_SHA',
  'BUILD_GITHUB_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'BUILD_VERCEL_GIT_COMMIT_SHA',
  'APP_PR_NUMBER',
  'BUILD_APP_PR_NUMBER',
  'APP_IMAGE_REPOSITORY',
  'BUILD_APP_IMAGE_REPOSITORY',
  'APP_IMAGE_TAG',
  'BUILD_APP_IMAGE_TAG',
  'APP_IMAGE_DIGEST',
  'BUILD_APP_IMAGE_DIGEST',
  'DEPLOYMENT_ENVIRONMENT',
  'APP_ENVIRONMENT',
  'APP_GIT_BRANCH',
  'BUILD_APP_GIT_BRANCH',
  'SOURCE_BRANCH',
  'BUILD_SOURCE_BRANCH',
  'COOLIFY_BRANCH',
  'BUILD_COOLIFY_BRANCH',
  'GITHUB_REF_NAME',
  'VERCEL_GIT_COMMIT_REF',
  'BUILD_VERCEL_GIT_COMMIT_REF',
  'COOLIFY_RESOURCE_UUID',
  'BUILD_COOLIFY_RESOURCE_UUID',
  'NEXT_PUBLIC_BASE_URL',
] as const;

function clearBuildMetadataEnv() {
  for (const key of buildMetadataEnvKeys) {
    vi.stubEnv(key, '');
  }
}

describe('getBuildInfo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns release defaults without deployment metadata', () => {
    clearBuildMetadataEnv();
    vi.stubEnv('NODE_ENV', 'production');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info).toMatchObject({
      app: 'PopChoice',
      version: '0.2.0',
      channel: 'development',
      commitSha: null,
      commitShortSha: null,
      branch: null,
      sourceCommitSha: null,
      sourceBranch: null,
      pullRequestNumber: null,
      imageRepository: null,
      imageTag: null,
      imageDigest: null,
      environment: 'production',
      timestamp: '2026-05-19T12:00:00.000Z',
    });
  });

  it('uses explicit app metadata and shortens commit hash', () => {
    clearBuildMetadataEnv();
    vi.stubEnv('APP_VERSION', '0.2.0-beta.3');
    vi.stubEnv('APP_CHANNEL', 'beta');
    vi.stubEnv('APP_COMMIT_SHA', 'abcdef1234567890abcdef1234567890abcdef12');
    vi.stubEnv('APP_GIT_BRANCH', 'development');
    vi.stubEnv('SOURCE_COMMIT', '1234567890abcdef1234567890abcdef12345678');
    vi.stubEnv('SOURCE_BRANCH', 'feature/prebuilt-images');
    vi.stubEnv('APP_PR_NUMBER', '42');
    vi.stubEnv('APP_IMAGE_REPOSITORY', 'ghcr.io/shchilkin/popchoice/web');
    vi.stubEnv('APP_IMAGE_TAG', 'sha-abcdef123456');
    vi.stubEnv('DEPLOYMENT_ENVIRONMENT', 'production');
    vi.stubEnv(
      'APP_IMAGE_DIGEST',
      'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    );
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://pop-choice.shchilkin.dev');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info).toMatchObject({
      version: '0.2.0-beta.3',
      channel: 'beta',
      commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
      commitShortSha: 'abcdef1',
      branch: 'development',
      sourceCommitSha: '1234567890abcdef1234567890abcdef12345678',
      sourceBranch: 'feature/prebuilt-images',
      pullRequestNumber: '42',
      imageRepository: 'ghcr.io/shchilkin/popchoice/web',
      imageTag: 'sha-abcdef123456',
      imageDigest: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      environment: 'production',
      baseUrl: 'https://pop-choice.shchilkin.dev',
    });
  });

  it('uses APP_ENVIRONMENT as a legacy deployment environment fallback', () => {
    clearBuildMetadataEnv();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ENVIRONMENT', 'development');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info.environment).toBe('development');
  });

  it('ignores invalid commit values instead of exposing arbitrary env content', () => {
    clearBuildMetadataEnv();
    vi.stubEnv('APP_COMMIT_SHA', 'not a real commit; token=secret');
    vi.stubEnv('SOURCE_COMMIT', '1234567');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info.commitSha).toBe('1234567');
    expect(info.commitShortSha).toBe('1234567');
  });

  it('uses Dockerfile-baked build metadata when runtime metadata is blank', () => {
    clearBuildMetadataEnv();
    vi.stubEnv('APP_COMMIT_SHA', '');
    vi.stubEnv('SOURCE_COMMIT', '');
    vi.stubEnv('COOLIFY_BRANCH', '');
    vi.stubEnv('COOLIFY_RESOURCE_UUID', '');
    vi.stubEnv('BUILD_SOURCE_COMMIT', 'fedcba9876543210fedcba9876543210fedcba98');
    vi.stubEnv('BUILD_COOLIFY_BRANCH', 'development');
    vi.stubEnv('BUILD_COOLIFY_RESOURCE_UUID', 'ze0vvy05sc6qitaz0bjoikoj');
    vi.stubEnv('BUILD_APP_PR_NUMBER', '7');
    vi.stubEnv('BUILD_APP_IMAGE_REPOSITORY', 'ghcr.io/shchilkin/popchoice/web');
    vi.stubEnv('BUILD_APP_IMAGE_TAG', 'pr-7');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info).toMatchObject({
      commitSha: 'fedcba9876543210fedcba9876543210fedcba98',
      commitShortSha: 'fedcba9',
      branch: 'development',
      resourceUuid: 'ze0vvy05sc6qitaz0bjoikoj',
      sourceCommitSha: 'fedcba9876543210fedcba9876543210fedcba98',
      pullRequestNumber: '7',
      imageRepository: 'ghcr.io/shchilkin/popchoice/web',
      imageTag: 'pr-7',
    });
  });

  it('ignores malformed PR numbers and image digests', () => {
    clearBuildMetadataEnv();
    vi.stubEnv('APP_PR_NUMBER', '42; secret');
    vi.stubEnv('APP_IMAGE_DIGEST', 'sha256:not-a-digest');

    const info = getBuildInfo(new Date('2026-05-19T12:00:00.000Z'));

    expect(info.pullRequestNumber).toBeNull();
    expect(info.imageDigest).toBeNull();
  });
});
