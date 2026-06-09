import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BackofficeErrorPage, BackofficeLayout, getBackofficeRecoveryGuide } from '.';

describe('backoffice layout recovery', () => {
  it('renders section breadcrumbs from the shared UI primitive', () => {
    const html = renderToStaticMarkup(
      <BackofficeLayout
        active="health"
        title="Catalog Health"
        description="Resolve catalog data issues."
      >
        <section>Content</section>
      </BackofficeLayout>,
    );

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/"');
    expect(html).toContain('Backoffice');
    expect(html).toContain('Catalog health');
    expect(html).not.toContain('Backoffice sections');
    expect(html).not.toContain('href="/tmdb-reviews"');
  });

  it('does not render breadcrumbs on the root workspace page', () => {
    const html = renderToStaticMarkup(
      <BackofficeLayout
        active="home"
        title="Backoffice workspaces"
        description="Open an operational area."
      >
        <section>Content</section>
      </BackofficeLayout>,
    );

    expect(html).not.toContain('aria-label="Breadcrumb"');
  });

  it('points local missing database config at the deterministic fixture setup', () => {
    const guide = getBackofficeRecoveryGuide(
      new Error('Backoffice runtime config is invalid: DATABASE_URL: Required'),
      { nodeEnv: 'development' },
    );

    expect(guide.summary).toBe('DATABASE_URL is empty.');
    expect(guide.title).toBe('Wire local data');
    expect(guide.eyebrow).toBe('Local preflight');
    expect(guide.isLocalSetup).toBe(true);
    expect(guide.primaryCommand?.command).toBe('npm run setup:backoffice:fixtures');
    expect(guide.primaryCommand?.label).toBe('Create the sample stack');
    expect(guide.steps.join(' ')).toContain('npm run setup:backoffice:fixtures');
    expect(guide.steps.join(' ')).toContain('npm run dev:backoffice:fixtures');
    expect(guide.diagnostic).toContain('DATABASE_URL');
  });

  it('keeps production recovery generic', () => {
    const guide = getBackofficeRecoveryGuide(new Error('DATABASE_URL contains secret details'), {
      nodeEnv: 'production',
    });

    expect(guide.summary).toBe('Backoffice could not load this report.');
    expect(guide.title).toBe('Backoffice unavailable');
    expect(guide.isLocalSetup).toBe(false);
    expect(guide.diagnostic).toBeNull();
    expect(guide.steps.join(' ')).not.toContain('DATABASE_URL');
  });

  it('renders local setup commands on the recovery page', () => {
    const html = renderToStaticMarkup(
      <BackofficeErrorPage
        error={new Error('Backoffice runtime config is invalid: DATABASE_URL: Required')}
      />,
    );

    expect(html).toContain('Wire local data');
    expect(html).toContain('DATABASE_URL is empty.');
    expect(html).toContain('Runtime config');
    expect(html).toContain('Missing DATABASE_URL');
    expect(html).toContain('After the sample stack is running');
    expect(html).toContain('Create the sample stack');
    expect(html).toContain('npm run setup:backoffice:fixtures');
    expect(html).toContain('Use seeded local data instead');
    expect(html).toContain('npm run setup:backoffice:local-data');
    expect(html).toContain('npm run dev:backoffice');
    expect(html).toContain('Copy');
    expect(html).toContain('Technical diagnostic');
  });
});
