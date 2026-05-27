---
title: 'Environment Reference'
description: 'Canonical reference for PopChoice environment variables across local development, CI, deployment, services, and observability.'
---

# Environment Reference

This page is the canonical environment-variable reference for PopChoice. It
supports the documentation backlog in
[#515](https://github.com/shchilkin/PopChoice/issues/515) and implements
[#516](https://github.com/shchilkin/PopChoice/issues/516).

The root `.env` is the local source of truth. After changing it, run
`npm run copy:env` so `apps/web`, `packages/shared`, and services receive the
same values. For setup steps see [Setup](/docs/SETUP), [Coolify](/docs/COOLIFY),
[Services](/docs/SERVICES), [CI/CD](/docs/CI-CD),
[Observability Metrics](/docs/OBSERVABILITY-METRICS), and
[Observability Traces](/docs/OBSERVABILITY-TRACES).

Never commit plaintext secrets. Keep `.env` files, API keys, database passwords,
Redis credentials, session secrets, HMAC secrets, Resend tokens, Telegram bot
tokens, and Grafana passwords in a local secret store or deployment secret
manager. `NEXT_PUBLIC_*` values and build metadata are public by design.

Runtime entrypoints should validate environment variables with process-specific
plain Zod schemas in `packages/shared/src/runtimeConfig.ts`. This avoids a
single global config object while still making misconfigured operator services
fail early with actionable startup errors. The first rollout covers
`apps/backoffice` and `apps/bull-board`; new services should add their own
reader instead of parsing `process.env` inline.

## Runtime App

These variables are used by `apps/web`, workers, Bull Board, and shared runtime
helpers.

| Variable                                  | Owner / service                                 | Local / prod / CI                                                                                                      | Default / fallback                                                  | Notes                                                                                                       |
| ----------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                          | Web, workers, seed/discovery/backfill           | Required for realistic local/prod recommendations and embeddings; not required for deterministic CI evals/e2e          | None                                                                | Secret. Used for embeddings and recommendation text generation.                                             |
| `DATABASE_URL`                            | Web, workers, services, migrations, backoffice  | Required for app DB behavior; CI/e2e may use `E2E_DATABASE_URL` instead                                                | Local setup generates it                                            | Secret if it contains credentials. PostgreSQL must support pgvector.                                        |
| `REDIS_URL`                               | Web, workers, BullMQ, Bull Board, rate limiting | Optional local; required for queued recommendation flow in prod; e2e maps from `E2E_REDIS_URL`                         | Queue features disable or use limited inline fallback when missing  | Secret if it contains credentials. Backoffice needs it for queued catalog repair actions.                   |
| `TMDB_API_KEY`                            | Web, workers, services                          | Optional for local UI; required for TMDB enrichment, discovery, backfill, more picks, and production catalog freshness | None                                                                | Secret. Must be a TMDB v4 read access token for service/backfill flows.                                     |
| `NEXT_PUBLIC_TMDB_API_KEY`                | Browser                                         | Optional                                                                                                               | None                                                                | Public. Enables client-side poster enrichment only; do not put privileged secrets here.                     |
| `NEXT_PUBLIC_BASE_URL`                    | Web, auth, password reset, build info           | Optional local; required behind reverse proxy/prod                                                                     | Falls back to request origin or platform domain where supported     | Public. Use the browser-facing origin without a trailing slash.                                             |
| `LOG_LEVEL`                               | Web, workers, Bull Board, shared logger         | Optional everywhere                                                                                                    | `info`                                                              | Use `debug`, `info`, `warn`, or `error`.                                                                    |
| `NODE_ENV`                                | Next.js, auth, metrics, tracing                 | Set by framework/Docker/CI                                                                                             | `development` locally, `production` in images                       | Controls production auth strictness, secure cookies, and default metrics/tracing behavior.                  |
| `HOSTNAME`                                | Web container, tracing                          | Set by Docker/Coolify                                                                                                  | Container hostname                                                  | Used as OpenTelemetry `service.instance.id`; web binds to `0.0.0.0` in Compose.                             |
| `PORT`                                    | Web, Bull Board, backoffice, Storybook dev      | Optional                                                                                                               | Web/backoffice `3000`; Bull Board `4000` or script-specific default | In Coolify the public proxy usually routes to container port `3000`; static Storybook uses nginx port `80`. |
| `BULL_BOARD_PORT`                         | Bull Board scripts                              | Optional local                                                                                                         | `4000` in `apps/bull-board`, `3001` in app-local script             | Prefer `PORT` in container deployments.                                                                     |
| `OPERATOR_AUTH_USERNAME`                  | Bull Board, backoffice                          | Optional local; required for protected production operator surfaces                                                    | None                                                                | Basic Auth username for operational/admin UIs.                                                              |
| `OPERATOR_AUTH_PASSWORD`                  | Bull Board, backoffice                          | Optional local; required for protected production operator surfaces                                                    | None                                                                | Secret. Set with `OPERATOR_AUTH_USERNAME`; rotate like an admin password.                                   |
| `OPERATOR_AUTH_REALM`                     | Bull Board, backoffice                          | Optional                                                                                                               | `PopChoice Operators`                                               | Browser login prompt realm.                                                                                 |
| `OPERATOR_AUTH_REQUIRED`                  | Bull Board, backoffice                          | Optional                                                                                                               | `false`                                                             | Set `1` to fail startup when operator credentials are missing.                                              |
| `OPERATOR_AUTH_RATE_LIMIT_MAX`            | Bull Board, backoffice                          | Optional                                                                                                               | `30`                                                                | Maximum unsuccessful operator-surface requests per window. Successful requests are skipped.                 |
| `OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS` | Bull Board, backoffice                          | Optional                                                                                                               | `900`                                                               | Operator-surface auth rate-limit window in seconds.                                                         |

## Auth And Email

| Variable              | Owner / service                   | Local / prod / CI                                            | Default / fallback                                                                                  | Notes                                                                               |
| --------------------- | --------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `AUTH_SESSION_SECRET` | Web auth/session                  | Optional local; required in production when login is enabled | Falls back to `API_KEY_HMAC_SECRET`, then ephemeral dev secret outside production                   | Secret. Must stay stable across restarts or sessions/password-reset tokens break.   |
| `API_KEY_HMAC_SECRET` | API auth, password reset fallback | Required when `VALID_API_KEYS` is set; recommended prod      | None                                                                                                | Secret. Used to derive and verify API key digests.                                  |
| `VALID_API_KEYS`      | Protected API routes              | Optional local; required in production for API-key access    | Missing in dev disables API-key auth with a warning; missing in prod rejects protected API requests | Secret-ish digest list. Store scrypt digests, never plaintext API keys.             |
| `RESEND_API_KEY`      | Password reset email              | Optional local; required for production email delivery       | Local/dev can expose reset URL without sending email                                                | Secret.                                                                             |
| `EMAIL_FROM`          | Password reset email              | Required with `RESEND_API_KEY` in production                 | None                                                                                                | Public sender identity, but keep deployment config consistent with verified domain. |
| `EMAIL_REPLY_TO`      | Password reset email              | Optional                                                     | None                                                                                                | Public support/reply-to address.                                                    |

## Local Database And Migrations

| Variable                        | Owner / service                             | Local / prod / CI                | Default / fallback            | Notes                                                                                |
| ------------------------------- | ------------------------------------------- | -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| `POSTGRES_USER`                 | Local Docker, Coolify Postgres              | Generated locally; optional prod | `popchoice` in Coolify        | Secret only if reused as credential metadata.                                        |
| `POSTGRES_PASSWORD`             | Local Docker, Coolify Postgres              | Generated locally; required prod | None                          | Secret. Required before first Coolify deploy because PostgreSQL initializes with it. |
| `POSTGRES_DB`                   | Local Docker, Coolify Postgres              | Generated locally; optional prod | `popchoice` in Coolify        | Usually non-secret.                                                                  |
| `DB_MIGRATION_CONNECT_ATTEMPTS` | `apps/web/scripts/migrate-db.js`, e2e setup | Optional                         | `20`; e2e setup uses `30`     | Increase when DB startup is slow.                                                    |
| `DB_MIGRATION_CONNECT_DELAY_MS` | DB migration script, e2e setup              | Optional                         | `3000`; e2e setup uses `1000` | Delay between migration connection attempts.                                         |

## Workers And Catalog Services

These tune BullMQ workers and the standalone catalog services described in
[Services](/docs/SERVICES).

| Variable                            | Owner / service                                               | Local / prod / CI | Default / fallback                                                              | Notes                                                              |
| ----------------------------------- | ------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `WORKER_METRICS_PORT`               | Worker metrics server                                         | Optional          | `9464`                                                                          | Exposes `/metrics` from the worker process.                        |
| `CATALOG_MAINTENANCE_CONCURRENCY`   | Catalog-maintenance worker                                    | Optional          | `1`                                                                             | Keep low when TMDB rate limits matter.                             |
| `CATALOG_TMDB_REQUESTS_PER_WINDOW`  | Catalog-maintenance worker                                    | Optional          | `10`                                                                            | Shared TMDB request budget.                                        |
| `CATALOG_TMDB_RATE_LIMIT_WINDOW_MS` | Catalog-maintenance worker                                    | Optional          | `10000`                                                                         | Window for the shared TMDB budget.                                 |
| `CATALOG_TMDB_429_BACKOFF_MS`       | Catalog-maintenance worker                                    | Optional          | `30000`                                                                         | Backoff when TMDB returns `429` without `Retry-After`.             |
| `TMDB_SOURCES`                      | Discovery service, enqueue script                             | Optional          | All four TMDB sources in service; enqueue script defaults to its configured set | Comma-separated `now_playing,upcoming,top_rated,popular`.          |
| `MAX_PAGES_PER_SOURCE`              | Discovery service, enqueue script                             | Optional          | `3`                                                                             | TMDB pages per source.                                             |
| `MIN_VOTE_COUNT`                    | Discovery service, enqueue script                             | Optional          | `500`                                                                           | Quality filter.                                                    |
| `MIN_VOTE_AVERAGE`                  | Discovery service, enqueue script                             | Optional          | `6.5`                                                                           | Quality filter.                                                    |
| `MAX_MOVIES_PER_RUN`                | Discovery service                                             | Optional          | `50`                                                                            | Discovery insert/embedding cap per run.                            |
| `MAX_MOVIES_PER_PAGE`               | Discovery enqueue script                                      | Optional          | `20`                                                                            | Per-page enqueue cap for catalog maintenance.                      |
| `MAX_MOVIES`                        | Backfill service, enqueue script                              | Optional          | `0` means all for backfill; enqueue script defaults to `100`                    | Use for bounded runs.                                              |
| `TMDB_LANGUAGE`                     | Discovery/backfill/enqueue scripts, backoffice repair actions | Optional          | `en-US`                                                                         | TMDB locale tag such as `fi-FI` or `ru-RU`.                        |
| `SYNC_SCHEDULE`                     | Movie discovery service                                       | Optional          | `0 0 * * 0`                                                                     | Cron expression in UTC; empty value means one-shot mode.           |
| `BATCH_SIZE`                        | Movie backfill service                                        | Optional          | `5`                                                                             | Parallel TMDB detail requests per batch.                           |
| `MOVIES_FILE_PATH`                  | Movie seed service                                            | Optional          | `<cwd>/movies.txt`                                                              | Path for curated seed input.                                       |
| `DRY_RUN`                           | Seed/discovery/backfill services                              | Optional          | `false`                                                                         | Use `true` to log intended changes without writes where supported. |
| `CATALOG_HEALTH_FORMAT`             | Catalog health CLI                                            | Optional          | `text`                                                                          | Use `json` for machine-readable output.                            |
| `CATALOG_HEALTH_SAMPLE_LIMIT`       | Catalog health CLI/backoffice                                 | Optional          | `5`                                                                             | Sample rows/groups per issue.                                      |
| `CATALOG_HEALTH_STALE_DAYS`         | Catalog health CLI/backoffice                                 | Optional          | `180`                                                                           | Stale TMDB metadata threshold.                                     |

## CI And E2E

| Variable                            | Owner / service                  | Local / prod / CI        | Default / fallback                                         | Notes                                                                  |
| ----------------------------------- | -------------------------------- | ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `CI`                                | GitHub Actions, Playwright, lint | Set by GitHub Actions    | False locally                                              | Changes retries, reporters, `forbidOnly`, and console lint strictness. |
| `E2E_PORT`                          | Playwright e2e                   | Optional local/CI        | `3100`                                                     | Port for the test web server.                                          |
| `E2E_BASE_URL`                      | Playwright e2e                   | Optional local/CI        | `http://127.0.0.1:${E2E_PORT}`                             | Browser base URL for e2e.                                              |
| `E2E_DATABASE_URL`                  | E2E setup and Playwright         | Optional                 | `postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e` | Points to disposable e2e PostgreSQL.                                   |
| `E2E_REDIS_URL`                     | Playwright e2e                   | Optional                 | `redis://127.0.0.1:56379`                                  | Points to disposable e2e Redis.                                        |
| `E2E_SKIP_DOCKER`                   | E2E setup                        | Optional                 | Docker is used unless set to `1`                           | Set to `1` when external e2e DB/Redis are already running.             |
| `E2E_DETERMINISTIC_RECOMMENDATIONS` | Recommendation jobs/e2e          | Set by Playwright config | Disabled unless `1`                                        | Uses deterministic fixtures instead of live AI/TMDB for product e2e.   |
| `NEXT_FONT_GOOGLE_DISABLE`          | Next.js build CI                 | Set in CI build job      | Not set locally                                            | Avoids flaky Google Fonts network access.                              |
| `NEXT_TELEMETRY_DISABLED`           | Next.js/docs build               | Optional                 | Not set                                                    | Useful in CI and local verification.                                   |

## Coolify And Container Images

Coolify uses `coolify.compose.yml` as the runtime source of truth. For the full
deployment flow, see [Coolify](/docs/COOLIFY) and [CI/CD](/docs/CI-CD).

| Variable                                   | Owner / service            | Local / prod / CI                        | Default / fallback                            | Notes                                                                                                           |
| ------------------------------------------ | -------------------------- | ---------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `APP_IMAGE_PREFIX`                         | Coolify compose            | Optional prod                            | `ghcr.io/shchilkin/popchoice`                 | Public deployment metadata.                                                                                     |
| `IMAGE_TAG`                                | Coolify compose            | Required to pin release intentionally    | `development`                                 | Use one tag for all PopChoice runtime images.                                                                   |
| `SERVICE_NAME_DB`                          | Coolify runtime env helper | Optional                                 | `db`                                          | Lets Coolify service names differ from local Compose names.                                                     |
| `SERVICE_NAME_REDIS`                       | Coolify runtime env helper | Optional                                 | `redis`                                       | Lets Coolify service names differ from local Compose names.                                                     |
| `COOLIFY_DEPLOY_WEBHOOK`                   | GitHub Actions secret      | Required only for auto-deploy            | None                                          | Secret URL. Stored in GitHub repository secrets.                                                                |
| `COOLIFY_TOKEN`                            | GitHub Actions secret      | Required with deploy webhook             | None                                          | Secret API token used as `Authorization: Bearer`.                                                               |
| `POPCHOICE_DEPLOY_VERIFY_BASE_URL`         | GitHub Actions secret      | Optional for post-deploy verification    | Falls back to `POPCHOICE_PRODUCTION_BASE_URL` | Public app origin used to poll `/api/health` and `/api/build` after auto-deploy.                                |
| `POPCHOICE_PRODUCTION_BASE_URL`            | GitHub Actions secret      | Legacy optional post-deploy verification | None                                          | Backwards-compatible fallback for deploy verification; prefer `POPCHOICE_DEPLOY_VERIFY_BASE_URL` for new setup. |
| `GRAFANA_URL`                              | GitHub Actions secret      | Optional for deploy silences             | None                                          | Grafana origin used by deploy workflow to create temporary silences.                                            |
| `GRAFANA_SERVICE_ACCOUNT_TOKEN`            | GitHub Actions secret      | Optional with `GRAFANA_URL`              | None                                          | Secret token with permission to create Grafana silences.                                                        |
| `DEPLOY_SILENCE_MINUTES`                   | GitHub Actions env         | Optional                                 | `15`                                          | Duration for the deploy-sensitive alert silence window.                                                         |
| `COOLIFY_BRANCH` / `COOLIFY_RESOURCE_UUID` | Coolify/build metadata     | Platform-provided or optional            | Empty                                         | Non-secret deployment metadata.                                                                                 |

## Build Metadata

These values are non-secret provenance fields exposed by `/api/build` and the
browser `PopChoice.info()` helper. Runtime `APP_*` values win over baked
`BUILD_*` Docker metadata.

| Variable                                              | Owner / service           | Local / prod / CI                       | Default / fallback                                                                            | Notes                                                           |
| ----------------------------------------------------- | ------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `APP_VERSION` / `APP_CHANNEL`                         | Build info, tracing       | Optional                                | Version defaults to package/release value where configured; channel defaults to `development` | Public metadata.                                                |
| `APP_COMMIT_SHA` / `BUILD_APP_COMMIT_SHA`             | Build info                | Optional but recommended prod           | Falls back through source/GitHub/provider commit fields, then `unknown`                       | Public metadata. Must be a valid SHA to display.                |
| `SOURCE_COMMIT` / `BUILD_SOURCE_COMMIT`               | Build info                | Optional                                | Empty                                                                                         | Public PR/source commit metadata.                               |
| `APP_GIT_BRANCH` / `BUILD_APP_GIT_BRANCH`             | Build info                | Optional                                | Falls back through source/Coolify/GitHub/provider branch fields                               | Public metadata.                                                |
| `SOURCE_BRANCH` / `BUILD_SOURCE_BRANCH`               | Build info                | Optional                                | Empty                                                                                         | Public PR/source branch metadata.                               |
| `APP_PR_NUMBER` / `BUILD_APP_PR_NUMBER`               | Build info                | Optional                                | Empty                                                                                         | Public preview metadata.                                        |
| `APP_IMAGE_REPOSITORY` / `BUILD_APP_IMAGE_REPOSITORY` | Build info                | Optional                                | Empty                                                                                         | Public image provenance.                                        |
| `APP_IMAGE_TAG` / `BUILD_APP_IMAGE_TAG`               | Build info                | Optional                                | Empty                                                                                         | Public image provenance.                                        |
| `APP_IMAGE_DIGEST` / `BUILD_APP_IMAGE_DIGEST`         | Build info                | Optional                                | Empty                                                                                         | Public image provenance; use digest-pinned values for releases. |
| `GITHUB_SHA`, `GITHUB_REF_NAME`                       | GitHub Actions/build info | CI-provided                             | Empty outside GitHub Actions                                                                  | Public metadata.                                                |
| `VERCEL_GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_REF`      | Build info fallback       | Platform-provided if deployed on Vercel | Empty                                                                                         | Public metadata; retained as portable fallback.                 |

## Metrics And Tracing

| Variable                             | Owner / service         | Local / prod / CI                                                    | Default / fallback                                                           | Notes                                                     |
| ------------------------------------ | ----------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `METRICS_ENABLED`                    | Web, workers            | Enabled by default in development; disabled by default in production | `NODE_ENV !== production`                                                    | Set `true` in production only with access controls/token. |
| `METRICS_BEARER_TOKEN`               | Web metrics, Prometheus | Required for protected production scraping                           | Dev allows metrics without token unless disabled                             | Secret. Must match app stack and observability stack.     |
| `TRACING_ENABLED`                    | Web, workers            | Optional                                                             | Disabled unless truthy or OTLP endpoint exists                               | Enables OpenTelemetry SDK startup.                        |
| `TRACING_SAMPLE_RATE`                | Web, workers            | Optional                                                             | `0.05` prod, `1` dev                                                         | Keep prod sampling conservative.                          |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Web, workers            | Optional                                                             | Coolify app defaults to `http://observability-otel-collector:4318/v1/traces` | Preferred trace endpoint variable.                        |
| `OTEL_EXPORTER_OTLP_ENDPOINT`        | Web, workers            | Optional                                                             | Used to derive `/v1/traces` when trace endpoint is absent                    | Generic OTLP base endpoint fallback.                      |
| `OTEL_SERVICE_NAME`                  | Web, workers            | Optional                                                             | `popchoice-web` or `popchoice-workers`                                       | Override only when splitting services further.            |
| `OTEL_DIAG_LOG_LEVEL`                | Web, workers            | Optional                                                             | None                                                                         | `error`, `warn`, `info`, `debug`, `verbose`, or `none`.   |
| `OTEL_TRACES_SAMPLER_ARG`            | Web, workers            | Optional                                                             | Used if `TRACING_SAMPLE_RATE` is absent                                      | OpenTelemetry-compatible sampler arg fallback.            |

## Observability Stack

These belong to `docker-compose.observability.yml`, not the main app compose
resource.

| Variable                             | Owner / service             | Local / prod / CI                                    | Default / fallback                                | Notes                                                                                  |
| ------------------------------------ | --------------------------- | ---------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `OBSERVABILITY_IMAGE_TAG`            | Observability config images | Optional                                             | `local`                                           | Image tag for local/Coolify-built observability config images.                         |
| `POPCHOICE_APP_NETWORK`              | Observability stack         | Required when app network is not `popchoice_default` | `popchoice_default`                               | Must match the Docker network where `web`, `workers`, `db`, and `redis` are reachable. |
| `POPCHOICE_WEB_METRICS_TARGET`       | Prometheus                  | Optional                                             | `web:3000`                                        | Host:port for web metrics target.                                                      |
| `POPCHOICE_WORKERS_METRICS_TARGET`   | Prometheus                  | Optional                                             | `workers:9464`                                    | Host:port for worker metrics target.                                                   |
| `POSTGRES_EXPORTER_DATA_SOURCE_URI`  | Postgres exporter           | Optional                                             | `db:5432/popchoice?sslmode=disable`               | Use app DB service name/database.                                                      |
| `POSTGRES_EXPORTER_DATA_SOURCE_USER` | Postgres exporter           | Optional                                             | `popchoice`                                       | DB user for exporter.                                                                  |
| `POSTGRES_EXPORTER_DATA_SOURCE_PASS` | Postgres exporter           | Required when DB password is set                     | Empty                                             | Secret. Copy from app DB password; observability resource does not inherit it.         |
| `REDIS_EXPORTER_REDIS_ADDR`          | Redis exporter              | Optional                                             | `redis://redis:6379`                              | Include credentials if Redis is protected.                                             |
| `GRAFANA_ADMIN_USER`                 | Grafana                     | Optional                                             | `admin`                                           | Admin username.                                                                        |
| `GRAFANA_ADMIN_PASSWORD`             | Grafana                     | Required for observability stack startup             | None                                              | Secret.                                                                                |
| `GRAFANA_TELEGRAM_BOT_TOKEN`         | Grafana alerting            | Optional                                             | Missing value skips Telegram contact provisioning | Secret.                                                                                |
| `GRAFANA_TELEGRAM_CHAT_ID`           | Grafana alerting            | Optional                                             | Missing value skips Telegram contact provisioning | Private destination id.                                                                |
| `GF_SERVER_ROOT_URL`                 | Grafana                     | Optional                                             | `http://localhost:3000`                           | Set to public Grafana URL so alert links are useful outside Docker.                    |

## Docs App

The Fumadocs app reads markdown/MDX from `docs/` and does not require
application secrets. Use:

| Variable                  | Owner / service               | Local / prod / CI | Default / fallback                                                        | Notes                                            |
| ------------------------- | ----------------------------- | ----------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| `PORT`                    | `apps/docs` production server | Optional          | `3003` for dev script; Next.js default for `next start` unless overridden | Use deployment platform routing for public docs. |
| `NEXT_TELEMETRY_DISABLED` | Docs build/dev                | Optional          | Not set                                                                   | Safe to set to `1` in CI.                        |
