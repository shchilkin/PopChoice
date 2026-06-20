import type { RecommendationEvalRunPage } from '@pop-choice/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RecommendationEvalListPage } from './list';

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
});
