import { Breadcrumbs, type BreadcrumbItem } from '@pop-choice/ui';

import type { BackofficeSection } from './types';
import type { ReactNode } from 'react';

type ShellProps = {
  active: BackofficeSection;
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[] | null;
  children: ReactNode;
  compactHeader?: boolean;
  headerClassName?: string;
};

const SECTION_BREADCRUMB_LABELS: Record<BackofficeSection, string> = {
  'catalog-seed': 'Catalog seed',
  health: 'Catalog health',
  home: 'Backoffice',
  'openai-usage': 'OpenAI usage',
  queue: 'Queue',
  'recommendation-evals': 'Recommendation evals',
  'repair-batches': 'Repair batches',
  reviews: 'TMDB reviews',
};

function defaultBreadcrumbs(active: BackofficeSection): BreadcrumbItem[] {
  if (active === 'home') return [];

  return [{ href: '/', label: 'Backoffice' }, { label: SECTION_BREADCRUMB_LABELS[active] }];
}

export function BackofficeLayout({
  active,
  title,
  eyebrow,
  description,
  actions,
  breadcrumbs,
  children,
  compactHeader = false,
  headerClassName,
}: ShellProps) {
  const resolvedBreadcrumbs = breadcrumbs === undefined ? defaultBreadcrumbs(active) : breadcrumbs;
  const pageHeaderClassName = [
    compactHeader ? 'page-header compact' : 'page-header',
    headerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="PopChoice Backoffice home">
            <span className="brand-mark" aria-hidden="true">
              <img src="/popcorn.svg" alt="" />
            </span>
            <span className="brand-copy">
              <span className="brand-name">PopChoice</span>
              <span className="brand-context">Backoffice</span>
            </span>
          </a>
        </div>
      </div>
      <main>
        {resolvedBreadcrumbs?.length ? (
          <Breadcrumbs className="mb-4" items={resolvedBreadcrumbs} />
        ) : null}
        <header className={pageHeaderClassName}>
          <div>
            {eyebrow ? <p className="page-kicker">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {description ? <div className="page-description">{description}</div> : null}
          </div>
          {actions ? <div className="actions">{actions}</div> : null}
        </header>
        {children}
      </main>
    </>
  );
}

export function BackofficeLoadingPage({
  active = 'health',
  title = 'Loading backoffice',
}: {
  active?: BackofficeSection;
  title?: string;
}) {
  return (
    <BackofficeLayout
      active={active}
      title={title}
      eyebrow="Loading"
      description="Fetching the latest operator state."
    >
      <section className="panel loading-panel" aria-busy="true">
        <div className="panel-header">
          <h2>Loading</h2>
        </div>
        <p className="empty">Loading current records...</p>
      </section>
    </BackofficeLayout>
  );
}
