import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  applyTMDBMatchReviewAction,
  ensureCatalogRepairActionSchema,
  ensureTMDBMatchReviewActionSchema,
  getCatalogRepairMovieSnapshot,
  getCatalogHealthReport,
  getTMDBMatchReview,
  initDatabase,
  isTMDBMatchReviewReason,
  isTMDBMatchReviewSort,
  isTMDBMatchReviewStatus,
  logger,
  listCatalogRepairAudit,
  listTMDBMatchReviewAudit,
  listTMDBMatchReviews,
  operatorAuthChallenge,
  recordCatalogRepairAction,
  readBackofficeRuntimeConfig,
  verifyOperatorBasicAuthHeader,
} from '@pop-choice/shared';
import type {
  CatalogRepairActionAudit,
  CatalogHealthIssue,
  CatalogHealthReport,
  CatalogMovieSample,
  DuplicateIdentityGroup,
  OperatorAuthConfig,
  TMDBMatchReview,
  TMDBMatchReviewAction,
  TMDBMatchReviewActionAudit,
  TMDBMatchReviewReason,
  TMDBMatchReviewSort,
  TMDBMatchReviewStatus,
  TMDBReviewCandidate,
} from '@pop-choice/shared';

import {
  enqueueCatalogBackfillMovieFromBackoffice,
  type CatalogBackfillReason,
} from './catalogMaintenanceQueue.js';

const DEFAULT_REPAIR_AUDIT_LIMIT = 25;

const REPAIRABLE_CATALOG_ISSUE_KEYS = new Set([
  'missing_poster_url',
  'missing_localized_name',
  'missing_tmdb_id',
  'missing_runtime',
  'missing_age_rating',
  'missing_tmdb_matched_at',
  'stale_tmdb_metadata',
  'missing_cast_metadata',
  'missing_director_metadata',
  'missing_genre_metadata',
  'missing_keyword_metadata',
]);

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-';

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value: string | number | null | undefined): string {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function parseOperatorActor(request: Request): string {
  const header = request.headers.authorization;
  if (!header?.startsWith('Basic ')) return 'anonymous-operator';

  try {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    return username.trim() || 'anonymous-operator';
  } catch {
    return 'anonymous-operator';
  }
}

function parseTMDBReviewStatus(value: unknown): TMDBMatchReviewStatus | 'all' {
  if (value === 'all') return 'all';
  return typeof value === 'string' && isTMDBMatchReviewStatus(value) ? value : 'open';
}

function parseTMDBReviewReason(value: unknown): TMDBMatchReviewReason | 'all' {
  if (value === 'all') return 'all';
  return typeof value === 'string' && isTMDBMatchReviewReason(value) ? value : 'all';
}

function parseTMDBReviewSort(value: unknown): TMDBMatchReviewSort {
  return typeof value === 'string' && isTMDBMatchReviewSort(value) ? value : 'highest_risk';
}

function parseAction(value: unknown): TMDBMatchReviewAction {
  if (
    value === 'apply_candidate' ||
    value === 'reject' ||
    value === 'defer' ||
    value === 'reopen'
  ) {
    return value;
  }

  throw new Error(`Unsupported review action "${String(value)}".`);
}

function parseMovieId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Movie id is required.');
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('Movie id must be numeric.');
  }

  return trimmed;
}

function parseCatalogIssueKey(value: unknown): string {
  if (typeof value !== 'string' || !REPAIRABLE_CATALOG_ISSUE_KEYS.has(value)) {
    throw new Error('Unsupported catalog-health repair issue.');
  }

  return value;
}

function getBackfillReasonForIssue(issueKey: string): CatalogBackfillReason {
  if (issueKey === 'missing_tmdb_id') return 'missing_tmdb_id';
  if (issueKey === 'stale_tmdb_metadata') return 'manual_refresh';
  return 'missing_metadata';
}

type BackofficeSection = 'health' | 'reviews';

type BackofficeShellOptions = {
  active: BackofficeSection;
  title: string;
  eyebrow: string;
  descriptionHtml?: string;
  actions?: string;
  autoRefreshSeconds?: number;
  body: string;
};

function renderNav(active: BackofficeSection): string {
  return `
    <nav class="section-nav" aria-label="Backoffice sections">
      <a class="${active === 'health' ? 'active' : ''}" href="/">Catalog health</a>
      <a class="${active === 'reviews' ? 'active' : ''}" href="/tmdb-reviews">TMDB reviews</a>
    </nav>
  `;
}

function renderBackofficeStyles(): string {
  return `
    :root {
      color-scheme: dark;
      --bg: #0d0e10;
      --bg-radial: radial-gradient(circle at top left, rgba(245, 197, 66, 0.14), transparent 30rem);
      --surface: #15181d;
      --surface-2: #1d2229;
      --surface-3: #252b35;
      --border: #323944;
      --border-strong: #454f5f;
      --text: #f4f6f8;
      --muted: #aab2bf;
      --subtle: #7e8794;
      --good: #40c463;
      --warn: #f5c542;
      --bad: #ff5f56;
      --accent: #7cc7ff;
      --focus: #f5c542;
      --brand: #f5c542;
      --brand-soft: rgba(245, 197, 66, 0.16);
      --shadow: 0 18px 60px rgba(0, 0, 0, 0.24);
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      min-height: 100vh;
      margin: 0;
      background: var(--bg-radial), var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    a { color: var(--accent); }
    a:hover { color: var(--text); }
    a:focus-visible,
    button:focus-visible,
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    h1, h2, h3, p { letter-spacing: 0; }
    h1 { margin: 0; font-size: clamp(28px, 4vw, 42px); line-height: 1.06; }
    h2 { margin: 0; font-size: 16px; }
    h3 { margin: 0 0 8px; font-size: 15px; }
    main { max-width: 1440px; margin: 0 auto; padding: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 700; background: #12151a; }
    tr:last-child td { border-bottom: 0; }
    select,
    input {
      min-width: 180px;
      color: var(--text);
      background: #111419;
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 8px 10px;
    }
    label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; font-weight: 700; }
    dt { color: var(--muted); font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .topbar {
      border-bottom: 1px solid var(--border);
      background: rgba(13, 14, 16, 0.86);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .topbar-inner {
      max-width: 1440px;
      margin: 0 auto;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: var(--text);
      text-decoration: none;
      min-width: 0;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--brand), #ff8f3d);
      color: #141006;
      font-weight: 900;
      box-shadow: 0 10px 30px rgba(245, 197, 66, 0.2);
    }
    .brand-copy { display: grid; gap: 1px; min-width: 0; }
    .brand-name { font-size: 16px; font-weight: 800; line-height: 1.1; }
    .brand-context { color: var(--muted); font-size: 12px; font-weight: 700; }
    .operator-badge {
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      background: var(--surface);
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 18px;
    }
    .page-kicker {
      margin: 0 0 8px;
      color: var(--brand);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .page-description { margin-top: 8px; color: var(--muted); max-width: 820px; }
    .muted { color: var(--muted); }
    .small-note { color: var(--subtle); font-size: 12px; }
    .section-nav,
    .actions,
    .decision-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .section-nav { margin: 0 0 18px; }
    .section-nav a,
    .button {
      color: var(--text);
      text-decoration: none;
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 7px 10px;
      background: var(--surface-2);
      font-weight: 800;
    }
    .section-nav a {
      color: var(--muted);
      background: #12151a;
    }
    .section-nav a.active {
      color: var(--text);
      border-color: color-mix(in srgb, var(--brand), var(--border) 35%);
      background: var(--brand-soft);
    }
    .button { cursor: pointer; }
    .button:hover { border-color: var(--border-strong); background: var(--surface-3); }
    .button.primary { border-color: color-mix(in srgb, var(--accent), var(--border) 35%); }
    .button.danger { border-color: color-mix(in srgb, var(--bad), var(--border) 35%); }
    .button.small { padding: 5px 8px; font-size: 12px; }
    .button:disabled,
    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat,
    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }
    .stat { padding: 14px 16px; }
    .stat-label { display: block; color: var(--muted); font-size: 13px; font-weight: 700; }
    .stat-value { display: block; font-size: 30px; font-weight: 850; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .panel { overflow: hidden; margin-bottom: 14px; }
    .panel.needs-work { border-color: color-mix(in srgb, var(--warn), var(--border) 55%); }
    .panel.healthy { border-color: color-mix(in srgb, var(--good), var(--border) 68%); }
    .panel-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
    }
    .count {
      min-width: 48px;
      text-align: center;
      border-radius: 999px;
      padding: 3px 10px;
      background: var(--surface-3);
      font-weight: 850;
    }
    .empty { margin: 0; padding: 14px; color: var(--muted); }
    .notice {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 18px;
      background: var(--surface);
      font-weight: 700;
    }
    .notice.good { border-color: color-mix(in srgb, var(--good), var(--border) 45%); }
    .notice.warn { border-color: color-mix(in srgb, var(--warn), var(--border) 45%); }
    .filters {
      display: flex;
      gap: 12px;
      align-items: end;
      flex-wrap: wrap;
      margin-bottom: 18px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: rgba(21, 24, 29, 0.72);
    }
    .pill,
    .status {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 8px;
      background: var(--surface-3);
      font-size: 12px;
      font-weight: 800;
    }
    .status.open { color: var(--warn); }
    .status.resolved { color: var(--good); }
    .status.ignored { color: var(--bad); }
    .status.deferred { color: var(--accent); }
    .duplicate-group { padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .duplicate-group:last-child { border-bottom: 0; }
    .duplicate-heading {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--accent);
    }
    .duplicate-group ul {
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 4px;
    }
    .duplicate-group li {
      display: grid;
      grid-template-columns: 80px minmax(180px, 1fr) 120px;
      gap: 10px;
      color: var(--muted);
    }
    .repair-form { margin: 0; }
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
      gap: 14px;
    }
    .facts,
    .candidate dl {
      margin: 0;
      padding: 14px;
      display: grid;
      gap: 8px;
    }
    .facts div,
    .candidate dl div {
      display: grid;
      grid-template-columns: 130px minmax(0, 1fr);
      gap: 12px;
    }
    .copy { padding: 14px; }
    .candidates { display: grid; gap: 12px; padding: 14px; }
    .candidate {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(240px, 360px);
      gap: 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      background: rgba(17, 20, 25, 0.7);
    }
    .action-form { display: grid; gap: 8px; align-content: start; }
    .error-panel pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 0;
      padding: 14px;
      color: var(--text);
      background: #101318;
    }
    @media (max-width: 900px) {
      main { padding: 18px; }
      .topbar-inner { padding: 12px 18px; align-items: flex-start; }
      .page-header,
      .candidate {
        flex-direction: column;
        align-items: stretch;
        display: flex;
      }
      .summary { grid-template-columns: 1fr 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; white-space: nowrap; }
      .duplicate-group li,
      .facts div,
      .candidate dl div {
        grid-template-columns: 1fr;
        gap: 2px;
      }
    }
    @media (max-width: 560px) {
      .summary { grid-template-columns: 1fr; }
      .topbar-inner,
      .filters,
      .section-nav,
      .actions,
      .decision-actions {
        align-items: stretch;
        flex-direction: column;
      }
      .operator-badge { width: fit-content; }
    }
  `;
}

function renderBackofficeShell(options: BackofficeShellOptions): string {
  const refresh =
    options.autoRefreshSeconds === undefined
      ? ''
      : `<meta http-equiv="refresh" content="${escapeAttribute(options.autoRefreshSeconds)}" />`;

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        ${refresh}
        <title>${escapeHtml(options.title)} · PopChoice Backoffice</title>
        <style>${renderBackofficeStyles()}</style>
      </head>
      <body>
        <div class="topbar">
          <div class="topbar-inner">
            <a class="brand" href="/" aria-label="PopChoice Backoffice home">
              <span class="brand-mark">PC</span>
              <span class="brand-copy">
                <span class="brand-name">PopChoice</span>
                <span class="brand-context">Backoffice</span>
              </span>
            </a>
            <span class="operator-badge">Operator console</span>
          </div>
        </div>
        <main>
          <header class="page-header">
            <div>
              <p class="page-kicker">${escapeHtml(options.eyebrow)}</p>
              <h1>${escapeHtml(options.title)}</h1>
              ${options.descriptionHtml ? `<div class="page-description">${options.descriptionHtml}</div>` : ''}
            </div>
            ${options.actions ? `<div class="actions">${options.actions}</div>` : ''}
          </header>
          ${renderNav(options.active)}
          ${options.body}
        </main>
      </body>
    </html>`;
}

function createOperatorAuthMiddleware(config: OperatorAuthConfig | null) {
  if (!config) {
    logger.warn('Backoffice operator auth is disabled because credentials are not configured');
    return (_request: Request, _response: Response, next: NextFunction) => next();
  }

  return (request: Request, response: Response, next: NextFunction) => {
    if (verifyOperatorBasicAuthHeader(request.headers.authorization, config)) {
      next();
      return;
    }

    response
      .status(401)
      .set('WWW-Authenticate', operatorAuthChallenge(config.realm))
      .send('Operator authentication required.');
  };
}

function renderSampleRows(issueKey: string, samples: CatalogMovieSample[]): string {
  if (samples.length === 0) {
    return '<p class="empty">No sample records returned.</p>';
  }

  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issueKey);

  return `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Movie</th>
          <th>Year</th>
          <th>TMDB</th>
          <th>Poster</th>
          <th>Localized</th>
          <th>Runtime</th>
          <th>Age</th>
          <th>Matched</th>
          ${canRepair ? '<th>Repair</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${samples
          .map(
            (movie) => `
              <tr>
                <td>${escapeHtml(movie.id)}</td>
                <td>${escapeHtml(movie.name)}</td>
                <td>${escapeHtml(movie.year)}</td>
                <td>${escapeHtml(movie.tmdb_id)}</td>
                <td>${movie.poster_url ? 'yes' : 'no'}</td>
                <td>${escapeHtml(movie.localized_name)}</td>
                <td>${escapeHtml(movie.duration)}</td>
                <td>${escapeHtml(movie.age_rating)}</td>
                <td>${escapeHtml(movie.tmdb_matched_at)}</td>
                ${
                  canRepair
                    ? `
                      <td>
                        <form class="repair-form" method="post" action="/catalog-health/actions">
                          <input type="hidden" name="action" value="enqueue_backfill" />
                          <input type="hidden" name="issue_key" value="${escapeAttribute(issueKey)}" />
                          <input type="hidden" name="movie_id" value="${escapeAttribute(movie.id)}" />
                          <button class="button small" type="submit">Queue backfill</button>
                        </form>
                      </td>
                    `
                    : ''
                }
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderIssue(issue: CatalogHealthIssue): string {
  const severity = issue.count > 0 ? 'needs-work' : 'healthy';

  return `
    <section class="panel ${severity}">
      <div class="panel-header">
        <h2>${escapeHtml(issue.label)}</h2>
        <span class="count">${escapeHtml(issue.count)}</span>
      </div>
      ${issue.count === 0 ? '<p class="empty">No affected movies.</p>' : renderSampleRows(issue.key, issue.samples)}
    </section>
  `;
}

function renderRepairFlash(repairStatus: string | null): string {
  if (repairStatus === 'queued') {
    return '<div class="notice good">Catalog backfill job queued. Workers will process it through the existing rate-limited TMDB path.</div>';
  }

  if (repairStatus === 'unavailable') {
    return '<div class="notice warn">Catalog repair queue is unavailable. Check REDIS_URL and the backoffice logs.</div>';
  }

  if (repairStatus === 'failed') {
    return '<div class="notice warn">Catalog repair action failed. Check backoffice logs for details.</div>';
  }

  return '';
}

function renderRepairAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number') return escapeHtml(value);
  return escapeHtml(JSON.stringify(value));
}

function renderCatalogRepairAuditRows(audit: CatalogRepairActionAudit[]): string {
  if (audit.length === 0) {
    return '<p class="empty">No catalog repair actions have been recorded yet.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>When</th>
          <th>Actor</th>
          <th>Issue</th>
          <th>Target</th>
          <th>Action</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${audit
          .map(
            (entry) => `
              <tr>
                <td>${escapeHtml(entry.createdAt)}</td>
                <td>${escapeHtml(entry.actor)}</td>
                <td>${escapeHtml(entry.issueKey)}</td>
                <td>${escapeHtml(entry.targetType)}:${escapeHtml(entry.targetId)}</td>
                <td>${escapeHtml(entry.action)}</td>
                <td>${renderRepairAuditValue(entry.result.jobId ?? entry.result.status ?? entry.result)}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderDuplicateGroup(group: DuplicateIdentityGroup): string {
  return `
    <article class="duplicate-group">
      <div class="duplicate-heading">
        <strong>${escapeHtml(group.identityKey)}</strong>
        <span>${escapeHtml(group.count)} movies</span>
      </div>
      <ul>
        ${group.movies
          .map(
            (movie) => `
              <li>
                <span>#${escapeHtml(movie.id)}</span>
                <span>${escapeHtml(movie.name)} (${escapeHtml(movie.year)})</span>
                <span>tmdb:${escapeHtml(movie.tmdb_id)}</span>
              </li>
            `,
          )
          .join('')}
      </ul>
    </article>
  `;
}

function renderDuplicateReport(title: string, report: CatalogHealthReport['duplicateTmdbIds']) {
  return `
    <section class="panel ${report.totalGroups > 0 ? 'needs-work' : 'healthy'}">
      <div class="panel-header">
        <h2>${escapeHtml(title)}</h2>
        <span class="count">${escapeHtml(report.totalGroups)}</span>
      </div>
      ${
        report.groups.length === 0
          ? '<p class="empty">No duplicate groups found.</p>'
          : report.groups.map(renderDuplicateGroup).join('')
      }
    </section>
  `;
}

function renderCatalogHealthPage(
  report: CatalogHealthReport,
  audit: CatalogRepairActionAudit[],
  repairStatus: string | null,
): string {
  const activeIssues = report.issues.filter((issue) => issue.count > 0).length;
  const duplicateGroups =
    report.duplicateTmdbIds.totalGroups + report.duplicateNormalizedTitleYears.totalGroups;

  return renderBackofficeShell({
    active: 'health',
    title: 'Catalog Health',
    eyebrow: 'Catalog operations',
    descriptionHtml: `Generated ${escapeHtml(report.generatedAt)}. Refreshes every 60 seconds.`,
    actions: '<a class="button" href="/">Refresh</a>',
    autoRefreshSeconds: 60,
    body: `
      ${renderRepairFlash(repairStatus)}
      <section class="summary" aria-label="Catalog health summary">
        <div class="stat"><span class="stat-label">Movies</span><span class="stat-value">${escapeHtml(report.totalMovies)}</span></div>
        <div class="stat"><span class="stat-label">Issue categories</span><span class="stat-value">${escapeHtml(activeIssues)}</span></div>
        <div class="stat"><span class="stat-label">Duplicate groups</span><span class="stat-value">${escapeHtml(duplicateGroups)}</span></div>
        <div class="stat"><span class="stat-label">Stale threshold</span><span class="stat-value">${escapeHtml(report.staleAfterDays)}d</span></div>
      </section>
      <div class="grid">
        ${report.issues.map(renderIssue).join('')}
        ${renderDuplicateReport('Duplicate TMDB ids', report.duplicateTmdbIds)}
        ${renderDuplicateReport('Duplicate normalized title/year groups', report.duplicateNormalizedTitleYears)}
        <section class="panel">
          <div class="panel-header">
            <h2>Recent repair actions</h2>
            <span class="count">${escapeHtml(audit.length)}</span>
          </div>
          ${renderCatalogRepairAuditRows(audit)}
        </section>
      </div>
    `,
  });
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${Math.round(value * 100)}%`;
}

function renderReason(reason: TMDBMatchReviewReason): string {
  return reason === 'ambiguous_match' ? 'Ambiguous match' : 'Runtime mismatch';
}

function renderStatus(status: TMDBMatchReviewStatus): string {
  const labels: Record<TMDBMatchReviewStatus, string> = {
    open: 'Open',
    resolved: 'Resolved',
    ignored: 'Ignored',
    deferred: 'Deferred',
  };
  return labels[status];
}

function renderCandidateSummary(candidates: TMDBReviewCandidate[]): string {
  if (candidates.length === 0) return '<span class="muted">No candidates captured</span>';

  const [best, runnerUp] = candidates;
  const gap =
    best?.confidence !== null &&
    best?.confidence !== undefined &&
    runnerUp?.confidence !== null &&
    runnerUp?.confidence !== undefined
      ? best.confidence - runnerUp.confidence
      : null;

  return `
    <div>${escapeHtml(best?.title)} (${escapeHtml(best?.releaseYear)})</div>
    <div class="muted">${escapeHtml(candidates.length)} candidate(s), best ${escapeHtml(formatPercent(best?.confidence ?? null))}${gap === null ? '' : `, gap ${escapeHtml(formatPercent(gap))}`}</div>
  `;
}

function renderReviewRows(reviews: TMDBMatchReview[]): string {
  if (reviews.length === 0) {
    return `
      <tr>
        <td colspan="8" class="empty">No TMDB review rows match these filters.</td>
      </tr>
    `;
  }

  return reviews
    .map(
      (review) => `
        <tr>
          <td><a href="/tmdb-reviews/${escapeAttribute(review.id)}">#${escapeHtml(review.id)}</a></td>
          <td>
            <strong>${escapeHtml(review.movieName)}</strong>
            <div class="muted">${escapeHtml(review.movieYear)} · movie ${escapeHtml(review.movieId)}</div>
          </td>
          <td><span class="pill">${escapeHtml(renderReason(review.reason))}</span></td>
          <td><span class="status ${escapeAttribute(review.status)}">${escapeHtml(renderStatus(review.status))}</span></td>
          <td>${renderCandidateSummary(review.candidates)}</td>
          <td>${escapeHtml(review.currentMovie?.tmdb_id ?? null)}</td>
          <td>${escapeHtml(review.updatedAt)}</td>
          <td><a class="button small" href="/tmdb-reviews/${escapeAttribute(review.id)}">Open</a></td>
        </tr>
      `,
    )
    .join('');
}

function renderReviewListPage(
  reviews: TMDBMatchReview[],
  filters: {
    status: TMDBMatchReviewStatus | 'all';
    reason: TMDBMatchReviewReason | 'all';
    sort: TMDBMatchReviewSort;
  },
): string {
  return renderBackofficeShell({
    active: 'reviews',
    title: 'TMDB Match Reviews',
    eyebrow: 'Catalog decisions',
    descriptionHtml:
      'Review ambiguous TMDB candidates and runtime confidence cases before changing catalog data.',
    actions: '<a class="button" href="/tmdb-reviews">Reset</a>',
    body: `
      <form class="filters" method="get" action="/tmdb-reviews">
        <label>Status
          <select name="status">
            ${renderOption('open', 'Open', filters.status)}
            ${renderOption('deferred', 'Deferred', filters.status)}
            ${renderOption('resolved', 'Resolved', filters.status)}
            ${renderOption('ignored', 'Ignored', filters.status)}
            ${renderOption('all', 'All', filters.status)}
          </select>
        </label>
        <label>Reason
          <select name="reason">
            ${renderOption('all', 'All', filters.reason)}
            ${renderOption('ambiguous_match', 'Ambiguous match', filters.reason)}
            ${renderOption('runtime_mismatch', 'Runtime mismatch', filters.reason)}
          </select>
        </label>
        <label>Sort
          <select name="sort">
            ${renderOption('highest_risk', 'Highest risk', filters.sort)}
            ${renderOption('oldest', 'Oldest first', filters.sort)}
            ${renderOption('newest', 'Newest first', filters.sort)}
          </select>
        </label>
        <button class="button" type="submit">Apply filters</button>
      </form>
      <section class="panel">
        <div class="panel-header">
          <h2>Review queue</h2>
          <span class="count">${escapeHtml(reviews.length)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Local movie</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Candidates</th>
              <th>Current TMDB</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${renderReviewRows(reviews)}</tbody>
        </table>
      </section>
    `,
  });
}

function renderOption(value: string, label: string, selected: string): string {
  return `<option value="${escapeAttribute(value)}"${selected === value ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function renderCandidateCard(review: TMDBMatchReview, candidate: TMDBReviewCandidate): string {
  const canApply =
    candidate.id !== null && (review.status === 'open' || review.status === 'deferred');

  return `
    <article class="candidate">
      <div>
        <h3>${escapeHtml(candidate.title)}</h3>
        <dl>
          <div><dt>TMDB</dt><dd>${escapeHtml(candidate.id)}</dd></div>
          <div><dt>Original</dt><dd>${escapeHtml(candidate.originalTitle)}</dd></div>
          <div><dt>Year</dt><dd>${escapeHtml(candidate.releaseYear)}</dd></div>
          <div><dt>Confidence</dt><dd>${escapeHtml(formatPercent(candidate.confidence))}</dd></div>
        </dl>
      </div>
      ${
        canApply
          ? `
            <form class="action-form" method="post" action="/tmdb-reviews/${escapeAttribute(review.id)}/actions">
              <input type="hidden" name="action" value="apply_candidate" />
              <input type="hidden" name="candidate_id" value="${escapeAttribute(candidate.id)}" />
              <label>Decision note
                <input name="note" maxlength="500" placeholder="Why this candidate is correct" />
              </label>
              <button class="button primary" type="submit">Apply candidate</button>
            </form>
          `
          : '<p class="muted">This candidate cannot be applied from the current review state.</p>'
      }
    </article>
  `;
}

function renderAuditRows(audit: TMDBMatchReviewActionAudit[]): string {
  if (audit.length === 0) {
    return '<p class="empty">No decisions have been recorded yet.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>When</th>
          <th>Actor</th>
          <th>Action</th>
          <th>Status</th>
          <th>Candidate</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${audit
          .map(
            (entry) => `
              <tr>
                <td>${escapeHtml(entry.createdAt)}</td>
                <td>${escapeHtml(entry.actor)}</td>
                <td>${escapeHtml(entry.action)}</td>
                <td>${escapeHtml(entry.previousStatus)} → ${escapeHtml(entry.newStatus)}</td>
                <td>${escapeHtml(entry.candidate?.id ?? null)} ${entry.candidate ? escapeHtml(entry.candidate.title) : ''}</td>
                <td>${escapeHtml(entry.note)}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderReviewDetailPage(
  review: TMDBMatchReview,
  audit: TMDBMatchReviewActionAudit[],
): string {
  const candidates =
    review.candidates.length === 0
      ? '<p class="empty">No candidate metadata was captured. Reject, defer, or rerun backfill after checking TMDB manually.</p>'
      : review.candidates.map((candidate) => renderCandidateCard(review, candidate)).join('');

  return renderBackofficeShell({
    active: 'reviews',
    title: `TMDB Review #${escapeHtml(review.id)}`,
    eyebrow: 'Catalog decision',
    descriptionHtml: `${escapeHtml(renderReason(review.reason))} · ${escapeHtml(renderStatus(review.status))} · updated ${escapeHtml(review.updatedAt)}`,
    actions: '<a class="button" href="/tmdb-reviews">Back to queue</a>',
    body: `
      <section class="detail-grid">
        <article class="panel">
          <div class="panel-header"><h2>Local movie</h2></div>
          <dl class="facts">
            <div><dt>ID</dt><dd>${escapeHtml(review.movieId)}</dd></div>
            <div><dt>Name</dt><dd>${escapeHtml(review.currentMovie?.name ?? review.movieName)}</dd></div>
            <div><dt>Year</dt><dd>${escapeHtml(review.currentMovie?.year ?? review.movieYear)}</dd></div>
            <div><dt>Runtime</dt><dd>${escapeHtml(review.currentMovie?.duration ?? null)}</dd></div>
            <div><dt>Age</dt><dd>${escapeHtml(review.currentMovie?.age_rating ?? null)}</dd></div>
            <div><dt>TMDB</dt><dd>${escapeHtml(review.currentMovie?.tmdb_id ?? null)}</dd></div>
            <div><dt>Matched at</dt><dd>${escapeHtml(review.currentMovie?.tmdb_matched_at ?? null)}</dd></div>
          </dl>
        </article>
        <article class="panel">
          <div class="panel-header"><h2>Why it needs review</h2></div>
          <div class="copy">
            <p><strong>${escapeHtml(renderReason(review.reason))}</strong></p>
            <p>${escapeHtml(review.notes ?? 'No notes were recorded by backfill.')}</p>
            <p class="muted">Actions are audited. Applying a candidate only changes TMDB identity fields and marks the match source as manual; richer metadata still comes from backfill/discovery refreshes.</p>
          </div>
        </article>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Decision actions</h2></div>
        <div class="decision-actions">
          ${renderStatusActionForm(review, 'reject', 'Reject / ignore')}
          ${renderStatusActionForm(review, 'defer', 'Defer')}
          ${renderStatusActionForm(review, 'reopen', 'Reopen')}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h2>Candidates</h2>
          <span class="count">${escapeHtml(review.candidates.length)}</span>
        </div>
        <div class="candidates">${candidates}</div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Audit history</h2></div>
        ${renderAuditRows(audit)}
      </section>
    `,
  });
}

function renderStatusActionForm(
  review: TMDBMatchReview,
  action: Exclude<TMDBMatchReviewAction, 'apply_candidate'>,
  label: string,
): string {
  const disabled =
    (action === 'reject' && review.status === 'ignored') ||
    (action === 'defer' && review.status === 'deferred') ||
    (action === 'reopen' && review.status === 'open');

  return `
    <form class="action-form" method="post" action="/tmdb-reviews/${escapeAttribute(review.id)}/actions">
      <input type="hidden" name="action" value="${escapeAttribute(action)}" />
      <label>Decision note
        <input name="note" maxlength="500" placeholder="Optional rationale" ${disabled ? 'disabled' : ''} />
      </label>
      <button class="button" type="submit" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>
    </form>
  `;
}

function renderErrorPage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return renderBackofficeShell({
    active: 'health',
    title: 'Backoffice unavailable',
    eyebrow: 'Operator error',
    descriptionHtml:
      'The backoffice service is running, but the requested report could not be loaded.',
    actions: '<a class="button" href="/">Retry</a>',
    body: `
      <section class="panel error-panel">
        <div class="panel-header"><h2>Error detail</h2></div>
        <pre>${escapeHtml(message)}</pre>
      </section>
    `,
  });
}

const config = readBackofficeRuntimeConfig();

initDatabase(config.databaseUrl);
await ensureCatalogRepairActionSchema();
await ensureTMDBMatchReviewActionSchema();

const app = express();

app.set('trust proxy', 1);
app.get('/healthz', (_request, response) => response.status(200).send('ok'));
app.use(express.urlencoded({ extended: false }));
app.use(
  rateLimit({
    windowMs: config.operatorAuthRateLimitWindowSeconds * 1000,
    limit: config.operatorAuthRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Too many backoffice requests, please try again later.',
  }),
);
app.use(createOperatorAuthMiddleware(config.operatorAuth));

app.get('/', async (request, response) => {
  try {
    const [report, audit] = await Promise.all([
      getCatalogHealthReport({
        sampleLimit: config.catalogHealthSampleLimit,
        staleAfterDays: config.catalogHealthStaleDays,
      }),
      listCatalogRepairAudit(DEFAULT_REPAIR_AUDIT_LIMIT),
    ]);
    const repairStatus =
      typeof request.query.repair === 'string' ? request.query.repair.trim() : null;
    response.type('html').send(renderCatalogHealthPage(report, audit, repairStatus));
  } catch (error) {
    logger.error('Failed to render catalog health report', { err: error });
    response.status(500).type('html').send(renderErrorPage(error));
  }
});

app.post('/catalog-health/actions', async (request, response) => {
  try {
    if (request.body.action !== 'enqueue_backfill') {
      throw new Error('Unsupported catalog-health action.');
    }

    const movieId = parseMovieId(request.body.movie_id);
    const issueKey = parseCatalogIssueKey(request.body.issue_key);
    const snapshot = await getCatalogRepairMovieSnapshot(movieId);

    if (!snapshot) {
      response.status(404).type('html').send(renderErrorPage('Movie not found.'));
      return;
    }

    const job = await enqueueCatalogBackfillMovieFromBackoffice(
      {
        movieId,
        reason: getBackfillReasonForIssue(issueKey),
        language: config.tmdbLanguage,
      },
      config.redisUrl,
    );

    await recordCatalogRepairAction({
      action: 'enqueue_backfill',
      actor: parseOperatorActor(request),
      issueKey,
      targetType: 'movie',
      targetId: movieId,
      note: typeof request.body.note === 'string' ? request.body.note : undefined,
      previousState: { ...snapshot },
      result: job
        ? { status: 'queued', ...job }
        : { status: 'queue_unavailable', queueName: 'catalog-maintenance' },
    });

    response.redirect(303, job ? '/?repair=queued' : '/?repair=unavailable');
  } catch (error) {
    logger.error('Failed to apply catalog-health repair action', { err: error });
    response.redirect(303, '/?repair=failed');
  }
});

app.get('/tmdb-reviews', async (request, response) => {
  try {
    const filters = {
      status: parseTMDBReviewStatus(request.query.status),
      reason: parseTMDBReviewReason(request.query.reason),
      sort: parseTMDBReviewSort(request.query.sort),
    };
    const reviews = await listTMDBMatchReviews({
      status: filters.status,
      reason: filters.reason,
      sort: filters.sort,
      limit: 200,
    });

    response.type('html').send(renderReviewListPage(reviews, filters));
  } catch (error) {
    logger.error('Failed to render TMDB match review queue', { err: error });
    response.status(500).type('html').send(renderErrorPage(error));
  }
});

app.get('/tmdb-reviews/:id', async (request, response) => {
  try {
    const review = await getTMDBMatchReview(request.params.id);
    if (!review) {
      response.status(404).type('html').send(renderErrorPage('TMDB match review not found.'));
      return;
    }

    const audit = await listTMDBMatchReviewAudit(review.id);
    response.type('html').send(renderReviewDetailPage(review, audit));
  } catch (error) {
    logger.error('Failed to render TMDB match review detail', { err: error });
    response.status(500).type('html').send(renderErrorPage(error));
  }
});

app.post('/tmdb-reviews/:id/actions', async (request, response) => {
  try {
    const action = parseAction(request.body.action);
    const candidateId =
      typeof request.body.candidate_id === 'string' && request.body.candidate_id.trim() !== ''
        ? Number.parseInt(request.body.candidate_id, 10)
        : undefined;

    await applyTMDBMatchReviewAction({
      reviewId: request.params.id,
      action,
      actor: parseOperatorActor(request),
      candidateId: Number.isFinite(candidateId) ? candidateId : undefined,
      note: typeof request.body.note === 'string' ? request.body.note : undefined,
    });

    response.redirect(303, `/tmdb-reviews/${encodeURIComponent(request.params.id)}`);
  } catch (error) {
    logger.error('Failed to apply TMDB match review action', { err: error });
    response
      .status(400)
      .type('html')
      .send(renderErrorPage('Review action failed. Check backoffice logs for details.'));
  }
});

app.listen(config.port, '0.0.0.0', () => {
  logger.info('Backoffice listening', {
    catalogHealthSampleLimit: config.catalogHealthSampleLimit,
    catalogHealthStaleDays: config.catalogHealthStaleDays,
    port: config.port,
  });
});
