import type { CandidateSource, CandidateSourceDistribution } from './types';

type SourceCandidate = {
  fromTMDB?: boolean;
  id?: number;
  source?: CandidateSource;
  tmdbMatchSource?: string | null;
};

export function getLocalCandidateSource(tmdbMatchSource?: string | null): CandidateSource {
  return tmdbMatchSource ? 'local-cache' : 'curated';
}

export function getCandidateSource(candidate: SourceCandidate): CandidateSource {
  if (candidate.source) return candidate.source;
  if (candidate.fromTMDB || (typeof candidate.id === 'number' && candidate.id < 0)) {
    return 'tmdb-discover';
  }
  return getLocalCandidateSource(candidate.tmdbMatchSource);
}

export function summarizeCandidateSources(
  candidates: SourceCandidate[] | undefined,
): CandidateSourceDistribution {
  const distribution: NonNullable<CandidateSourceDistribution> = {};

  for (const candidate of candidates ?? []) {
    const source = getCandidateSource(candidate);
    distribution[source] = (distribution[source] ?? 0) + 1;
  }

  return distribution;
}
