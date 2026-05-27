import { fileURLToPath } from 'node:url';

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
const ASSET_DIR = fileURLToPath(new URL('../../web/public', import.meta.url));
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  second: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
  year: 'numeric',
});

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

function formatBackofficeDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const raw = value instanceof Date ? value.toISOString() : value.trim();
  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return raw;
  return DATE_TIME_FORMATTER.format(date);
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

function wantsJsonResponse(request: Request): boolean {
  const accept = request.get('accept') ?? '';
  const requestedWith = request.get('x-requested-with') ?? '';
  return accept.includes('application/json') || requestedWith.toLowerCase() === 'fetch';
}

function catalogRepairMessage(status: CatalogRepairActionResult['status']): string {
  if (status === 'queued') {
    return 'Catalog backfill job queued. Workers will process it through the existing rate-limited TMDB path.';
  }

  return 'Catalog repair queue is unavailable. Check REDIS_URL and the backoffice logs.';
}

async function performCatalogRepairAction(request: Request): Promise<CatalogRepairActionResult> {
  if (request.body.action !== 'enqueue_backfill') {
    throw new Error('Unsupported catalog-health action.');
  }

  const movieId = parseMovieId(request.body.movie_id);
  const issueKey = parseCatalogIssueKey(request.body.issue_key);
  const snapshot = await getCatalogRepairMovieSnapshot(movieId);

  if (!snapshot) {
    const error = new Error('Movie not found.');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
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

  return {
    status: job ? 'queued' : 'unavailable',
    issueKey,
    movieId,
    job,
  };
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
  scriptHtml?: string;
};

type CatalogRepairActionResult = {
  status: 'queued' | 'unavailable';
  issueKey: string;
  movieId: string;
  job: Awaited<ReturnType<typeof enqueueCatalogBackfillMovieFromBackoffice>>;
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
      --good-soft: rgba(64, 196, 99, 0.15);
      --warn: #f5c542;
      --warn-soft: rgba(245, 197, 66, 0.15);
      --bad: #ff5f56;
      --bad-soft: rgba(255, 95, 86, 0.15);
      --accent: #7cc7ff;
      --accent-soft: rgba(124, 199, 255, 0.14);
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
    tbody tr:hover td { background: rgba(255, 255, 255, 0.018); }
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
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.72);
      box-shadow: 0 10px 30px rgba(245, 197, 66, 0.2);
      overflow: hidden;
    }
    .brand-mark img {
      width: 38px;
      height: 38px;
      display: block;
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
    .button.primary {
      border-color: color-mix(in srgb, var(--accent), var(--border) 35%);
      background: linear-gradient(180deg, rgba(124, 199, 255, 0.18), var(--surface-2));
    }
    .button.success {
      color: #07130b;
      border-color: color-mix(in srgb, var(--good), #ffffff 18%);
      background: linear-gradient(180deg, #63df80, #40c463);
    }
    .button.danger {
      border-color: color-mix(in srgb, var(--bad), var(--border) 35%);
      background: linear-gradient(180deg, rgba(255, 95, 86, 0.16), var(--surface-2));
    }
    .button.secondary {
      border-color: color-mix(in srgb, var(--warn), var(--border) 45%);
      background: linear-gradient(180deg, rgba(245, 197, 66, 0.16), var(--surface-2));
    }
    .button.quiet { color: var(--muted); background: #111419; }
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
    .stat.warning { border-color: color-mix(in srgb, var(--warn), var(--border) 50%); }
    .stat.healthy { border-color: color-mix(in srgb, var(--good), var(--border) 65%); }
    .stat-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }
    .stat-label { display: block; color: var(--muted); font-size: 13px; font-weight: 700; }
    .stat-value { display: block; font-size: 30px; font-weight: 850; margin-top: 4px; }
    .stat-meta { color: var(--subtle); font-size: 12px; font-weight: 700; margin-top: 2px; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    .panel { overflow: hidden; margin-bottom: 14px; }
    .panel.needs-work { border-color: color-mix(in srgb, var(--warn), var(--border) 55%); }
    .panel.healthy { border-color: color-mix(in srgb, var(--good), var(--border) 68%); }
    .panel.repairable { border-color: color-mix(in srgb, var(--accent), var(--border) 45%); }
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
    .count.warning { color: var(--warn); background: var(--warn-soft); }
    .count.healthy { color: var(--good); background: var(--good-soft); }
    .count.repairable { color: var(--accent); background: var(--accent-soft); }
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
    .catalog-status {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
      margin-bottom: 14px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01));
      box-shadow: var(--shadow);
    }
    .catalog-status.needs-work { border-color: color-mix(in srgb, var(--warn), var(--border) 50%); }
    .catalog-status.healthy { border-color: color-mix(in srgb, var(--good), var(--border) 62%); }
    .status-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 3px;
      font-weight: 850;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--warn);
      box-shadow: 0 0 0 4px var(--warn-soft);
    }
    .catalog-status.healthy .status-dot {
      background: var(--good);
      box-shadow: 0 0 0 4px var(--good-soft);
    }
    .status-copy { margin: 0; color: var(--muted); }
    .status-metrics {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .issue-title { display: grid; gap: 3px; }
    .issue-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .issue-hint { color: var(--muted); font-size: 12px; font-weight: 650; }
    .table-scroll { overflow-x: auto; }
    .sample-table { min-width: 1020px; }
    .sample-table .id-cell { color: var(--muted); font-variant-numeric: tabular-nums; }
    .sample-table .movie-cell { min-width: 220px; }
    .sample-table .repair-cell { width: 148px; }
    .sample-table tr.repair-pending td {
      background: rgba(124, 199, 255, 0.05);
    }
    .sample-table tr.repair-queued td {
      background: rgba(64, 196, 99, 0.06);
    }
    .data-pill {
      display: inline-flex;
      min-width: 34px;
      justify-content: center;
      border-radius: 999px;
      padding: 1px 7px;
      font-size: 12px;
      font-weight: 850;
      text-transform: uppercase;
    }
    .data-pill.good { color: var(--good); background: var(--good-soft); }
    .data-pill.warn { color: var(--warn); background: var(--warn-soft); }
    .data-pill.neutral { color: var(--muted); background: var(--surface-3); }
    .filters,
    .review-toolbar {
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
    .review-toolbar {
      justify-content: space-between;
      align-items: center;
    }
    .toolbar-fields {
      display: flex;
      gap: 10px;
      align-items: end;
      flex-wrap: wrap;
    }
    .toolbar-summary {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
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
    .status.open { color: var(--warn); background: var(--warn-soft); }
    .status.resolved { color: var(--good); background: var(--good-soft); }
    .status.ignored { color: var(--bad); background: var(--bad-soft); }
    .status.deferred { color: var(--accent); background: var(--accent-soft); }
    .pill.reason-runtime { color: var(--bad); background: var(--bad-soft); }
    .pill.reason-ambiguous { color: var(--warn); background: var(--warn-soft); }
    .pill.healthy { color: var(--good); background: var(--good-soft); }
    .pill.good { color: var(--good); background: var(--good-soft); }
    .pill.warning { color: var(--warn); background: var(--warn-soft); }
    .pill.repairable { color: var(--accent); background: var(--accent-soft); }
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
    .repair-form {
      display: grid;
      gap: 6px;
      margin: 0;
    }
    .repair-message {
      min-height: 16px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 750;
      line-height: 1.25;
    }
    .repair-message.good { color: var(--good); }
    .repair-message.warn { color: var(--warn); }
    .repair-placeholder {
      color: var(--muted);
      font-weight: 750;
      text-align: center;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
      gap: 14px;
    }
    .review-table .movie-title {
      display: grid;
      gap: 2px;
    }
    .review-table .candidate-summary {
      display: grid;
      gap: 6px;
      min-width: 260px;
    }
    .candidate-headline {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .confidence-meter {
      width: 100%;
      max-width: 220px;
      height: 8px;
      border-radius: 999px;
      background: #0f1217;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .confidence-meter span {
      display: block;
      height: 100%;
      width: var(--confidence-width);
      background: linear-gradient(90deg, var(--bad), var(--warn), var(--good));
    }
    .decision-brief {
      padding: 14px;
      display: grid;
      gap: 8px;
      border-top: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.018);
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
    .candidate.best { border-color: color-mix(in srgb, var(--good), var(--border) 45%); }
    .candidate.current { border-color: color-mix(in srgb, var(--accent), var(--border) 35%); }
    .candidate-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .candidate-flags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .candidate-warning {
      margin: 10px 14px 0;
      color: var(--warn);
      font-size: 12px;
      font-weight: 800;
    }
    .decision-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(220px, 1fr));
      gap: 12px;
      padding: 14px;
    }
    .decision-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      background: rgba(17, 20, 25, 0.7);
    }
    .decision-card.reject { border-color: color-mix(in srgb, var(--bad), var(--border) 48%); }
    .decision-card.defer { border-color: color-mix(in srgb, var(--warn), var(--border) 54%); }
    .decision-card.reopen { border-color: color-mix(in srgb, var(--accent), var(--border) 50%); }
    .decision-card-header {
      display: grid;
      gap: 3px;
      margin-bottom: 10px;
    }
    .decision-title { font-weight: 850; }
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
      .catalog-status { align-items: flex-start; flex-direction: column; }
      .status-metrics { justify-content: flex-start; }
      .detail-grid { grid-template-columns: 1fr; }
      .decision-actions { grid-template-columns: 1fr; }
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
              <span class="brand-mark" aria-hidden="true">
                <img src="/assets/popcorn.svg" alt="" />
              </span>
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
        ${options.scriptHtml ?? ''}
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

function renderBooleanDataPill(value: boolean): string {
  return `<span class="data-pill ${value ? 'good' : 'warn'}">${value ? 'yes' : 'no'}</span>`;
}

function renderOptionalCatalogValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '<span class="data-pill neutral">-</span>';
  }

  return escapeHtml(value);
}

function getCatalogIssueHint(issueKey: string): string {
  const hints: Record<string, string> = {
    missing_poster_url: 'Poster coverage affects result cards and catalog browsing.',
    missing_localized_name: 'Localized names improve non-English operator and user views.',
    missing_tmdb_id: 'Identity gaps block richer TMDB refreshes and joins.',
    missing_runtime: 'Runtime gaps make fit and pacing recommendations weaker.',
    missing_age_rating: 'Age-rating gaps reduce safety and household filtering quality.',
    missing_tmdb_matched_at: 'Matched rows need timestamps for stale-data decisions.',
    stale_tmdb_metadata: 'Refresh candidates through the rate-limited TMDB path.',
    missing_cast_metadata: 'Cast gaps limit actor-aware recommendation features.',
    missing_director_metadata: 'Director gaps limit creator-aware recommendation features.',
    missing_genre_metadata: 'Genre gaps weaken discovery and future filters.',
    missing_keyword_metadata: 'Keyword gaps reduce nuance for ranking and search.',
  };

  return hints[issueKey] ?? 'Review affected catalog records.';
}

function renderCountPill(count: number, state: 'healthy' | 'warning' | 'repairable'): string {
  return `<span class="count ${state}">${escapeHtml(count)}</span>`;
}

function renderCatalogStat(
  label: string,
  value: string | number,
  meta: string,
  state: 'healthy' | 'warning' | 'neutral' = 'neutral',
): string {
  return `
    <div class="stat ${state}">
      <div class="stat-top">
        <span class="stat-label">${escapeHtml(label)}</span>
      </div>
      <span class="stat-value">${escapeHtml(value)}</span>
      <div class="stat-meta">${escapeHtml(meta)}</div>
    </div>
  `;
}

function renderCatalogStatusStrip(activeIssues: number, duplicateGroups: number): string {
  const isHealthy = activeIssues === 0 && duplicateGroups === 0;

  return `
    <section class="catalog-status ${isHealthy ? 'healthy' : 'needs-work'}" aria-label="Catalog health status">
      <div>
        <div class="status-heading">
          <span class="status-dot" aria-hidden="true"></span>
          <span>${isHealthy ? 'Catalog is clear' : 'Catalog needs operator attention'}</span>
        </div>
        <p class="status-copy">
          ${isHealthy ? 'No active issue categories or duplicate groups are currently reported.' : 'Work the highest-count repairable panels first, then review duplicates before manual merges.'}
        </p>
      </div>
      <div class="status-metrics" aria-label="Open catalog signals">
        <span class="pill ${activeIssues > 0 ? 'warning' : 'good'}">${escapeHtml(activeIssues)} active issue categories</span>
        <span class="pill ${duplicateGroups > 0 ? 'warning' : 'good'}">${escapeHtml(duplicateGroups)} duplicate groups</span>
      </div>
    </section>
  `;
}

function renderSampleRows(issueKey: string, samples: CatalogMovieSample[]): string {
  if (samples.length === 0) {
    return '<p class="empty">No sample records returned.</p>';
  }

  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issueKey);

  return `
    <div class="table-scroll">
      <table class="sample-table">
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
                <tr data-repair-row data-issue-key="${escapeAttribute(issueKey)}" data-movie-id="${escapeAttribute(movie.id)}">
                  <td class="id-cell">#${escapeHtml(movie.id)}</td>
                  <td class="movie-cell"><strong>${escapeHtml(movie.name)}</strong></td>
                  <td>${escapeHtml(movie.year)}</td>
                  <td>${renderOptionalCatalogValue(movie.tmdb_id)}</td>
                  <td>${renderBooleanDataPill(Boolean(movie.poster_url))}</td>
                  <td>${renderOptionalCatalogValue(movie.localized_name)}</td>
                  <td>${movie.duration > 0 ? escapeHtml(movie.duration) : '<span class="data-pill warn">0</span>'}</td>
                  <td>${renderOptionalCatalogValue(movie.age_rating)}</td>
                  <td>${renderOptionalCatalogValue(movie.tmdb_matched_at)}</td>
                  ${
                    canRepair
                      ? `
                        <td class="repair-cell">
                          <form class="repair-form" method="post" action="/catalog-health/actions" data-repair-form>
                            <input type="hidden" name="action" value="enqueue_backfill" />
                            <input type="hidden" name="issue_key" value="${escapeAttribute(issueKey)}" />
                            <input type="hidden" name="movie_id" value="${escapeAttribute(movie.id)}" />
                            <button class="button primary small" type="submit" data-repair-submit>Queue backfill</button>
                            <span class="repair-message" aria-live="polite" data-repair-message></span>
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
    </div>
  `;
}

function renderIssue(issue: CatalogHealthIssue): string {
  const severity = issue.count > 0 ? 'needs-work' : 'healthy';
  const canRepair = REPAIRABLE_CATALOG_ISSUE_KEYS.has(issue.key);
  const state = issue.count === 0 ? 'healthy' : canRepair ? 'repairable' : 'warning';

  return `
    <section class="panel issue-panel ${severity} ${canRepair && issue.count > 0 ? 'repairable' : ''}">
      <div class="panel-header">
        <div class="issue-title">
          <div class="issue-title-row">
            <h2>${escapeHtml(issue.label)}</h2>
            <span class="pill ${state}">${issue.count === 0 ? 'Healthy' : canRepair ? 'Repairable' : 'Review'}</span>
          </div>
          <div class="issue-hint">${escapeHtml(getCatalogIssueHint(issue.key))}</div>
        </div>
        ${renderCountPill(issue.count, state)}
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

function renderCatalogRepairEnhancementScript(): string {
  return `<script>
    (() => {
      if (!window.fetch || !window.FormData) return;

      const setMessage = (form, text, tone) => {
        const message = form.querySelector('[data-repair-message]');
        if (!message) return;
        message.textContent = text;
        message.classList.toggle('good', tone === 'good');
        message.classList.toggle('warn', tone === 'warn');
      };

      const setButton = (form, text, disabled) => {
        const button = form.querySelector('[data-repair-submit]');
        if (!button) return;
        button.textContent = text;
        button.disabled = disabled;
      };

      const appendEmptyPlaceholder = (body, columnCount) => {
        if (!body || body.querySelector('[data-repair-row]')) return;
        const placeholder = document.createElement('tr');
        placeholder.innerHTML =
          '<td class="repair-placeholder" colspan="' +
          columnCount +
          '">Visible sample queued. Refresh after workers complete to verify catalog health.</td>';
        body.appendChild(placeholder);
      };

      document.querySelectorAll('[data-repair-form]').forEach((form) => {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();

          const row = form.closest('[data-repair-row]');
          const originalText = form.querySelector('[data-repair-submit]')?.textContent || 'Queue backfill';

          row?.classList.add('repair-pending');
          setButton(form, 'Queueing...', true);
          setMessage(form, 'Queueing...', '');

          try {
            const response = await fetch(form.action, {
              method: 'POST',
              body: new URLSearchParams(new FormData(form)),
              headers: {
                Accept: 'application/json',
                'X-Requested-With': 'fetch',
              },
            });
            const payload = await response.json().catch(() => null);

            if (response.ok && payload?.status === 'queued') {
              row?.classList.remove('repair-pending');
              row?.classList.add('repair-queued');
              setButton(form, 'Queued', true);
              setMessage(form, 'Queued for workers', 'good');
              if (row) {
                window.setTimeout(() => {
                  const body = row.parentElement;
                  const columnCount = row.cells.length;
                  row.remove();
                  appendEmptyPlaceholder(body, columnCount);
                }, 450);
              }
              return;
            }

            row?.classList.remove('repair-pending');
            setButton(form, originalText, false);
            setMessage(form, payload?.message || 'Queue unavailable. Check Redis and logs.', 'warn');
          } catch (_error) {
            row?.classList.remove('repair-pending');
            setButton(form, originalText, false);
            setMessage(form, 'Request failed. Try again.', 'warn');
          }
        });
      });
    })();
  </script>`;
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
                <td>${escapeHtml(formatBackofficeDateTime(entry.createdAt))}</td>
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
  const state = report.totalGroups > 0 ? 'warning' : 'healthy';

  return `
    <section class="panel duplicate-panel ${report.totalGroups > 0 ? 'needs-work' : 'healthy'}">
      <div class="panel-header">
        <div class="issue-title">
          <div class="issue-title-row">
            <h2>${escapeHtml(title)}</h2>
            <span class="pill ${state}">${report.totalGroups > 0 ? 'Review' : 'Healthy'}</span>
          </div>
          <div class="issue-hint">Potential identity collisions that should be reviewed before merge automation.</div>
        </div>
        ${renderCountPill(report.totalGroups, state)}
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
    descriptionHtml: `Generated ${escapeHtml(formatBackofficeDateTime(report.generatedAt))}. Refreshes every 60 seconds.`,
    actions: '<a class="button" href="/">Refresh</a>',
    autoRefreshSeconds: 60,
    body: `
      ${renderRepairFlash(repairStatus)}
      ${renderCatalogStatusStrip(activeIssues, duplicateGroups)}
      <section class="summary" aria-label="Catalog health summary">
        ${renderCatalogStat('Movies', report.totalMovies, 'Catalog rows tracked', 'neutral')}
        ${renderCatalogStat('Issue categories', activeIssues, activeIssues === 0 ? 'No active categories' : 'Categories with affected rows', activeIssues === 0 ? 'healthy' : 'warning')}
        ${renderCatalogStat('Duplicate groups', duplicateGroups, duplicateGroups === 0 ? 'No duplicate groups' : 'Groups awaiting review', duplicateGroups === 0 ? 'healthy' : 'warning')}
        ${renderCatalogStat('Stale threshold', `${report.staleAfterDays}d`, 'TMDB metadata refresh window', 'neutral')}
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
    scriptHtml: renderCatalogRepairEnhancementScript(),
  });
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${Math.round(value * 100)}%`;
}

function formatConfidenceWidth(value: number | null): string {
  if (value === null) return '0%';
  return `${Math.min(Math.max(Math.round(value * 100), 0), 100)}%`;
}

function renderReason(reason: TMDBMatchReviewReason): string {
  return reason === 'ambiguous_match' ? 'Ambiguous match' : 'Runtime mismatch';
}

function renderReasonBadge(reason: TMDBMatchReviewReason): string {
  const className = reason === 'runtime_mismatch' ? 'reason-runtime' : 'reason-ambiguous';
  return `<span class="pill ${className}">${escapeHtml(renderReason(reason))}</span>`;
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

function renderStatusBadge(status: TMDBMatchReviewStatus): string {
  return `<span class="status ${escapeAttribute(status)}">${escapeHtml(renderStatus(status))}</span>`;
}

function renderConfidenceMeter(confidence: number | null): string {
  return `
    <div class="confidence-meter" aria-label="Confidence ${escapeAttribute(formatPercent(confidence))}">
      <span style="--confidence-width: ${escapeAttribute(formatConfidenceWidth(confidence))}"></span>
    </div>
  `;
}

function renderCurrentTMDBValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '<span class="data-pill neutral">-</span>';
  return `<span class="data-pill good">${escapeHtml(value)}</span>`;
}

function renderReviewFilterSummary(filters: {
  status: TMDBMatchReviewStatus | 'all';
  reason: TMDBMatchReviewReason | 'all';
  sort: TMDBMatchReviewSort;
}): string {
  return `
    <div class="toolbar-summary" aria-label="Active filters">
      <span class="pill">${escapeHtml(filters.status === 'all' ? 'All statuses' : renderStatus(filters.status))}</span>
      <span class="pill">${escapeHtml(filters.reason === 'all' ? 'All reasons' : renderReason(filters.reason))}</span>
      <span class="pill">${escapeHtml(filters.sort.replaceAll('_', ' '))}</span>
    </div>
  `;
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
    <div class="candidate-summary">
      <div class="candidate-headline">
        <strong>${escapeHtml(best?.title)} (${escapeHtml(best?.releaseYear)})</strong>
        <span class="pill">${escapeHtml(formatPercent(best?.confidence ?? null))}</span>
      </div>
      ${renderConfidenceMeter(best?.confidence ?? null)}
      <div class="muted">${escapeHtml(candidates.length)} candidate(s)${gap === null ? '' : `, gap ${escapeHtml(formatPercent(gap))}`}</div>
    </div>
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
            <div class="movie-title">
              <strong>${escapeHtml(review.movieName)}</strong>
              <span class="muted">${escapeHtml(review.movieYear)} · movie ${escapeHtml(review.movieId)}</span>
            </div>
          </td>
          <td>${renderReasonBadge(review.reason)}</td>
          <td>${renderStatusBadge(review.status)}</td>
          <td>${renderCandidateSummary(review.candidates)}</td>
          <td>${renderCurrentTMDBValue(review.currentMovie?.tmdb_id)}</td>
          <td>${escapeHtml(formatBackofficeDateTime(review.updatedAt))}</td>
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
      <form class="review-toolbar" method="get" action="/tmdb-reviews">
        <div class="toolbar-fields">
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
          <button class="button primary" type="submit">Apply filters</button>
        </div>
        ${renderReviewFilterSummary(filters)}
      </form>
      <section class="panel">
        <div class="panel-header">
          <h2>Review queue</h2>
          <span class="count">${escapeHtml(reviews.length)}</span>
        </div>
        <table class="review-table">
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

function getCandidateWarning(
  review: TMDBMatchReview,
  candidate: TMDBReviewCandidate,
): string | null {
  if (candidate.id === null) return 'Candidate has no TMDB id and cannot be applied.';
  if (candidate.confidence !== null && candidate.confidence < 0.7) {
    return 'Low confidence candidate. Verify title, year, and runtime before applying.';
  }
  if (candidate.releaseYear !== null && candidate.releaseYear !== review.movieYear) {
    return `Release year differs from local movie year ${review.movieYear}.`;
  }
  return null;
}

function renderCandidateCard(
  review: TMDBMatchReview,
  candidate: TMDBReviewCandidate,
  index: number,
): string {
  const canApply =
    candidate.id !== null && (review.status === 'open' || review.status === 'deferred');
  const isBest = index === 0;
  const isCurrent = candidate.id !== null && candidate.id === review.currentMovie?.tmdb_id;
  const warning = getCandidateWarning(review, candidate);

  return `
    <article class="candidate ${isBest ? 'best' : ''} ${isCurrent ? 'current' : ''}">
      <div>
        <div class="candidate-title">
          <h3>${escapeHtml(candidate.title)}</h3>
          <div class="candidate-flags">
            ${isBest ? '<span class="pill good">Best candidate</span>' : ''}
            ${isCurrent ? '<span class="pill repairable">Current TMDB</span>' : ''}
            ${warning ? '<span class="pill warning">Needs check</span>' : ''}
          </div>
        </div>
        <dl>
          <div><dt>TMDB</dt><dd>${escapeHtml(candidate.id)}</dd></div>
          <div><dt>Original</dt><dd>${escapeHtml(candidate.originalTitle)}</dd></div>
          <div><dt>Year</dt><dd>${escapeHtml(candidate.releaseYear)}</dd></div>
          <div><dt>Confidence</dt><dd>${escapeHtml(formatPercent(candidate.confidence))}</dd></div>
        </dl>
        ${renderConfidenceMeter(candidate.confidence)}
        ${warning ? `<p class="candidate-warning">${escapeHtml(warning)}</p>` : ''}
      </div>
      ${
        canApply
          ? `
            <form class="action-form apply-action" method="post" action="/tmdb-reviews/${escapeAttribute(review.id)}/actions">
              <input type="hidden" name="action" value="apply_candidate" />
              <input type="hidden" name="candidate_id" value="${escapeAttribute(candidate.id)}" />
              <label>Decision note
                <input name="note" maxlength="500" placeholder="Why this candidate is correct" />
              </label>
              <button class="button success" type="submit">Apply candidate</button>
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
                <td>${escapeHtml(formatBackofficeDateTime(entry.createdAt))}</td>
                <td>${escapeHtml(entry.actor)}</td>
                <td>${escapeHtml(entry.action.replaceAll('_', ' '))}</td>
                <td>${entry.previousStatus ? renderStatusBadge(entry.previousStatus) : '<span class="data-pill neutral">-</span>'} ${renderStatusBadge(entry.newStatus)}</td>
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
      : review.candidates
          .map((candidate, index) => renderCandidateCard(review, candidate, index))
          .join('');

  return renderBackofficeShell({
    active: 'reviews',
    title: `TMDB Review #${escapeHtml(review.id)}`,
    eyebrow: 'Catalog decision',
    descriptionHtml: `
      <div class="toolbar-summary">
        ${renderReasonBadge(review.reason)}
        ${renderStatusBadge(review.status)}
        <span>Updated ${escapeHtml(formatBackofficeDateTime(review.updatedAt))}</span>
      </div>
    `,
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
            <div><dt>TMDB</dt><dd>${renderCurrentTMDBValue(review.currentMovie?.tmdb_id)}</dd></div>
            <div><dt>Matched at</dt><dd>${escapeHtml(formatBackofficeDateTime(review.currentMovie?.tmdb_matched_at))}</dd></div>
          </dl>
          <div class="decision-brief">
            <span class="small-note">Current match confidence</span>
            <strong>${escapeHtml(formatPercent(review.currentMovie?.tmdb_match_confidence ?? null))}</strong>
            ${renderConfidenceMeter(review.currentMovie?.tmdb_match_confidence ?? null)}
          </div>
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
  const details: Record<
    Exclude<TMDBMatchReviewAction, 'apply_candidate'>,
    {
      className: string;
      description: string;
      buttonClass: string;
    }
  > = {
    reject: {
      buttonClass: 'danger',
      className: 'reject',
      description: 'Mark this review as ignored when candidates are wrong or not useful.',
    },
    defer: {
      buttonClass: 'secondary',
      className: 'defer',
      description: 'Keep it out of the active queue until more catalog context exists.',
    },
    reopen: {
      buttonClass: 'quiet',
      className: 'reopen',
      description: 'Move a deferred or ignored review back into active operator work.',
    },
  };
  const detail = details[action];

  return `
    <article class="decision-card ${escapeAttribute(detail.className)}">
      <div class="decision-card-header">
        <span class="decision-title">${escapeHtml(label)}</span>
        <span class="small-note">${escapeHtml(detail.description)}</span>
      </div>
      <form class="action-form" method="post" action="/tmdb-reviews/${escapeAttribute(review.id)}/actions">
        <input type="hidden" name="action" value="${escapeAttribute(action)}" />
        <label>Decision note
          <input name="note" maxlength="500" placeholder="Optional rationale" ${disabled ? 'disabled' : ''} />
        </label>
        <button class="button ${escapeAttribute(detail.buttonClass)}" type="submit" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>
      </form>
    </article>
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
app.use('/assets', express.static(ASSET_DIR, { immutable: true, maxAge: '1h' }));
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
    const result = await performCatalogRepairAction(request);

    if (wantsJsonResponse(request)) {
      response.status(result.status === 'queued' ? 200 : 503).json({
        ok: result.status === 'queued',
        status: result.status,
        message: catalogRepairMessage(result.status),
        issueKey: result.issueKey,
        movieId: result.movieId,
        job: result.job,
      });
      return;
    }

    response.redirect(303, result.status === 'queued' ? '/?repair=queued' : '/?repair=unavailable');
  } catch (error) {
    logger.error('Failed to apply catalog-health repair action', { err: error });
    if (wantsJsonResponse(request)) {
      response.status((error as Error & { statusCode?: number }).statusCode ?? 500).json({
        ok: false,
        status: 'failed',
        message:
          error instanceof Error && error.message
            ? error.message
            : 'Catalog repair action failed. Check backoffice logs for details.',
      });
      return;
    }
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
