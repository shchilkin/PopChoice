import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RecommendationEvalListPage } from './list';

import type { RecommendationEvalRun, RecommendationEvalRunPage } from '@pop-choice/shared';

function evalRun(overrides: Partial<RecommendationEvalRun> = {}): RecommendationEvalRun {
  return {
    actor: 'lexi',
    appVersion: '0.2.0',
    completedAt: '2026-06-19T20:00:00.000Z',
    createdAt: '2026-06-19T19:59:00.000Z',
    errorMessage: null,
    gitSha: 'abc1234',
    id: '1dc6873b-d650-490a-a2da-65969eef3224',
    jobId: 'recommendation-eval-1dc6873b',
    jobName: 'run-recommendation-eval',
    mode: 'live',
    queueName: 'recommendation-evals',
    queuedAt: '2026-06-19T19:59:02.000Z',
    report: {
      mode: 'live',
      providerUsage: {
        admin: {
          attribution: 'interval',
          status: 'available',
          summary: {
            costs: {
              total: { currency: 'usd', value: 0.42 },
            },
          },
        },
        observed: {
          total: {
            cachedInputTokens: 5,
            inputTokens: 1234,
            outputTokens: 567,
            requests: 8,
          },
        },
        provider: 'openai',
      },
    },
    requestedOptions: { trigger: 'backoffice' },
    source: 'backoffice',
    startedAt: '2026-06-19T19:59:03.000Z',
    status: 'completed',
    summary: { failed: 0, fixtureCount: 1, passed: 1 },
    updatedAt: '2026-06-19T20:00:00.000Z',
    ...overrides,
  };
}

function runPage(overrides: Partial<RecommendationEvalRunPage> = {}): RecommendationEvalRunPage {
  return {
    limit: 25,
    offset: 0,
    runs: [],
    totalCount: 0,
    ...overrides,
  };
}

describe('RecommendationEvalListPage', () => {
  it('separates non-provider evals from explicit live OpenAI evals', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalListPage runPage={runPage()} status={null} />,
    );

    expect(html).toContain('href="/openai-usage"');
    expect(html).not.toContain('OPENAI_ADMIN_API_KEY is not configured');
    expect(html).not.toContain('Admin usage and cost telemetry');
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
      <RecommendationEvalListPage runPage={runPage()} status={null} />,
    );

    expect(html).toContain('No recommendation eval runs have been recorded yet.');
    expect(html).not.toContain('recommendation-eval-table');
    expect(html).not.toContain('Recommendation eval run pagination');
    expect(html).not.toContain('Page 1 / 1');
  });

  it('keeps aggregate OpenAI usage out of eval history', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalListPage
        runPage={runPage({
          runs: [evalRun()],
          totalCount: 1,
        })}
        status={null}
      />,
    );

    expect(html).toContain('OpenAI cost');
    expect(html).toContain('OpenAI usage');
    expect(html).toContain('$0.42');
    expect(html).toContain('8 req, 1,234 in / 567 out');
    expect(html).not.toContain('Total cost');
    expect(html).not.toContain('Cached input');
  });
});
