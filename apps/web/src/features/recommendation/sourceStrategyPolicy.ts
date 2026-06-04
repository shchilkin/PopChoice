import type {
  CandidateSource,
  PersonFormData,
  RecommendationExperienceMode,
  RecommendationSourceStrategy,
} from './types';

export type CandidateSourceStrategyId = RecommendationSourceStrategy;

export type RecommendationAudienceMode = 'solo' | 'duo' | 'group';

export type CandidateSourceStrategyPolicy = {
  allowExternalLookup: boolean;
  id: CandidateSourceStrategyId;
  primarySources: CandidateSource[];
  fallbackSources: CandidateSource[];
  requiresMemorySignals: boolean;
  requiresParticipantOverlap: boolean;
};

const CANDIDATE_SOURCE_STRATEGIES: Record<
  CandidateSourceStrategyId,
  CandidateSourceStrategyPolicy
> = {
  'compromise-hybrid': {
    allowExternalLookup: true,
    fallbackSources: ['tmdb-discover', 'tmdb-search', 'jit-enriched'],
    id: 'compromise-hybrid',
    primarySources: ['local-cache', 'curated'],
    requiresMemorySignals: false,
    requiresParticipantOverlap: true,
  },
  'curated-showcase': {
    allowExternalLookup: false,
    fallbackSources: [],
    id: 'curated-showcase',
    primarySources: ['curated'],
    requiresMemorySignals: false,
    requiresParticipantOverlap: false,
  },
  'hybrid-fast': {
    allowExternalLookup: true,
    fallbackSources: ['tmdb-discover', 'jit-enriched'],
    id: 'hybrid-fast',
    primarySources: ['local-cache', 'curated'],
    requiresMemorySignals: false,
    requiresParticipantOverlap: false,
  },
  'memory-aware-local': {
    allowExternalLookup: false,
    fallbackSources: ['curated'],
    id: 'memory-aware-local',
    primarySources: ['memory', 'local-cache'],
    requiresMemorySignals: true,
    requiresParticipantOverlap: false,
  },
  'tmdb-first': {
    allowExternalLookup: true,
    fallbackSources: ['local-cache', 'curated', 'jit-enriched'],
    id: 'tmdb-first',
    primarySources: ['tmdb-discover', 'tmdb-search'],
    requiresMemorySignals: false,
    requiresParticipantOverlap: false,
  },
};

function getCandidateSourceStrategyPolicy(
  strategyId: CandidateSourceStrategyId,
): CandidateSourceStrategyPolicy {
  return CANDIDATE_SOURCE_STRATEGIES[strategyId];
}

export function resolveCandidateSourceStrategy(input: {
  audience: RecommendationAudienceMode;
  experienceMode: RecommendationExperienceMode;
  hasMemorySignals?: boolean;
}): CandidateSourceStrategyPolicy {
  if (input.experienceMode === 'curated-showcase') {
    return getCandidateSourceStrategyPolicy('curated-showcase');
  }

  if (input.audience !== 'solo') {
    return getCandidateSourceStrategyPolicy('compromise-hybrid');
  }

  if (input.experienceMode === 'normal-match' || input.experienceMode === 'taste-swipe') {
    return getCandidateSourceStrategyPolicy('tmdb-first');
  }

  if (input.hasMemorySignals) {
    return getCandidateSourceStrategyPolicy('memory-aware-local');
  }

  return getCandidateSourceStrategyPolicy('hybrid-fast');
}

export function getRecommendationAudienceMode(
  people: PersonFormData[],
): RecommendationAudienceMode {
  if (people.length <= 1) return 'solo';
  if (people.length === 2) return 'duo';
  return 'group';
}

export function resolveRecommendationSourceStrategy(input: {
  experienceMode?: RecommendationExperienceMode;
  hasMemorySignals?: boolean;
  people: PersonFormData[];
}): CandidateSourceStrategyPolicy {
  return resolveCandidateSourceStrategy({
    audience: getRecommendationAudienceMode(input.people),
    experienceMode: input.experienceMode ?? 'normal-match',
    hasMemorySignals: input.hasMemorySignals,
  });
}

export function getOrderedCandidateSources(
  strategyId: CandidateSourceStrategyId,
): CandidateSource[] {
  const strategy = getCandidateSourceStrategyPolicy(strategyId);
  return [...strategy.primarySources, ...strategy.fallbackSources];
}
