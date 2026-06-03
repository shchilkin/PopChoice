import {
  createRecommendation,
  getRecommendationWithMovies,
  insertRecommendationMovies,
  updateRecommendationStage,
  updateRecommendationStatus,
} from '@/lib/db/recommendations';

import type {
  ApiResponse,
  RecommendationExperienceMode,
  RecommendationRequestBody,
  RecommendationSourceStrategy,
} from './types';
import type {
  MovieRowToInsert,
  RecommendationStage,
  RecommendationWithMovies,
} from '@/lib/db/recommendations';

export async function createRecommendationRecord(
  quizData: RecommendationRequestBody,
  userId?: string,
  sourceStrategy?: RecommendationSourceStrategy,
  experienceMode?: RecommendationExperienceMode,
): Promise<{ id: string; slug: string }> {
  return createRecommendation(quizData, userId, sourceStrategy, experienceMode);
}

export async function getRecommendationRecord(
  slug: string,
  viewerUserId?: string,
): Promise<RecommendationWithMovies | null> {
  return getRecommendationWithMovies(slug, viewerUserId);
}

export async function markRecommendationProcessing(recommendationId: string): Promise<void> {
  await updateRecommendationStatus(recommendationId, 'processing');
}

export async function markRecommendationStage(
  recommendationId: string,
  stage: RecommendationStage,
): Promise<void> {
  await updateRecommendationStage(recommendationId, stage);
}

export async function completeRecommendationRecord(
  recommendationId: string,
  result: ApiResponse,
): Promise<number> {
  const moviesToInsert = toMovieRows(result);

  await insertRecommendationMovies(
    recommendationId,
    moviesToInsert,
    result.usedBroaderSearch ?? false,
    result.dbMovieCount,
  );
  await updateRecommendationStatus(recommendationId, 'completed');

  return moviesToInsert.length;
}

export async function failRecommendationRecord(
  recommendationId: string,
  errorMessage: string,
): Promise<void> {
  await updateRecommendationStatus(recommendationId, 'failed', errorMessage);
}

function toMovieRows(result: ApiResponse): MovieRowToInsert[] {
  return (result.similarMovies ?? []).map((movie) => ({
    id: movie.id,
    tmdbId: movie.tmdbId ?? null,
    name: movie.name,
    year: movie.year,
    similarity: movie.similarity,
    age_rating: movie.age_rating,
    duration: movie.duration,
    score_rating: movie.score_rating,
    posterURL: movie.posterURL,
    aiDescription: movie.aiDescription,
    localizedName: movie.localizedName,
    isMainRecommendation: movie.isMainRecommendation ?? false,
    fromTMDB: movie.fromTMDB ?? false,
    source: movie.source,
  }));
}
