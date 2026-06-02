export function BooleanDataPill({ value }: { value: boolean }) {
  return <span className={`data-pill ${value ? 'good' : 'warn'}`}>{value ? 'yes' : 'no'}</span>;
}

export function OptionalCatalogValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') {
    return <span className="data-pill neutral">-</span>;
  }

  return <>{value}</>;
}

export function CountPill({
  count,
  state,
}: {
  count: number;
  state?: 'healthy' | 'warning' | 'repairable';
}) {
  return <span className={state ? `count ${state}` : 'count'}>{count}</span>;
}

function buildCatalogIssuePageHref({
  issueKey,
  page,
  pageSize,
}: {
  issueKey: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set('issue', issueKey);
  params.set('issuePage', String(page));
  params.set('issuePageSize', String(pageSize));
  return `/?${params.toString()}#issue-${encodeURIComponent(issueKey)}`;
}

function buildRepairAuditPageHref({ page, pageSize }: { page: number; pageSize: number }) {
  const params = new URLSearchParams();
  params.set('auditPage', String(page));
  params.set('auditPageSize', String(pageSize));
  return `/?${params.toString()}#repair-audit`;
}

export function SimplePaginationControls({
  ariaLabel,
  emptyLabel,
  itemLabel,
  limit,
  offset,
  totalCount,
  hrefForPage,
}: {
  ariaLabel: string;
  emptyLabel: string;
  itemLabel: string;
  limit: number;
  offset: number;
  totalCount: number;
  hrefForPage: (page: number) => string;
}) {
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  const currentPage = Math.floor(offset / limit) + 1;
  const firstItem =
    totalCount === 0 || currentPage > totalPages ? 0 : (currentPage - 1) * limit + 1;
  const lastItem = currentPage > totalPages ? 0 : Math.min(currentPage * limit, totalCount);

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <span className="pagination-summary">
        {totalCount === 0
          ? emptyLabel
          : currentPage > totalPages
            ? `Page ${currentPage} is past ${totalCount} ${itemLabel}`
            : `Showing ${firstItem}-${lastItem} of ${totalCount} ${itemLabel}`}
      </span>
      <div className="pagination-actions">
        {currentPage > 1 ? (
          <a className="button small" href={hrefForPage(currentPage - 1)}>
            Previous
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Previous
          </span>
        )}
        <span className="pagination-page">
          Page {currentPage} / {totalPages}
        </span>
        {currentPage < totalPages ? (
          <a className="button small" href={hrefForPage(currentPage + 1)}>
            Next
          </a>
        ) : (
          <span className="button small disabled" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}

export function CatalogStat({
  label,
  value,
  meta,
  state = 'neutral',
}: {
  label: string;
  value: string | number;
  meta: string;
  state?: 'healthy' | 'warning' | 'neutral';
}) {
  return (
    <div className={`stat ${state}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
      </div>
      <span className="stat-value">{value}</span>
      <div className="stat-meta">{meta}</div>
    </div>
  );
}

export function moviePosterSrc(posterUrl: string | null): string | null {
  if (!posterUrl) return null;
  if (posterUrl.startsWith('http://') || posterUrl.startsWith('https://')) return posterUrl;
  if (posterUrl.startsWith('/')) return `https://image.tmdb.org/t/p/w342${posterUrl}`;
  return posterUrl;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

export function formatTMDBMetadataValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? '-' : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '-';
}

export function renderMetadataSnapshot(metadata: Record<string, unknown>) {
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    return <p className="empty">No TMDB metadata snapshot has been stored for this movie.</p>;
  }

  return (
    <JsonDetails label="Raw metadata" value={metadata} className="metadata-json-details" open />
  );
}

export function JsonDetails({
  className,
  label,
  open = false,
  value,
}: {
  className?: string;
  label: string;
  open?: boolean;
  value: unknown;
}) {
  return (
    <details className={className ? `json-details ${className}` : 'json-details'} open={open}>
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${Math.round(value * 100)}%`;
}

export function confidenceWidth(value: number | null): string {
  if (value === null) return '0%';
  return `${Math.min(Math.max(Math.round(value * 100), 0), 100)}%`;
}
