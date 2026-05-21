import packageJson from '../../package.json';

const DEFAULT_CHANNEL = 'beta';

export type BuildInfo = {
  app: string;
  version: string;
  channel: string;
  commitSha: string | null;
  commitShortSha: string | null;
  branch: string | null;
  environment: string;
  resourceUuid: string | null;
  baseUrl: string | null;
  timestamp: string;
};

function firstNonEmpty(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

function normalizeCommitSha(value: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  return /^[a-f0-9]{7,40}$/i.test(trimmed) ? trimmed : null;
}

function firstValidCommitSha(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const commitSha = normalizeCommitSha(value ?? null);
    if (commitSha) return commitSha;
  }

  return null;
}

function normalizeVersion(value: string | null): string {
  if (value) return value;

  return packageJson.version;
}

export function getBuildInfo(now = new Date()): BuildInfo {
  const commitSha = firstValidCommitSha(
    process.env.APP_COMMIT_SHA,
    process.env.BUILD_APP_COMMIT_SHA,
    process.env.SOURCE_COMMIT,
    process.env.BUILD_SOURCE_COMMIT,
    process.env.GITHUB_SHA,
    process.env.BUILD_GITHUB_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.BUILD_VERCEL_GIT_COMMIT_SHA,
  );

  return {
    app: 'PopChoice',
    version: normalizeVersion(firstNonEmpty(process.env.APP_VERSION)),
    channel: firstNonEmpty(process.env.APP_CHANNEL) ?? DEFAULT_CHANNEL,
    commitSha,
    commitShortSha: commitSha ? commitSha.slice(0, 7) : null,
    branch: firstNonEmpty(
      process.env.APP_GIT_BRANCH,
      process.env.BUILD_APP_GIT_BRANCH,
      process.env.SOURCE_BRANCH,
      process.env.BUILD_SOURCE_BRANCH,
      process.env.COOLIFY_BRANCH,
      process.env.BUILD_COOLIFY_BRANCH,
      process.env.GITHUB_REF_NAME,
      process.env.VERCEL_GIT_COMMIT_REF,
      process.env.BUILD_VERCEL_GIT_COMMIT_REF,
    ),
    environment: process.env.NODE_ENV ?? 'development',
    resourceUuid: firstNonEmpty(
      process.env.COOLIFY_RESOURCE_UUID,
      process.env.BUILD_COOLIFY_RESOURCE_UUID,
    ),
    baseUrl: firstNonEmpty(process.env.NEXT_PUBLIC_BASE_URL),
    timestamp: now.toISOString(),
  };
}
