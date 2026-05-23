import type { ApiResponse, PersonFormData } from '../types';
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

export type RecommendationEvalExpectations = {
  allowedMainTitles: string[];
  forbiddenTitles?: string[];
  forbiddenTerms?: string[];
  minDescriptionCharacters?: number;
  minPassingScore?: number;
  minSimilarMovies?: number;
  requiredExplanationTerms?: string[];
};

export type RecommendationEvalFixture = {
  candidates: RecommendationEvalCandidate[];
  description: string;
  expectations: RecommendationEvalExpectations;
  id: string;
  locale: Locale;
  mockResponse: ApiResponse;
  name: string;
  people: PersonFormData[];
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
  score: number;
};

export type RecommendationEvalRunMode = 'mock' | 'live';

export type RecommendationEvalReport = {
  generatedAt: string;
  maxScore: number;
  minPassingScore: number;
  mode: RecommendationEvalRunMode;
  passed: boolean;
  results: RecommendationEvalResult[];
  summary: {
    failed: number;
    fixtureCount: number;
    passed: number;
  };
};
