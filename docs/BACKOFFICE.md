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

The deployment model should match `apps/bull-board`:

- build and publish a separate container image, for example
  `ghcr.io/shchilkin/popchoice/backoffice`;
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
  missing cast/director/genre/keyword coverage.
- [#550](https://github.com/shchilkin/PopChoice/issues/550): TMDB match review
  queue for `tmdb_match_reviews` rows.

Mutation flows belong later:

- [#551](https://github.com/shchilkin/PopChoice/issues/551): review actions and
  audit history for applying, rejecting, or deferring catalog fixes.

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
- `services/movie-backfill` can keep the CLI entrypoint for `catalog:health`,
  but shared catalog-health query logic should move behind a shared module
  before the browser UI duplicates complex SQL.
- `apps/web` remains user-facing and should not import or host admin review UI.
- `apps/bull-board` remains the queue monitoring app; shared auth should wrap
  it instead of merging it with backoffice.

## Local Development

Once the app exists, use workspace scripts that mirror the other apps:

```bash
npm run dev --workspace=apps/backoffice
npm run build --workspace=apps/backoffice
npm run start --workspace=apps/backoffice
```

The local app should read the root `.env` through the same environment-copying
workflow as the rest of the repository. It will need at least:

- `DATABASE_URL` for catalog-health and TMDB review data;
- `REDIS_URL` only when a screen needs queue state or job actions;
- `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` when testing protected
  operator routes locally.

## Production Deployment

When implemented, add a `backoffice` service to `coolify.compose.yml` beside
`bull-board`:

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
behavior.

## Preview Policy

Do not expose backoffice on every PR preview by default. If a PR needs manual
backoffice testing, add a temporary preview domain intentionally and remove it
after review. This keeps admin surfaces quieter and avoids certificate churn
from operational tools.
