import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OpenAIUsagePage } from './index';

import type { BackofficeOpenAIUsageState } from '../../lib/openAIUsage';

function openAIUsage(
  overrides: Partial<BackofficeOpenAIUsageState> = {},
): BackofficeOpenAIUsageState {
  return {
    message: 'OPENAI_ADMIN_API_KEY is not configured for this backoffice environment.',
    period: '7d',
    status: 'not_configured',
    ...overrides,
  } as BackofficeOpenAIUsageState;
}

describe('OpenAIUsagePage', () => {
  it('renders the missing-admin-key state on the dedicated usage page', () => {
    const html = renderToStaticMarkup(<OpenAIUsagePage openAIUsage={openAIUsage()} />);

    expect(html).toContain('OpenAI Usage');
    expect(html).toContain('Provider spend');
    expect(html).toContain('OPENAI_ADMIN_API_KEY is not configured');
    expect(html).toContain('href="/recommendation-evals"');
    expect(html).toContain('href="/openai-usage?usagePeriod=24h"');
    expect(html).toContain('href="/openai-usage?usagePeriod=7d"');
    expect(html).toContain('href="/openai-usage?usagePeriod=30d"');
  });

  it('renders aggregate OpenAI usage when admin telemetry is configured', () => {
    const html = renderToStaticMarkup(
      <OpenAIUsagePage
        openAIUsage={openAIUsage({
          status: 'available',
          summary: {
            costs: {
              groups: [],
              total: { currency: 'usd', value: 1.2345 },
            },
            period: {
              bucketWidth: '1d',
              endTime: '2026-06-20T10:00:00.000Z',
              startTime: '2026-06-13T10:00:00.000Z',
            },
            usage: {
              byCategory: {
                completions: {
                  cachedInputTokens: 3,
                  inputTokens: 100,
                  outputTokens: 20,
                  requests: 4,
                },
                embeddings: {
                  cachedInputTokens: 0,
                  inputTokens: 200,
                  outputTokens: 0,
                  requests: 2,
                },
                images: { cachedInputTokens: 0, inputTokens: 0, outputTokens: 0, requests: 0 },
                moderations: {
                  cachedInputTokens: 0,
                  inputTokens: 50,
                  outputTokens: 0,
                  requests: 1,
                },
                web_search_calls: {
                  cachedInputTokens: 0,
                  inputTokens: 0,
                  outputTokens: 0,
                  requests: 0,
                },
              },
              groups: [],
              total: {
                cachedInputTokens: 3,
                inputTokens: 350,
                outputTokens: 20,
                requests: 7,
              },
            },
          },
        })}
      />,
    );

    expect(html).toContain('$1.23');
    expect(html).toContain('completions');
    expect(html).toContain('embeddings');
    expect(html).toContain('moderations');
    expect(html).toContain('350');
  });
});
