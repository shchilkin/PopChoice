import type { CandidateSourceStrategyId } from '../sourceStrategyPolicy';
import type {
  ApiResponse,
  CandidateSource,
  CandidateSourceDistribution,
  PersonFormData,
} from '../types';
import type { Locale } from '@/lib/locale';

export type RecommendationEvalMemoryKind = 'watched' | 'liked' | 'not_interested' | 'wrong_mood';

export type RecommendationEvalMemory = {
  kind: RecommendationEvalMemoryKind;
  movieName: string;
  movieYear?: number;
};

export type RecommendationEvalCandidate = {
  name: string;
  year: number;
};

export type RecommendationEvalAudience = 'solo' | 'family' | 'group';

export type RecommendationEvalDepth = 'focused' | 'memory-aware' | 'compromise';

export type RecommendationEvalSourceStrategy = Extract<
  CandidateSourceStrategyId,
  'curated-showcase' | 'hybrid-fast' | 'tmdb-first'
>;

export type RecommendationEvalExpectations = {
  allowedMainTitles: string[];
  forbiddenTitles?: string[];
  forbiddenTerms?: string[];
  minCandidateSources?: Partial<Record<CandidateSource, number>>;
  minDescriptionCharacters?: number;
  minMetadataCompleteCandidates?: number;
  minPassingScore?: number;
  minSimilarMovies?: number;
  requiredExplanationTerms?: string[];
  tasteControl?: RecommendationEvalTasteControlExpectations;
};

export type RecommendationEvalTasteControlExpectations = {
  discoveryAppetite?: 'balanced' | 'safe' | 'surprising';
  feedbackMemoryKinds?: RecommendationEvalMemoryKind[];
  hardAvoidTerms?: string[];
  maxRuntimeMinutes?: number;
  optionalReferenceMovie?: boolean;
};

export type RecommendationEvalFixture = {
  audience: RecommendationEvalAudience;
  candidates: RecommendationEvalCandidate[];
  description: string;
  depth: RecommendationEvalDepth;
  expectations: RecommendationEvalExpectations;
  id: string;
  locale: Locale;
  mockResponse: ApiResponse;
  name: string;
  people: PersonFormData[];
  sourceStrategy: RecommendationEvalSourceStrategy;
  userMemories: RecommendationEvalMemory[];
};

export type RecommendationEvalCheck = {
  details: string;
  id: string;
  label: string;
  maxScore: number;
  passed: boolean;
  score: number;
};

export type RecommendationEvalResult = {
  checks: RecommendationEvalCheck[];
  fixtureId: string;
  fixtureName: string;
  maxScore: number;
  minPassingScore: number;
  mode: RecommendationEvalRunMode;
  passed: boolean;
  response: ApiResponse;
  score: number;
  sourceDistribution: CandidateSourceDistribution;
};

export type RecommendationEvalRunMode = 'mock' | 'real-data' | 'live';

export type RecommendationEvalReport = {
  generatedAt: string;
  maxScore: number;
  minPassingScore: number;
  mode: RecommendationEvalRunMode;
  passed: boolean;
  results: RecommendationEvalResult[];
  sourceDistribution: CandidateSourceDistribution;
  summary: {
    failed: number;
    fixtureCount: number;
    passed: number;
  };
};
