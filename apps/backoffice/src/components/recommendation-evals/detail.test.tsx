import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RecommendationEvalDetailPage } from './detail';

import type { RecommendationEvalRunDetail } from '@pop-choice/shared';

function detail(overrides: Partial<RecommendationEvalRunDetail> = {}): RecommendationEvalRunDetail {
  return {
    results: [],
    run: {
      actor: 'lexi',
      appVersion: '0.2.0',
      completedAt: '2026-06-19T20:00:00.000Z',
      createdAt: '2026-06-19T19:59:00.000Z',
      errorMessage: null,
      gitSha: 'abc1234',
      id: '1dc6873b-d650-490a-a2da-65969eef3224',
      jobId: 'recommendation-eval-1dc6873b',
      jobName: 'run-recommendation-eval',
      mode: 'real-data',
      queueName: 'recommendation-evals',
      queuedAt: '2026-06-19T19:59:02.000Z',
      report: { mode: 'real-data', passed: false },
      requestedOptions: { trigger: 'backoffice' },
      source: 'backoffice',
      startedAt: '2026-06-19T19:59:03.000Z',
      status: 'completed',
      summary: { failed: 1, fixtureCount: 1, passed: 0 },
      updatedAt: '2026-06-19T20:00:00.000Z',
    },
    ...overrides,
  };
}

describe('RecommendationEvalDetailPage', () => {
  it('renders copy controls for requested options and report JSON', () => {
    const html = renderToStaticMarkup(<RecommendationEvalDetailPage detail={detail()} />);

    expect(html).toContain('Copy JSON');
    expect(html).toContain('aria-label="Copy JSON"');
    expect(html).toContain('&quot;trigger&quot;: &quot;backoffice&quot;');
    expect(html).toContain('&quot;passed&quot;: false');
  });

  it('surfaces failed required zero-score checks next to 100 point fixture scores', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalDetailPage
        detail={detail({
          results: [
            {
              checks: [
                {
                  details: 'Response matches the ApiResponse schema.',
                  id: 'output-shape',
                  label: 'Output shape',
                  maxScore: 20,
                  passed: true,
                  score: 20,
                },
                {
                  details: 'Catalog search did not retrieve expected main title.',
                  id: 'catalog-search-retrieval',
                  label: 'Catalog search retrieval',
                  maxScore: 0,
                  passed: false,
                  score: 0,
                },
              ],
              createdAt: '2026-06-19T20:00:00.000Z',
              errorMessage: null,
              fixtureId: 'solo-focused-curated-showcase',
              fixtureName: 'solo / focused / curated-showcase',
              fixtureSnapshot: {},
              id: '1',
              maxScore: 100,
              minPassingScore: 90,
              passed: false,
              response: {},
              result: {},
              runId: '1dc6873b-d650-490a-a2da-65969eef3224',
              score: 100,
              status: 'failed',
            },
          ],
        })}
      />,
    );

    expect(html).toContain('1 required zero-score check failed');
    expect(html).toContain('These checks do not change the numeric score');
    expect(html).toContain('100/100');
    expect(html).toContain('Catalog search retrieval');
    expect(html).toContain('Catalog search did not retrieve expected main title.');
  });
});
