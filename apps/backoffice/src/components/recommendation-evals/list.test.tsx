import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { BackofficeOpenAIUsageState } from '../../lib/openAIUsage';
import { RecommendationEvalListPage } from './list';

import type { RecommendationEvalRunPage } from '@pop-choice/shared';

function runPage(overrides: Partial<RecommendationEvalRunPage> = {}): RecommendationEvalRunPage {
  return {
    limit: 25,
    offset: 0,
    runs: [],
    totalCount: 0,
    ...overrides,
  };
}

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

describe('RecommendationEvalListPage', () => {
  it('separates non-provider evals from explicit live OpenAI evals', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalListPage openAIUsage={openAIUsage()} runPage={runPage()} status={null} />,
    );

    expect(html).toContain('OpenAI usage');
    expect(html).toContain('OPENAI_ADMIN_API_KEY is not configured');
    expect(html).toContain('class="eval-safe-form"');
    expect(html).toContain('class="eval-run-panel"');
    expect(html).toContain('Seeded catalog retrieval - no OpenAI');
    expect(html).toContain('Run non-provider eval');
    expect(html).toContain('class="live-eval-form"');
    expect(html).toContain('Live OpenAI evals call the provider-backed recommendation pipeline');
    expect(html).toContain('I understand this will call OpenAI');
    expect(html).toContain('Run live OpenAI eval');
    expect(html).not.toContain('<details class="live-eval-disclosure">');
    expect(html).not.toContain('class="panel-body"');
  });

  it('renders a single empty recent-runs state without duplicate pagination or table chrome', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalListPage openAIUsage={openAIUsage()} runPage={runPage()} status={null} />,
    );

    expect(html).toContain('No recommendation eval runs have been recorded yet.');
    expect(html).not.toContain('recommendation-eval-table');
    expect(html).not.toContain('Recommendation eval run pagination');
    expect(html).not.toContain('Page 1 / 1');
  });

  it('renders aggregate OpenAI usage when admin telemetry is configured', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalListPage
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
        runPage={runPage()}
        status={null}
      />,
    );

    expect(html).toContain('$1.23');
    expect(html).toContain('completions');
    expect(html).toContain('embeddings');
    expect(html).toContain('moderations');
    expect(html).toContain('350');
  });
});
