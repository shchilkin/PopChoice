import { getRecommendationEvalRunDetail } from '@pop-choice/shared';

import {
  BackofficeErrorPage,
  RecommendationEvalDetailPage,
  RecommendationEvalNotFoundPage,
} from '../../../components/backoffice';
import { ensureBackofficeReady, logBackofficeError } from '../../../lib/backoffice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RecommendationEvalDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function RecommendationEvalDetail({ params }: RecommendationEvalDetailProps) {
  const { id } = await params;

  try {
    await ensureBackofficeReady();
    const detail = await getRecommendationEvalRunDetail(id);

    if (!detail) {
      return <RecommendationEvalNotFoundPage runId={id} />;
    }

    return <RecommendationEvalDetailPage detail={detail} />;
  } catch (error) {
    logBackofficeError('Failed to render recommendation eval detail', error);
    return (
      <BackofficeErrorPage
        active="recommendation-evals"
        error={error}
        retryHref={`/recommendation-evals/${encodeURIComponent(id)}`}
      />
    );
  }
}
