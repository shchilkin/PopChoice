import { listRecommendationEvalRunPage } from '@pop-choice/shared';

import { BackofficeErrorPage, RecommendationEvalListPage } from '../../components/backoffice';
import {
  ensureBackofficeReady,
  logBackofficeError,
  parseRecommendationEvalListParams,
} from '../../lib/backoffice';
import { getBackofficeOpenAIUsageState, parseOpenAIUsagePeriod } from '../../lib/openAIUsage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RecommendationEvalsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecommendationEvalsPage({
  searchParams,
}: RecommendationEvalsPageProps) {
  try {
    await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const pagination = parseRecommendationEvalListParams(params);
    const usagePeriod = parseOpenAIUsagePeriod(params.usagePeriod);
    const runPage = await listRecommendationEvalRunPage({
      limit: pagination.limit,
      offset: pagination.offset,
    });
    const openAIUsage = await getBackofficeOpenAIUsageState(usagePeriod);

    return (
      <RecommendationEvalListPage
        openAIUsage={openAIUsage}
        runPage={runPage}
        status={typeof params.eval === 'string' ? params.eval : null}
      />
    );
  } catch (error) {
    logBackofficeError('Failed to render recommendation eval history', error);
    return (
      <BackofficeErrorPage
        active="recommendation-evals"
        error={error}
        retryHref="/recommendation-evals"
      />
    );
  }
}
