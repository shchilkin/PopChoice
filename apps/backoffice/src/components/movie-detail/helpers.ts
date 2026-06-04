import type { CatalogMovieDetailHealthFlag } from '@pop-choice/shared';

import { catalogRepairMessage, REPAIRABLE_CATALOG_ISSUE_KEYS } from '../../lib/backoffice';

type CatalogRepairFlashStatus = Parameters<typeof catalogRepairMessage>[0];

export function normalizeRepairFlashStatus(
  repairStatus: string | null,
): CatalogRepairFlashStatus | null {
  if (!repairStatus) return null;

  if (repairStatus === 'bulk-queued') return 'queued';
  if (repairStatus === 'bulk-orchestration-queued') return 'orchestration_queued';
  if (repairStatus === 'bulk-partial') return 'partial';

  if (
    repairStatus === 'queued' ||
    repairStatus === 'deduped' ||
    repairStatus === 'unavailable' ||
    repairStatus === 'failed' ||
    repairStatus === 'empty' ||
    repairStatus === 'partial' ||
    repairStatus === 'orchestration_queued'
  ) {
    return repairStatus;
  }

  return null;
}

export function repairFlashMessage(repairStatus: string | null): string | null {
  const mappedStatus = normalizeRepairFlashStatus(repairStatus);
  return mappedStatus ? catalogRepairMessage(mappedStatus) : null;
}

export function repairFlashTone(repairStatus: string | null): 'accepted' | 'warn' {
  const mappedStatus = normalizeRepairFlashStatus(repairStatus);
  return mappedStatus === 'queued' ||
    mappedStatus === 'deduped' ||
    mappedStatus === 'orchestration_queued'
    ? 'accepted'
    : 'warn';
}

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
