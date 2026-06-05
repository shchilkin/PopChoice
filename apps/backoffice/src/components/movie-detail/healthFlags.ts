import type { CatalogMovieDetailHealthFlag } from '@pop-choice/shared';

import { REPAIRABLE_CATALOG_ISSUE_KEYS } from '../../lib/backoffice';

export function repairableHealthFlags(flags: CatalogMovieDetailHealthFlag[]) {
  return flags.filter((flag) => flag.isActive && REPAIRABLE_CATALOG_ISSUE_KEYS.has(flag.key));
}

export function splitHealthFlags(flags: CatalogMovieDetailHealthFlag[]) {
  return {
    activeFlags: flags.filter((flag) => flag.isActive),
    resolvedFlags: flags.filter((flag) => !flag.isActive),
  };
}

export function duplicatePeerCount({
  normalizedTitleYearPeers,
  tmdbIdPeers,
}: {
  normalizedTitleYearPeers: unknown[];
  tmdbIdPeers: unknown[];
}): number {
  return tmdbIdPeers.length + normalizedTitleYearPeers.length;
}
