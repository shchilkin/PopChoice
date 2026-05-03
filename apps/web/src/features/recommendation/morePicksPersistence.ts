import {
  claimMorePicksSlot,
  getRecommendationQuizData,
  getRecommendationTMDBExcludeIds,
  insertMorePicksMovies,
  updateMorePicksStatus,
} from '@/lib/db/recommendations';

import type { MovieRowToInsert } from '@/lib/db/recommendations';

export async function claimMorePicksRequest(
  slug: string,
): Promise<{ recommendationId: string; quizData: unknown } | null> {
  return claimMorePicksSlot(slug);
}

export async function loadRecommendationQuizData(
  recommendationId: string,
): Promise<unknown | undefined> {
  return getRecommendationQuizData(recommendationId);
}

export async function getMorePicksExcludeIds(recommendationId: string): Promise<number[]> {
  return getRecommendationTMDBExcludeIds(recommendationId);
}

export async function markMorePicksStatus(
  recommendationId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
): Promise<void> {
  await updateMorePicksStatus(recommendationId, status, error);
}

export async function storeMorePicks(
  recommendationId: string,
  movies: MovieRowToInsert[],
): Promise<void> {
  await insertMorePicksMovies(recommendationId, movies);
}
