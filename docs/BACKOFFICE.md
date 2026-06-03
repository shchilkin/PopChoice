---
title: 'Backoffice Plan'
---

# Backoffice Plan

PopChoice backoffice work is tracked under
[#493](https://github.com/shchilkin/PopChoice/issues/493). The backoffice is an
operational app for catalog health, TMDB match review, and later manual data
repair. It must not be implemented inside the user-facing `apps/web` app.

## Boundary Decision

Use a dedicated workspace app:

```text
apps/backoffice/
```

The deployment model matches `apps/bull-board`:

- build and publish a separate `ghcr.io/shchilkin/popchoice/backoffice`
  container image;
- run it as a separate `backoffice` service in `coolify.compose.yml`;
- expose container port `3000`;
- assign a private/admin Coolify domain; shared operator auth can stay optional
  until the full role-based backoffice model is ready;
- pin it with the same `IMAGE_TAG` release bundle as `web`, `workers`,
  `bull-board`, and `docs`.

The backoffice should be treated as an operator surface, not a product route.
It can use the same database and Redis network as the app stack, but it should
own its own UI, API boundaries, process command, health check, and deployment
configuration.

The first implementation used Express with server-rendered HTML because it was
the fastest way to validate the operator model. The dedicated boundary now runs
as a Next.js app from [#596](https://github.com/shchilkin/PopChoice/issues/596),
while keeping the same external routes, container port, health check, and
Coolify service. New interactive operator workflows should use React/Next route
handlers and shared PopChoice UI conventions instead of adding hand-written
HTML pages.

## Initial Scope

The first backoffice release should be read-only:

- [#549](https://github.com/shchilkin/PopChoice/issues/549): catalog-health
  overview for missing metadata, duplicate identities, stale TMDB data, and
  missing cast/director/genre/keyword coverage. This is implemented as the
  first read-only `apps/backoffice` screen.
- [#550](https://github.com/shchilkin/PopChoice/issues/550): TMDB match review
  queue for `tmdb_match_reviews` rows. This is implemented as a protected queue
  and detail view with status/reason filters, risk sorting, local-vs-candidate
  comparison, and graceful empty states.
- [#566](https://github.com/shchilkin/PopChoice/issues/566): TMDB review queue
  decision UX polish. The queue and detail pages use branded toolbar controls,
  consistent status/reason badges, candidate confidence bars, warning signals,
  and distinct apply/reject/defer/reopen action hierarchy.

Mutation flows are deliberately narrow:

- [#551](https://github.com/shchilkin/PopChoice/issues/551): review actions and
  audit history for applying, rejecting, or deferring catalog fixes. The first
  slice supports `apply_candidate`, `reject`, `defer`, and `reopen` for TMDB
  match reviews. Applying a candidate updates only the movie TMDB identity
  fields (`tmdb_id`, `tmdb_match_confidence`, `tmdb_match_source`,
  `tmdb_matched_at`, and `localized_name` only when it is currently empty).
  Richer metadata still comes from backfill/discovery refreshes.
- [#559](https://github.com/shchilkin/PopChoice/issues/559): catalog-health
  repair actions are implemented as audited, queued repairs. The first slice
  adds a per-sample `Queue backfill` action on repairable catalog-health issues.
  It writes a `backfill-movie` job into the `catalog-maintenance` queue and
  records actor, issue key, movie snapshot, queue/job result, optional note, and
  timestamp in `catalog_repair_audit`.
- [#592](https://github.com/shchilkin/PopChoice/issues/592): repair actions are
  progressively enhanced. Operators get pending, accepted, unavailable, and
  error states without a full page reload, successful enqueue attempts disable
  the clicked action, and the accepted sample row is removed from the visible
  table.
  The non-JavaScript form redirect flow remains available.
- [#593](https://github.com/shchilkin/PopChoice/issues/593): repairable
  catalog-health panels can queue a bounded batch of `backfill-movie` jobs from
  the current issue group. Bulk enqueueing preserves the same
  `catalog-maintenance` worker pacing, uses deterministic job ids for dedupe,
  confirms the operator intent in the enhanced UI, reports partial enqueue
  results explicitly, and records a grouped `bulk_enqueue_backfill` audit
  summary with accepted, already queued, unavailable, and failed counts.
- [#572](https://github.com/shchilkin/PopChoice/issues/572): bulk repair
  attempts now create durable `catalog_repair_batches` and
  `catalog_repair_batch_items` rows before enqueueing BullMQ jobs. The audit row
  stays immutable and links back to the batch, while the batch/item tables are
  the Postgres source of truth for enqueue and worker progress after BullMQ
  history is trimmed.
- [#574](https://github.com/shchilkin/PopChoice/issues/574): completed repair
  jobs re-check the original catalog-health predicate before finalizing durable
  item status. This separates "the worker finished" from "the catalog issue is
  resolved" in batch history.
- [#575](https://github.com/shchilkin/PopChoice/issues/575): durable repair
  batches are browsable from the backoffice at `/repair-batches`, with a detail
  view for per-movie item status, queue metadata, and worker errors.
- [#627](https://github.com/shchilkin/PopChoice/issues/627): the backoffice has
  a native read-only `catalog-maintenance` queue view at `/queue`, with BullMQ
  state filters, compact job payload summaries, queue counts, and links to
  related movies or repair batches.
- [#630](https://github.com/shchilkin/PopChoice/issues/630): full-issue
  `Queue all` repair actions create a durable batch immediately, enqueue an
  `enqueue-catalog-repair-batch` orchestration job, and let workers create batch
  items plus bounded `backfill-movie` jobs in chunks.
- Catalog-health operators can jump from backoffice to Bull Board when
  `BULL_BOARD_URL` is configured, queue the next bounded repair batch, or
  manually enqueue a single movie when automatic grouping misses a case.

Shared operator auth is the login model for public exposure:

- [#548](https://github.com/shchilkin/PopChoice/issues/548): shared login
  protection for `apps/backoffice` and `apps/bull-board`.
- `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` protect Bull Board now
  and should be reused by the future backoffice app.
- User-facing app login stays separate; operator credentials must not be added
  to normal `apps/web` routes.

## Code Sharing

Use shared boundaries deliberately:

- `apps/backoffice` owns operator pages, forms, tables, route handlers, and UI
  state. Its long-term framework direction is a dedicated Next.js app, not an
  Express HTML renderer and not routes inside `apps/web`.
- `packages/shared` is the preferred home for cross-app database/query helpers
  once both backoffice and services need the same behavior.
- `services/movie-backfill` keeps the CLI entrypoint for `catalog:health`, but
  shared catalog-health query logic now lives in `packages/shared` so the
  browser UI and CLI use the same SQL semantics.
- `apps/web` remains user-facing and should not import or host admin review UI.
- `apps/bull-board` remains the queue monitoring app; shared auth should wrap
  it instead of merging it with backoffice.

## Local Development

Use workspace scripts that mirror the other apps:

```bash
npm run dev:backoffice
npm run build:backoffice
npm run start --workspace=apps/backoffice
npm run quality:backoffice
```

Run `npm run copy:env` after editing root `.env`; it copies values into
`apps/backoffice/.env` for the local dev script. Local dev defaults to port
`3004`; use `PORT=4030 npm run dev:backoffice` when you want a specific port.
Use `npm run quality:backoffice` before publishing broad backoffice changes; it
runs the module-size guard that keeps app routes, operator panels, and queue
helpers split into reviewable files.
The app needs:

- `DATABASE_URL` for catalog-health and TMDB review data;
- `REDIS_URL` for catalog-health repair actions because they enqueue
  `catalog-maintenance` jobs rather than mutating catalog rows inline;
- `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` when testing protected
  operator routes locally;
- `CATALOG_HEALTH_SAMPLE_LIMIT` and `CATALOG_HEALTH_STALE_DAYS` when tuning the
  report shape.

## Catalog Repair Workflow

The catalog-health home page shows sample rows for missing metadata and stale
TMDB coverage. Each issue panel can also browse affected rows with server-side
pagination, preserving the selected issue, page, page size, and table anchor in
the URL. Repairable rows have a `Queue backfill` button, and repairable issue
panels can queue a bounded "next batch" of affected movies. This is
intentionally conservative:

- one-off and bulk buttons queue the same `backfill-movie` job that workers
  already process through the `catalog-maintenance` queue;
- bulk actions are capped, start from the first affected rows for the issue
  group, and rely on existing worker-side TMDB/OpenAI pacing rather than
  bypassing rate limits;
- full-issue `Queue all` uses a durable background orchestration job instead of
  a long operator HTTP request. The HTTP action creates the batch and queues the
  orchestration job; workers then create batch items and child `backfill-movie`
  jobs in chunks;
- deterministic `backfill-<movieId>` job ids let the action report deduped jobs
  instead of enqueueing duplicate in-flight work; completed and failed retained
  jobs are removed before retrying so stale BullMQ history does not block future
  repairs;
- duplicate identity groups remain read-only in the UI until the operator merge
  workflow lands, but shared support can now preview canonical/loser snapshots,
  affected rows, user-memory conflicts, and warnings, then apply an audited
  transactional merge when a future screen submits an explicit operator action;
- duplicate merge executions write immutable history to
  `catalog_duplicate_merge_audit`, including the pre-merge dry-run snapshot,
  rewired row counts, deleted loser movie ids, and any preserved conflicting
  TMDB review rows;
- `manual_review_required` means the helper found risk that should be reviewed
  before deleting loser rows, such as mismatched TMDB ids, conflicting title/year
  identity, warnings, or user-memory conflicts. `allowManualReviewRequired`
  is the explicit operator override for those blocked merges; before using it,
  compare the canonical and loser snapshots, affected row counts, warnings,
  user-memory conflicts, and expected audit payload. The enforced behavior is
  covered by `packages/shared/src/catalogDuplicateMerge.test.ts` in the
  `allowManualReviewRequired` rejection path.
- backoffice stores immutable audit rows in `catalog_repair_audit` and durable
  bulk progress in `catalog_repair_batches` plus `catalog_repair_batch_items`,
  which gives operators a recovery trail without depending on retained BullMQ
  jobs;
- workers advance durable item status from `queued`/`deduped` (shown as
  "accepted" and "already queued") to `processing`, `completed_resolved` (shown
  as "issue cleared"), `completed_unresolved` (shown as "still flagged"),
  `skipped`, or final `failed` when a repair job carries `repairBatchId` and
  `repairBatchItemId`;
- the queue page at `/queue` shows a read-only BullMQ lens for the
  `catalog-maintenance` queue, including waiting, active, scheduled, failed, and
  completed jobs with compact payload fields;
- the queue page listens to BullMQ `QueueEvents` through a server-sent events
  stream and applies the current queue snapshot for the active filter/page
  directly in the browser, so waiting, active, completed, failed, delayed, and
  stalled job changes update the operator view without waiting for manual
  refresh or a full page reload;
- the catalog-health home uses a dedicated server-sent events stream that pushes
  the live DB and queue snapshot after catalog-maintenance changes. Its status,
  queue counts, and summary cards update directly from the live snapshot, with a
  slower background check only as a reconnect fallback;
- the repair batch history page at `/repair-batches` shows recent durable batch
  attempts and links to per-item details, so operators do not need to infer
  batch state from Bull Board history alone;
- the repair batch history page supports status and recovery-priority sorting,
  while batch detail pages can filter item rows to needs-review, failed,
  in-progress, still-flagged, or all work;
- batch item rows link back to the catalog-health issue anchor and movie detail
  page, and surface queue name, job name, job id, latest error, and retry
  pressure without requiring raw JSON first;
- the recent repair audit is paginated so large repair histories do not render
  as one long operator table.

If an accepted repair does not resolve the row, use Bull Board to inspect the
job, check worker logs, and rerun the backfill or TMDB review flow manually.
Prefer a manual migration only when the issue is an identity conflict rather
than missing or stale metadata.

Recommended repair-batch recovery flow:

1. Open `/repair-batches?sort=needs_review` and filter to `Partial` or
   `Failed` batches first.
2. Open a batch and keep the default `Needs review` item filter. It focuses on
   failed enqueue attempts, unavailable Redis work, and jobs that completed but
   left the original catalog-health issue still flagged.
3. For `unavailable` or `enqueue_failed` items, confirm `REDIS_URL`, worker
   health, and BullMQ logs before retrying the specific movie.
4. For `completed_unresolved` items, open the linked movie detail and
   catalog-health issue anchor. Treat it as a data-quality investigation, not a
   queue failure.
5. For `in_progress` items, wait for the realtime queue page or Bull Board to
   show terminal state before adding more work for the same issue.
6. For `enqueueing` batches with no item rows yet, inspect the queue page for
   the `enqueue-catalog-repair-batch` job. If it failed, retry the batch only
   after checking Redis and worker logs.

The auto-refresh UI treats enqueue success as "work accepted", not "catalog
fixed". It removes the clicked sample row to keep the operator surface
responsive, but the issue count still comes from the next catalog-health report
after workers update the database.

## TMDB Review Workflow

The TMDB review queue lives at:

```text
/tmdb-reviews
```

The queue shows `tmdb_match_reviews` rows with:

- local movie identity and current TMDB assignment;
- review reason (`ambiguous_match` or `runtime_mismatch`);
- status (`open`, `deferred`, `resolved`, or `ignored`);
- captured TMDB candidate ids, titles, release years, and confidence scores;
- newest, oldest, and highest-risk sorting;
- server-side pagination that preserves status, reason, sort, page, and page
  size in the URL so large queues do not render all rows at once;
- operator-friendly timestamps for generated reports, queue updates, match
  dates, and audit history.

The detail page compares the current local row with every captured candidate.
Malformed or partial candidate JSON is shown defensively instead of breaking the
page. Operators can:

- apply a selected candidate, which runs in a transaction, checks for duplicate
  `tmdb_id` ownership, updates the local movie identity fields, marks the review
  `resolved`, and writes an audit row;
- reject a row, which marks it `ignored` and writes an audit row;
- defer a row, which marks it `deferred` and writes an audit row;
- reopen a row, which returns it to `open` and writes an audit row.

Audit entries are stored in `tmdb_match_review_audit` with actor, action,
previous status, new status, selected candidate, optional note, and timestamp.
If a bad manual decision is made, reopen the review, correct the movie row via a
safe migration/manual SQL change, and rerun the relevant backfill/discovery job
so richer metadata can be refreshed consistently.

## Visual QA Checklist

Backoffice UI changes should include a short visual QA pass before review. Use
the deployed admin domain when validating a deployment fix, or run locally with:

```bash
PORT=4030 npm run dev:backoffice
```

Capture or inspect the same pages at desktop and narrow widths:

- desktop: 1440 by 1000;
- narrow/mobile: 390 by 900.

Cover these operator states:

- catalog health home at `/`, including populated issue cards, table rows,
  empty/healthy states when available, and the `?repair=queued`,
  `?repair=unavailable`, and `?repair=failed` notices. Also check paginated
  catalog issue rows with `?issue=missing_poster_url&issuePage=2` and repair
  audit pages with `?auditPage=2`;
- TMDB review queue at `/tmdb-reviews`, including open, deferred, resolved, and
  ignored status filters when data exists, plus paginated states such as
  `?page=2` and narrow table scrolling;
- TMDB review detail pages for at least one open or deferred review, including
  apply, reject, defer, reopen, and note-entry states where practical;
- catalog movie detail pages at `/movies/[id]`, including identity header,
  poster/placeholder states, active and resolved health flags, local/TMDB
  metadata, people/taxonomy tables, duplicate context, related reviews, repair
  audit rows, and the branded missing-movie 404.

Check that:

- the PopChoice brand icon loads and the page does not duplicate the document
  title;
- generated, updated, matched, and audit timestamps use readable operator time;
- pages do not create unintended horizontal viewport scroll. Wide data tables
  may scroll inside their table container only;
- long movie titles, TMDB ids, reason/status labels, notes, and error messages
  wrap without covering neighboring controls;
- buttons, links, selects, text inputs, and radios have visible focus states;
- hover states and status badges do not shift the layout;
- destructive, deferral, reopen, and primary apply actions remain visually
  distinct;
- disabled or unavailable actions explain why the operator cannot proceed.

When a PR changes backoffice layout, branding, forms, tables, or action states,
attach representative screenshots to the PR notes instead of committing one-off
screenshots. At minimum include catalog health, review queue, and review detail
screenshots for both widths.

## Production Deployment

`coolify.compose.yml` includes a `backoffice` service beside `bull-board`:

```yaml
backoffice:
  image: ${APP_IMAGE_PREFIX:-ghcr.io/shchilkin/popchoice}/backoffice:${IMAGE_TAG:-development}
  pull_policy: always
  restart: unless-stopped
  command:
    [
      'npm',
      'run',
      'start',
      '--workspace=apps/backoffice',
      '--',
      '--hostname',
      '0.0.0.0',
      '--port',
      '3000',
    ]
  environment:
    NODE_ENV: production
    DATABASE_URL: postgresql://${POSTGRES_USER:-popchoice}:${POSTGRES_PASSWORD}@${SERVICE_NAME_DB:-db}:5432/${POSTGRES_DB:-popchoice}
    REDIS_URL: redis://${SERVICE_NAME_REDIS:-redis}:6379
    PORT: 3000
    OPERATOR_AUTH_REQUIRED: ${OPERATOR_AUTH_REQUIRED:-0}
    OPERATOR_AUTH_USERNAME: ${OPERATOR_AUTH_USERNAME:-}
    OPERATOR_AUTH_PASSWORD: ${OPERATOR_AUTH_PASSWORD:-}
    OPERATOR_AUTH_REALM: ${OPERATOR_AUTH_REALM:-PopChoice Operators}
    OPERATOR_AUTH_RATE_LIMIT_MAX: ${OPERATOR_AUTH_RATE_LIMIT_MAX:-30}
    OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS: ${OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS:-900}
    BULL_BOARD_URL: ${BULL_BOARD_URL:-}
    CATALOG_HEALTH_SAMPLE_LIMIT: ${CATALOG_HEALTH_SAMPLE_LIMIT:-5}
    CATALOG_HEALTH_STALE_DAYS: ${CATALOG_HEALTH_STALE_DAYS:-180}
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_healthy
  expose:
    - '3000'
```

In Coolify, assign a private/admin domain to `backoffice` with port `3000`,
just like `bull-board`. During the pet-project phase, operator auth can be
optional; set `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` when you want
the shared login prompt, or set `OPERATOR_AUTH_REQUIRED=1` for fail-closed
behavior. The shared Bull Board/backoffice rate limiter counts unsuccessful
requests only and can be tuned with `OPERATOR_AUTH_RATE_LIMIT_MAX` and
`OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS`. Set `BULL_BOARD_URL` to the Bull
Board operator domain when you want the backoffice queue panel to open the live
queue dashboard directly.

## Preview Policy

Do not expose backoffice on every PR preview by default. If a PR needs manual
backoffice testing, add a temporary preview domain intentionally and remove it
after review. This keeps admin surfaces quieter and avoids certificate churn
from operational tools.
