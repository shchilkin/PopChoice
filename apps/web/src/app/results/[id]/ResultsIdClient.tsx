'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, type ReactNode } from 'react';

import { useRecommendation } from '@/hooks/useRecommendation';
import { navigateToFreshQuiz } from '@/lib/quizNavigation';

import { RecommendationResultsView } from './RecommendationResultsView';
import { ResultsErrorState } from './ResultsErrorState';
import {
  getResultsClientRenderState,
  getReadyResultsViewModel,
  getResultRouteId,
  type LoadingResultsClientRenderState,
  type ReadyResultsClientRenderState,
  type ResultsClientRenderState,
} from './resultsIdViewModel';
import { ResultsLoadingState } from './ResultsLoadingState';

export function ResultsIdClient({ params }: { params: Promise<{ id: string }> }) {
  const routeParams = use(params);
  const router = useRouter();
  const id = getResultRouteId(routeParams);

  const { data, error, isError, refetch, morePicksTimedOut } = useRecommendation(id);
  const renderState = getResultsClientRenderState({ data, error, id, isError });

  useRedirectMissingResultId(id, router);

  const renderers: Record<ResultsClientRenderState['kind'], () => ReactNode> = {
    empty: () => <ResultsErrorState variant="empty" onRetry={navigateToFreshQuiz} />,
    failed: () => <ResultsErrorState variant="failed" onRetry={navigateToFreshQuiz} />,
    loading: () => (
      <LoadingResultsState renderState={renderState as LoadingResultsClientRenderState} />
    ),
    missing: () => <ResultsErrorState variant="missing" onRetry={navigateToFreshQuiz} />,
    ready: () => (
      <ReadyResultsView
        renderState={renderState as ReadyResultsClientRenderState}
        recommendationSlug={id}
        morePicksTimedOut={morePicksTimedOut}
        onMorePicksRequested={refetch}
      />
    ),
    redirect: () => null,
  };

  return renderers[renderState.kind]();
}

function useRedirectMissingResultId(id: string, router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    if (!id) {
      router.replace('/quiz');
    }
  }, [id, router]);
}

function LoadingResultsState({ renderState }: { renderState: LoadingResultsClientRenderState }) {
  return <ResultsLoadingState status={renderState.status} stage={renderState.stage} />;
}

function ReadyResultsView({
  renderState,
  recommendationSlug,
  morePicksTimedOut,
  onMorePicksRequested,
}: {
  renderState: ReadyResultsClientRenderState;
  recommendationSlug: string;
  morePicksTimedOut: boolean;
  onMorePicksRequested: () => Promise<unknown>;
}) {
  const viewModel = getReadyResultsViewModel(renderState);

  return (
    <RecommendationResultsView
      movies={viewModel.movies}
      usedBroaderSearch={viewModel.usedBroaderSearch}
      dbMovieCount={viewModel.dbMovieCount}
      peopleCount={viewModel.peopleCount}
      hasActorSignal={viewModel.hasActorSignal}
      groupInsights={viewModel.groupInsights}
      recommendationSlug={recommendationSlug}
      resultSignals={viewModel.resultSignals}
      morePicksStatus={viewModel.morePicksStatus}
      morePicksTimedOut={morePicksTimedOut}
      viewerCanRate={viewModel.viewerCanRate}
      isSharedResult={viewModel.isSharedResult}
      onMorePicksRequested={onMorePicksRequested}
    />
  );
}
