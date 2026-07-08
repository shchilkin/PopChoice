import { BackofficeErrorPage, OpenAIUsagePage } from '../../components/backoffice';
import { ensureBackofficeReady, logBackofficeError } from '../../lib/backoffice';
import { getBackofficeOpenAIUsageState, parseOpenAIUsagePeriod } from '../../lib/openAIUsage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OpenAIUsageRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpenAIUsageRoute({ searchParams }: OpenAIUsageRouteProps) {
  try {
    await ensureBackofficeReady();
    const params = (await searchParams) ?? {};
    const usagePeriod = parseOpenAIUsagePeriod(params.usagePeriod);
    const openAIUsage = await getBackofficeOpenAIUsageState(usagePeriod);

    return <OpenAIUsagePage openAIUsage={openAIUsage} />;
  } catch (error) {
    logBackofficeError('Failed to render OpenAI usage', error);
    return <BackofficeErrorPage active="openai-usage" error={error} retryHref="/openai-usage" />;
  }
}
