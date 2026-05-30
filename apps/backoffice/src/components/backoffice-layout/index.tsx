import type { ReactNode } from 'react';

export type BackofficeSection = 'health' | 'repair-batches' | 'reviews';

type ShellProps = {
  active: BackofficeSection;
  title: string;
  eyebrow: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function BackofficeLayout({
  active,
  title,
  eyebrow,
  description,
  actions,
  children,
}: ShellProps) {
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
          <span className="operator-badge">Operator console</span>
        </div>
      </div>
      <main>
        <header className="page-header">
          <div>
            <p className="page-kicker">{eyebrow}</p>
            <h1>{title}</h1>
            {description ? <div className="page-description">{description}</div> : null}
          </div>
          {actions ? <div className="actions">{actions}</div> : null}
        </header>
        <nav className="section-nav" aria-label="Backoffice sections">
          <a className={active === 'health' ? 'active' : ''} href="/">
            Catalog health
          </a>
          <a className={active === 'reviews' ? 'active' : ''} href="/tmdb-reviews">
            TMDB reviews
          </a>
          <a className={active === 'repair-batches' ? 'active' : ''} href="/repair-batches">
            Repair batches
          </a>
        </nav>
        {children}
      </main>
    </>
  );
}

export const BackofficeShell = BackofficeLayout;

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

export function BackofficeErrorPage({
  active = 'health',
  error: _error,
  retryHref = '/',
}: {
  active?: BackofficeSection;
  error: unknown;
  retryHref?: string;
}) {
  return (
    <BackofficeLayout
      active={active}
      title="Backoffice unavailable"
      eyebrow="Operator error"
      description="The backoffice service is running, but the requested report could not be loaded."
      actions={
        <a className="button" href={retryHref}>
          Retry
        </a>
      }
    >
      <section className="panel error-panel">
        <div className="panel-header">
          <h2>Recovery</h2>
        </div>
        <p>
          An internal backoffice error occurred. Retry the request, then check service logs if the
          problem continues.
        </p>
      </section>
    </BackofficeLayout>
  );
}
