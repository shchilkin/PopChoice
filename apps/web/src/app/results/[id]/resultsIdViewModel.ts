import { RecommendationFetchError } from '@/hooks/useRecommendation';

import type {
  RecommendationStage,
  RecommendationStatus,
  RecommendationWithMovies,
} from '@/lib/db/recommendations';
import type { MovieRecommendation } from '@/utils/client';

export type ResultsClientRenderState =
  | { kind: 'redirect' }
  | { kind: 'missing' }
  | { kind: 'failed' }
  | { kind: 'empty' }
  | {
      kind: 'loading';
      status: RecommendationStatus | undefined;
      stage: RecommendationStage | undefined;
    }
  | { kind: 'ready'; data: RecommendationWithMovies; movies: MovieRecommendation[] };

export type ReadyResultsClientRenderState = Extract<ResultsClientRenderState, { kind: 'ready' }>;
export type LoadingResultsClientRenderState = Extract<
  ResultsClientRenderState,
  { kind: 'loading' }
>;

export function getResultRouteId(routeParams: { id?: unknown }): string {
  return typeof routeParams.id === 'string' ? routeParams.id : '';
}

export function getReadyResultsViewModel(renderState: ReadyResultsClientRenderState) {
  return {
    dbMovieCount: renderState.data.dbMovieCount,
    hasActorSignal: renderState.data.hasActorSignal === true,
    isSharedResult: renderState.data.isSharedResult === true,
    groupInsights: renderState.data.groupInsights ?? null,
    morePicksStatus: renderState.data.morePicksStatus,
    movies: renderState.movies,
    peopleCount: renderState.data.peopleCount ?? 1,
    usedBroaderSearch: renderState.data.usedBroaderSearch === true,
    viewerCanRate: renderState.data.viewerCanRate === true,
  };
}

export function getResultsClientRenderState({
  data,
  error,
  id,
  isError,
}: {
  data: RecommendationWithMovies | null | undefined;
  error: unknown;
  id: string;
  isError: boolean;
}): ResultsClientRenderState {
  if (!id) return { kind: 'redirect' };
  if (isError) return getFetchErrorState(error);
  if (data?.status === 'failed') return { kind: 'failed' };

  const movies = mapRecommendationMovies(data);
  if (isLoadingRecommendation(data)) {
    return { kind: 'loading', status: data?.status, stage: getRecommendationStage(data) };
  }

  return movies.length > 0 && data ? { kind: 'ready', data, movies } : { kind: 'empty' };
}

export function mapRecommendationMovies(
  data: RecommendationWithMovies | null | undefined,
): MovieRecommendation[] {
  if (data?.status !== 'completed' || !data.movies) return [];

  return data.movies.map((movie) => ({
    id: movie.id,
    name: movie.name,
    year: movie.year,
    similarity: movie.similarity ?? 0,
    age_rating: movie.age_rating,
    duration: movie.duration,
    score_rating: movie.score_rating,
    posterURL: movie.posterURL,
    description: movie.aiDescription,
    localizedName: movie.localizedName,
    isMainRecommendation: movie.isMainRecommendation,
    fromTMDB: movie.fromTMDB,
  }));
}

function getFetchErrorState(error: unknown): ResultsClientRenderState {
  return error instanceof RecommendationFetchError && error.status === 404
    ? { kind: 'missing' }
    : { kind: 'failed' };
}

function getRecommendationStage(
  data: RecommendationWithMovies | null | undefined,
): RecommendationStage | undefined {
  return data?.stage;
}

function isLoadingRecommendation(data: RecommendationWithMovies | null | undefined): boolean {
  return !data || data.status === 'pending' || data.status === 'processing';
}
