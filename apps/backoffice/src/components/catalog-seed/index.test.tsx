import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CatalogSeedPage } from './index';

describe('CatalogSeedPage', () => {
  it('renders a compact ready-state seed console', () => {
    const html = renderToStaticMarkup(
      <CatalogSeedPage
        seedStatus={{
          queueConfigured: true,
          queueName: 'movie-seed',
        }}
      />,
    );

    expect(html).toContain('catalog-seed-console healthy');
    expect(html).toContain('Configured');
    expect(html).toContain('Ready');
    expect(html).toContain('movie-seed');
    expect(html).toContain('seed-movies');
    expect(html).toContain('Trigger movie seed');
    expect(html).not.toContain('Configuration required');
  });

  it('renders a clear unavailable state when Redis is missing', () => {
    const html = renderToStaticMarkup(
      <CatalogSeedPage
        seedStatus={{
          queueConfigured: false,
          queueName: 'movie-seed',
        }}
      />,
    );

    expect(html).toContain('catalog-seed-console warning');
    expect(html).toContain('Missing');
    expect(html).toContain('Needs Redis');
    expect(html).toContain('Configuration required');
    expect(html).toContain('disabled=""');
  });
});
