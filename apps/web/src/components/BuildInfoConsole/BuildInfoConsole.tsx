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

const BANNER_STYLE =
  'color:#f59e0b;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px;font-weight:400;letter-spacing:0;line-height:1.05;white-space:pre';
const BADGE_STYLE = 'background:#111;color:#fff;border-radius:6px;padding:2px 8px;font-weight:700';

async function fetchBuildInfo(): Promise<BuildInfo> {
  const response = await fetch('/api/build', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load PopChoice build info (${response.status})`);
  }

  return response.json() as Promise<BuildInfo>;
}

function logBuildSummary(build: BuildInfo) {
  // oxlint-disable-next-line no-console
  console.info(
    '%c%s%c\n%cPopChoice%c %s (%s) - run %cPopChoice.info()%c for build data',
    BANNER_STYLE,
    POPCHOICE_CONSOLE_BANNER,
    '',
    BADGE_STYLE,
    'color:#555;font-weight:600',
    build.version,
    build.commitShortSha ?? 'unknown',
    'font-weight:700',
    'font-weight:inherit',
  );
}

function logBuildDetails(build: BuildInfo) {
  // oxlint-disable-next-line no-console
  console.groupCollapsed(
    '%cPopChoice build data%c %s (%s)',
    BADGE_STYLE,
    'color:#555;font-weight:600',
    build.version,
    build.commitShortSha ?? 'unknown',
  );
  // oxlint-disable-next-line no-console
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
  // oxlint-disable-next-line no-console
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
