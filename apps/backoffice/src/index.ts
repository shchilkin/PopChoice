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
  readOperatorAuthConfig,
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

const DEFAULT_PORT = 3000;
const DEFAULT_SAMPLE_LIMIT = 5;
const DEFAULT_STALE_AFTER_DAYS = 180;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX = 30;
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

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}".`);
  }

  return parsed;
}

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

function renderNav(active: 'health' | 'reviews'): string {
  return `
    <nav class="nav" aria-label="Backoffice sections">
      <a class="${active === 'health' ? 'active' : ''}" href="/">Catalog health</a>
      <a class="${active === 'reviews' ? 'active' : ''}" href="/tmdb-reviews">TMDB reviews</a>
    </nav>
  `;
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

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="refresh" content="60" />
        <title>PopChoice Backoffice</title>
        <style>
          :root {
            color-scheme: dark;
            --bg: #101214;
            --surface: #171a1f;
            --surface-2: #1f242b;
            --border: #333a44;
            --text: #f1f4f8;
            --muted: #a8b0bc;
            --good: #34c759;
            --warn: #ffcc00;
            --bad: #ff453a;
            --accent: #64d2ff;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: var(--bg);
            color: var(--text);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.5;
          }
          main { max-width: 1440px; margin: 0 auto; padding: 28px; }
          header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
          h2 { margin: 0; font-size: 16px; letter-spacing: 0; }
          .muted { color: var(--muted); }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          }
          .nav {
            display: flex;
            gap: 8px;
            margin: 0 0 18px;
          }
          .nav a {
            color: var(--muted);
            text-decoration: none;
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 7px 10px;
            background: #15181d;
            font-weight: 600;
          }
          .nav a.active {
            color: var(--text);
            border-color: var(--accent);
            background: color-mix(in srgb, var(--accent), #15181d 85%);
          }
          .stat, .panel {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
          }
          .stat { padding: 14px 16px; }
          .stat-label { display: block; color: var(--muted); font-size: 13px; }
          .stat-value { display: block; font-size: 28px; font-weight: 700; margin-top: 4px; }
          .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
          .panel { overflow: hidden; }
          .panel.needs-work { border-color: color-mix(in srgb, var(--warn), var(--border) 60%); }
          .panel.healthy { border-color: color-mix(in srgb, var(--good), var(--border) 70%); }
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
            background: #2d333d;
            font-weight: 700;
          }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { padding: 9px 10px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
          th { color: var(--muted); font-weight: 600; background: #15181d; }
          tr:last-child td { border-bottom: 0; }
          .empty { margin: 0; padding: 14px; color: var(--muted); }
          .duplicate-group { padding: 12px 14px; border-bottom: 1px solid var(--border); }
          .duplicate-group:last-child { border-bottom: 0; }
          .duplicate-heading { display: flex; justify-content: space-between; gap: 12px; color: var(--accent); }
          .duplicate-group ul { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 4px; }
          .duplicate-group li { display: grid; grid-template-columns: 80px minmax(180px, 1fr) 120px; gap: 10px; color: var(--muted); }
          .actions { display: flex; gap: 10px; align-items: center; }
          .button {
            color: var(--text);
            text-decoration: none;
            border: 1px solid var(--border);
            background: var(--surface-2);
            border-radius: 6px;
            padding: 8px 12px;
            font-weight: 600;
          }
          .button.small { padding: 5px 8px; font-size: 12px; }
          .repair-form { margin: 0; }
          .notice {
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 18px;
            background: var(--surface);
            font-weight: 600;
          }
          .notice.good { border-color: color-mix(in srgb, var(--good), var(--border) 45%); }
          .notice.warn { border-color: color-mix(in srgb, var(--warn), var(--border) 45%); }
          @media (max-width: 900px) {
            main { padding: 18px; }
            header, .actions, .nav { flex-direction: column; align-items: stretch; }
            .summary { grid-template-columns: 1fr 1fr; }
            table { display: block; overflow-x: auto; white-space: nowrap; }
            .duplicate-group li { grid-template-columns: 1fr; gap: 2px; }
          }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <h1>PopChoice Catalog Health</h1>
              <div class="muted">Generated ${escapeHtml(report.generatedAt)}. Refreshes every 60 seconds.</div>
            </div>
            <div class="actions">
              <a class="button" href="/">Refresh</a>
            </div>
          </header>
          ${renderNav('health')}
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
        </main>
      </body>
    </html>`;
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
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TMDB Reviews · PopChoice Backoffice</title>
        <style>${renderReviewStyles()}</style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <h1>TMDB Match Reviews</h1>
              <div class="muted">Review ambiguous TMDB candidates and runtime confidence cases before changing catalog data.</div>
            </div>
            <div class="actions">
              <a class="button" href="/tmdb-reviews">Reset</a>
            </div>
          </header>
          ${renderNav('reviews')}
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
        </main>
      </body>
    </html>`;
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

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TMDB Review #${escapeHtml(review.id)} · PopChoice Backoffice</title>
        <style>${renderReviewStyles()}</style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <h1>TMDB Review #${escapeHtml(review.id)}</h1>
              <div class="muted">${escapeHtml(renderReason(review.reason))} · ${escapeHtml(renderStatus(review.status))} · updated ${escapeHtml(review.updatedAt)}</div>
            </div>
            <div class="actions">
              <a class="button" href="/tmdb-reviews">Back to queue</a>
            </div>
          </header>
          ${renderNav('reviews')}
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
        </main>
      </body>
    </html>`;
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

function renderReviewStyles(): string {
  return `
    :root {
      color-scheme: dark;
      --bg: #101214;
      --surface: #171a1f;
      --surface-2: #1f242b;
      --border: #333a44;
      --text: #f1f4f8;
      --muted: #a8b0bc;
      --good: #34c759;
      --warn: #ffcc00;
      --bad: #ff453a;
      --accent: #64d2ff;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; }
    main { max-width: 1440px; margin: 0 auto; padding: 28px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 0; font-size: 16px; letter-spacing: 0; }
    h3 { margin: 0 0 8px; font-size: 15px; letter-spacing: 0; }
    a { color: var(--accent); }
    .muted { color: var(--muted); }
    .nav, .actions, .decision-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .nav { margin: 0 0 18px; }
    .nav a, .button { color: var(--text); text-decoration: none; border: 1px solid var(--border); border-radius: 6px; padding: 7px 10px; background: var(--surface-2); font-weight: 600; }
    .nav a { color: var(--muted); background: #15181d; }
    .nav a.active { color: var(--text); border-color: var(--accent); background: color-mix(in srgb, var(--accent), #15181d 85%); }
    .button { cursor: pointer; }
    .button.primary { border-color: var(--accent); }
    .button.small { padding: 5px 8px; font-size: 12px; }
    .button:disabled, input:disabled { opacity: 0.5; cursor: not-allowed; }
    .filters { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; margin-bottom: 18px; }
    label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; font-weight: 600; }
    select, input { color: var(--text); background: #15181d; border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; min-width: 180px; }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
    .panel-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; background: var(--surface-2); border-bottom: 1px solid var(--border); }
    .count { min-width: 48px; text-align: center; border-radius: 999px; padding: 3px 10px; background: #2d333d; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 10px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; background: #15181d; }
    tr:last-child td { border-bottom: 0; }
    .empty { margin: 0; padding: 14px; color: var(--muted); }
    .pill, .status { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px; background: #2d333d; font-size: 12px; font-weight: 700; }
    .status.open { color: var(--warn); }
    .status.resolved { color: var(--good); }
    .status.ignored { color: var(--bad); }
    .status.deferred { color: var(--accent); }
    .detail-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr); gap: 14px; }
    .facts, .candidate dl { margin: 0; padding: 14px; display: grid; gap: 8px; }
    .facts div, .candidate dl div { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 12px; }
    dt { color: var(--muted); font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .copy { padding: 14px; }
    .candidates { display: grid; gap: 12px; padding: 14px; }
    .candidate { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(240px, 360px); gap: 14px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
    .action-form { display: grid; gap: 8px; align-content: start; }
    @media (max-width: 900px) {
      main { padding: 18px; }
      header, .filters, .decision-actions, .nav, .candidate { flex-direction: column; align-items: stretch; display: flex; }
      .detail-grid { grid-template-columns: 1fr; }
      table { display: block; overflow-x: auto; white-space: nowrap; }
      .facts div, .candidate dl div { grid-template-columns: 1fr; gap: 2px; }
    }
  `;
}

function renderErrorPage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PopChoice Backoffice Error</title>
        <style>
          body { margin: 0; background: #101214; color: #f1f4f8; font-family: ui-sans-serif, system-ui, sans-serif; }
          main { max-width: 880px; margin: 0 auto; padding: 32px; }
          pre { white-space: pre-wrap; background: #171a1f; border: 1px solid #333a44; border-radius: 8px; padding: 16px; }
          a { color: #64d2ff; }
        </style>
      </head>
      <body>
        <main>
          <h1>Catalog health unavailable</h1>
          <p>The backoffice service is running, but the report could not be loaded.</p>
          <pre>${escapeHtml(message)}</pre>
          <p><a href="/">Retry</a></p>
        </main>
      </body>
    </html>`;
}

const port = parsePositiveInteger(process.env.PORT, DEFAULT_PORT);
const sampleLimit = parsePositiveInteger(
  process.env.CATALOG_HEALTH_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const staleAfterDays = parsePositiveInteger(
  process.env.CATALOG_HEALTH_STALE_DAYS,
  DEFAULT_STALE_AFTER_DAYS,
);
const operatorAuthRateLimitWindowSeconds = parsePositiveInteger(
  process.env.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS,
);
const operatorAuthRateLimitMax = parsePositiveInteger(
  process.env.OPERATOR_AUTH_RATE_LIMIT_MAX,
  DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX,
);
const operatorAuthConfig = readOperatorAuthConfig();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for the backoffice catalog-health report.');
}

initDatabase(databaseUrl);
await ensureCatalogRepairActionSchema();
await ensureTMDBMatchReviewActionSchema();

const app = express();

app.set('trust proxy', 1);
app.get('/healthz', (_request, response) => response.status(200).send('ok'));
app.use(express.urlencoded({ extended: false }));
app.use(
  rateLimit({
    windowMs: operatorAuthRateLimitWindowSeconds * 1000,
    limit: operatorAuthRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Too many backoffice requests, please try again later.',
  }),
);
app.use(createOperatorAuthMiddleware(operatorAuthConfig));

app.get('/', async (request, response) => {
  try {
    const [report, audit] = await Promise.all([
      getCatalogHealthReport({ sampleLimit, staleAfterDays }),
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

    const job = await enqueueCatalogBackfillMovieFromBackoffice({
      movieId,
      reason: getBackfillReasonForIssue(issueKey),
      language: process.env.TMDB_LANGUAGE,
    });

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

app.listen(port, '0.0.0.0', () => {
  logger.info('Backoffice listening', { port, sampleLimit, staleAfterDays });
});
