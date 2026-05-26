import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getCatalogHealthReport,
  initDatabase,
  logger,
  operatorAuthChallenge,
  readOperatorAuthConfig,
  verifyOperatorBasicAuthHeader,
} from '@pop-choice/shared';
import type {
  CatalogHealthIssue,
  CatalogHealthReport,
  CatalogMovieSample,
  DuplicateIdentityGroup,
  OperatorAuthConfig,
} from '@pop-choice/shared';

const DEFAULT_PORT = 3000;
const DEFAULT_SAMPLE_LIMIT = 5;
const DEFAULT_STALE_AFTER_DAYS = 180;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_OPERATOR_AUTH_RATE_LIMIT_MAX = 30;

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

function renderSampleRows(samples: CatalogMovieSample[]): string {
  if (samples.length === 0) {
    return '<p class="empty">No sample records returned.</p>';
  }

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
      ${issue.count === 0 ? '<p class="empty">No affected movies.</p>' : renderSampleRows(issue.samples)}
    </section>
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

function renderCatalogHealthPage(report: CatalogHealthReport): string {
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
          @media (max-width: 900px) {
            main { padding: 18px; }
            header, .actions { flex-direction: column; align-items: stretch; }
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
          </div>
        </main>
      </body>
    </html>`;
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

const app = express();

app.set('trust proxy', 1);
app.get('/healthz', (_request, response) => response.status(200).send('ok'));
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

app.get('/', async (_request, response) => {
  try {
    const report = await getCatalogHealthReport({ sampleLimit, staleAfterDays });
    response.type('html').send(renderCatalogHealthPage(report));
  } catch (error) {
    logger.error('Failed to render catalog health report', { err: error });
    response.status(500).type('html').send(renderErrorPage(error));
  }
});

app.listen(port, '0.0.0.0', () => {
  logger.info('Backoffice listening', { port, sampleLimit, staleAfterDays });
});
