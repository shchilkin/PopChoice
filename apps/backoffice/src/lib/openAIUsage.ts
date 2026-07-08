import { fetchOpenAIUsageAndCosts } from '@pop-choice/shared';

import type { OpenAIUsageAndCostSummary } from '@pop-choice/shared';

export type OpenAIUsagePeriodKey = '24h' | '7d' | '30d';

export type BackofficeOpenAIUsageState =
  | {
      period: OpenAIUsagePeriodKey;
      status: 'available';
      summary: OpenAIUsageAndCostSummary;
    }
  | {
      message: string;
      period: OpenAIUsagePeriodKey;
      status: 'not_configured' | 'unavailable';
    };

const PERIODS: Record<OpenAIUsagePeriodKey, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export function parseOpenAIUsagePeriod(value: unknown): OpenAIUsagePeriodKey {
  if (value === '24h' || value === '7d' || value === '30d') return value;
  return '7d';
}

export async function getBackofficeOpenAIUsageState(
  period: OpenAIUsagePeriodKey,
): Promise<BackofficeOpenAIUsageState> {
  const apiKey = process.env.OPENAI_ADMIN_API_KEY;
  if (!apiKey) {
    return {
      message: 'OPENAI_ADMIN_API_KEY is not configured for this backoffice environment.',
      period,
      status: 'not_configured',
    };
  }

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - PERIODS[period]);

  try {
    const summary = await fetchOpenAIUsageAndCosts({
      apiKey,
      bucketWidth: period === '24h' ? '1h' : '1d',
      endTime,
      startTime,
    });
    return {
      period,
      status: 'available',
      summary,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      period,
      status: 'unavailable',
    };
  }
}
