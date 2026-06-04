export function buildCatalogIssuePageHref({
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

export function buildRepairAuditPageHref({ page, pageSize }: { page: number; pageSize: number }) {
  const params = new URLSearchParams();
  params.set('auditPage', String(page));
  params.set('auditPageSize', String(pageSize));
  return `/?${params.toString()}#repair-audit`;
}
