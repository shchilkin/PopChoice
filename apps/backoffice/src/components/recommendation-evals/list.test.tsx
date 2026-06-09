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
  it('keeps the safe eval action primary and hides live eval behind a guard', () => {
    const html = renderToStaticMarkup(
      <RecommendationEvalListPage runPage={runPage()} status={null} />,
    );

    expect(html).toContain('class="eval-safe-form"');
    expect(html).toContain('class="eval-run-panel"');
    expect(html).toContain('Run safe eval');
    expect(html).toContain('<details class="live-eval-disclosure">');
    expect(html).toContain('Live provider eval');
    expect(html).toContain('Run live eval');
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
