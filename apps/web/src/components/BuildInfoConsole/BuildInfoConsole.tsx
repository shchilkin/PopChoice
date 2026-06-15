'use client';

import { useEffect } from 'react';

import type { BuildInfo } from '@/lib/buildInfo';

type PopChoiceConsole = {
  version: string;
  commit: string;
  build: BuildInfo;
  info: () => Promise<BuildInfo>;
};

declare global {
  interface Window {
    PopChoice?: PopChoiceConsole;
  }
}

const POPCHOICE_CONSOLE_BANNER = String.raw`
   ____             ____ _           _
  |  _ \ ___  _ __ / ___| |__   ___ (_) ___ ___
  | |_) / _ \| '_ \ |   | '_ \ / _ \| |/ __/ _ \
  |  __/ (_) | |_) | |___| | | | (_) | | (_|  __/
  |_|   \___/| .__/ \____|_| |_|\___/|_|\___\___|
             |_|
`;

async function fetchBuildInfo(): Promise<BuildInfo> {
  const response = await fetch('/api/build', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load PopChoice build info (${response.status})`);
  }

  return response.json() as Promise<BuildInfo>;
}

function logBuildSummary(build: BuildInfo) {
  // eslint-disable-next-line no-console
  console.info(
    '%c[PopChoice]%c %s (%s) - run %cPopChoice.info()%c for build data',
    'color:#2563eb;font-weight:700',
    'color:inherit',
    build.version,
    build.commitShortSha ?? 'unknown',
    'font-weight:700',
    'font-weight:inherit',
  );
}

function logBuildDetails(build: BuildInfo) {
  // eslint-disable-next-line no-console
  console.groupCollapsed(
    '%c%s%c %c%s%c %s (%s)',
    'color:#f59e0b;font-weight:700;line-height:1',
    POPCHOICE_CONSOLE_BANNER,
    '',
    'background:#111;color:#fff;border-radius:6px;padding:2px 8px;font-weight:700',
    'PopChoice',
    'color:#555;font-weight:600',
    build.version,
    build.commitShortSha ?? 'unknown',
  );
  // eslint-disable-next-line no-console
  console.table({
    version: build.version,
    channel: build.channel,
    environment: build.environment,
    branch: build.branch,
    commit: build.commitSha,
    imageRepository: build.imageRepository,
    imageTag: build.imageTag,
    imageDigest: build.imageDigest,
    baseUrl: build.baseUrl,
    timestamp: build.timestamp,
  });
  // eslint-disable-next-line no-console
  console.groupEnd();
}

function installConsoleHelper(build: BuildInfo): PopChoiceConsole {
  const helper: PopChoiceConsole = {
    version: build.version,
    commit: build.commitShortSha ?? 'unknown',
    build,
    info: async () => {
      const latest = await fetchBuildInfo();
      const updated = installConsoleHelper(latest);
      logBuildDetails(updated.build);
      return updated.build;
    },
  };

  window.PopChoice = helper;
  return helper;
}

export function BuildInfoConsole() {
  useEffect(() => {
    let mounted = true;

    fetchBuildInfo()
      .then((build) => {
        if (!mounted) return;

        const helper = installConsoleHelper(build);
        logBuildSummary(helper.build);
      })
      .catch(() => {
        // Keep app boot quiet if the diagnostics endpoint is temporarily unavailable.
      });

    return () => {
      mounted = false;
    };
  }, []);

  return null;
}
