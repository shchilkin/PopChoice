import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BackofficeHomePage } from './index';

describe('BackofficeHomePage', () => {
  it('keeps root as a neutral workspace picker', () => {
    const html = renderToStaticMarkup(<BackofficeHomePage />);

    expect(html).toContain('Backoffice workspaces');
    expect(html).toContain('Open an operational area.');
    expect(html).toContain('href="/catalog-health"');
    expect(html).toContain('href="/tmdb-reviews"');
    expect(html).toContain('href="/queue"');
    expect(html).toContain('href="/repair-batches"');
    expect(html).toContain('href="/recommendation-evals"');
    expect(html).toContain('Catalog operations');
    expect(html).toContain('Quality');
    expect(html).toContain('Catalog health');
    expect(html).toContain('Data quality and repair work');
    expect(html).not.toContain('Recommended start');
    expect(html).not.toContain('Workspace');
    expect(html).not.toContain('Action');
    expect(html).not.toContain('Open</span>');
  });
});
