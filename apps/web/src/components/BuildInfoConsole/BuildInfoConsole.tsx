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

async function fetchBuildInfo(): Promise<BuildInfo> {
  const response = await fetch('/api/build', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load PopChoice build info (${response.status})`);
  }

  return response.json() as Promise<BuildInfo>;
}

function installConsoleHelper(build: BuildInfo): PopChoiceConsole {
  const helper: PopChoiceConsole = {
    version: build.version,
    commit: build.commitShortSha ?? 'unknown',
    build,
    info: async () => {
      const latest = await fetchBuildInfo();
      const updated = installConsoleHelper(latest);
      // eslint-disable-next-line no-console
      console.info('[PopChoice] build info', updated.build);
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
        // eslint-disable-next-line no-console
        console.info(
          `[PopChoice] ${helper.version} (${helper.commit}) - run PopChoice.info() for build data`,
        );
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
