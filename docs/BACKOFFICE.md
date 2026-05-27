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
  state.
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
```

Run `npm run copy:env` after editing root `.env`; it copies values into
`apps/backoffice/.env` for the local dev script. The app needs:

- `DATABASE_URL` for catalog-health and TMDB review data;
- `REDIS_URL` for catalog-health repair actions because they enqueue
  `catalog-maintenance` jobs rather than mutating catalog rows inline;
- `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` when testing protected
  operator routes locally;
- `CATALOG_HEALTH_SAMPLE_LIMIT` and `CATALOG_HEALTH_STALE_DAYS` when tuning the
  report shape.

## Catalog Repair Workflow

The catalog-health home page shows sample rows for missing metadata and stale
TMDB coverage. Repairable rows have a `Queue backfill` button. This is
intentionally conservative:

- the button queues the same `backfill-movie` job that workers already process
  through the `catalog-maintenance` queue;
- duplicate identity groups remain read-only because they can require manual
  merge decisions;
- backoffice stores the movie snapshot and queue result in
  `catalog_repair_audit`, which gives operators a recovery trail without
  editing the catalog directly from the HTML form.

If a queued repair does not resolve the row, use Bull Board to inspect the job,
check worker logs, and rerun the backfill or TMDB review flow manually. Prefer a
manual migration only when the issue is an identity conflict rather than missing
or stale metadata.

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
- newest, oldest, and highest-risk sorting.
- readable UTC timestamps for generated reports, queue updates, match dates, and
  audit history.

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

## Production Deployment

`coolify.compose.yml` includes a `backoffice` service beside `bull-board`:

```yaml
backoffice:
  image: ${APP_IMAGE_PREFIX:-ghcr.io/shchilkin/popchoice}/backoffice:${IMAGE_TAG:-development}
  pull_policy: always
  restart: unless-stopped
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
`OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS`.

## Preview Policy

Do not expose backoffice on every PR preview by default. If a PR needs manual
backoffice testing, add a temporary preview domain intentionally and remove it
after review. This keeps admin surfaces quieter and avoids certificate churn
from operational tools.
