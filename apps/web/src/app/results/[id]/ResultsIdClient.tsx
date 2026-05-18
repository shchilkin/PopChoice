'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo } from 'react';

import { RecommendationFetchError, useRecommendation } from '@/hooks/useRecommendation';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';
import { type MovieRecommendation } from '@/utils/client';

import { RecommendationResultsView } from './RecommendationResultsView';
import { ResultsErrorState } from './ResultsErrorState';
import { ResultsLoadingState } from './ResultsLoadingState';

export function ResultsIdClient({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = use(params);
  const router = useRouter();
  const id = typeof routeParams.id === 'string' ? routeParams.id : '';

  const { data, error, isError, refetch, morePicksTimedOut } = useRecommendation(id);

  // Derive movies from the completed poll response — no secondary fetch needed because
  // poster URLs are fetched during the BullMQ job and stored in recommendation_movies.
  const movies = useMemo<MovieRecommendation[]>(() => {
    if (data?.status !== 'completed' || !data.movies) return [];
    return data.movies.map((m) => ({
      id: m.id,
      name: m.name,
      year: m.year,
      similarity: m.similarity ?? 0,
      age_rating: m.age_rating,
      duration: m.duration,
      score_rating: m.score_rating,
      posterURL: m.posterURL,
      description: m.aiDescription,
      localizedName: m.localizedName,
      isMainRecommendation: m.isMainRecommendation,
      fromTMDB: m.fromTMDB,
    }));
  }, [data]);

  const peopleCount = data?.peopleCount ?? 1;
  const groupInsights = data?.groupInsights ?? null;

  useEffect(() => {
    if (!id) {
      router.replace('/quiz');
    }
  }, [id, router]);

  const status = data?.status;
  const stage = data?.stage;

  if (!id) return null;

  if (isError) {
    const variant =
      error instanceof RecommendationFetchError && error.status === 404 ? 'missing' : 'failed';
    return <ResultsErrorState variant={variant} onRetry={navigateToFreshQuiz} />;
  }

  if (status === 'failed') {
    return <ResultsErrorState variant="failed" onRetry={navigateToFreshQuiz} />;
  }

  if (!data || status === 'pending' || status === 'processing') {
    return <ResultsLoadingState status={status} stage={stage} />;
  }

  if (movies.length === 0) {
    return <ResultsErrorState variant="empty" onRetry={navigateToFreshQuiz} />;
  }

  return (
    <RecommendationResultsView
      movies={movies}
      usedBroaderSearch={data.usedBroaderSearch ?? false}
      dbMovieCount={data.dbMovieCount}
      peopleCount={peopleCount}
      hasActorSignal={data.hasActorSignal ?? false}
      groupInsights={groupInsights}
      recommendationSlug={id}
      morePicksStatus={data.morePicksStatus}
      morePicksTimedOut={morePicksTimedOut}
      viewerCanRate={data.viewerCanRate ?? false}
      isSharedResult={data.isSharedResult ?? false}
      onMorePicksRequested={refetch}
    />
  );
}
