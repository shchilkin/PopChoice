---
title: 'Deploying PopChoice with Coolify'
---

# Deploying PopChoice with Coolify

This project is ready to run on a VPS with Coolify using `coolify.compose.yml`.
The stack runs PostgreSQL with pgvector, Redis, the Next.js web app, BullMQ
workers, Bull Board, and optional catalog/data tools. PopChoice application
containers are pulled from GitHub Container Registry instead of being built on
the VPS.

## Recommended VPS shape

Start with at least:

- 2 vCPU
- 4 GB RAM
- 40 GB disk

The app will run on smaller boxes, but builds for the Node monorepo are much
less pleasant on 2 GB RAM.

## Coolify resource

1. Create a new Coolify project on the VPS.
2. Add a new resource from this Git repository.
3. Choose Docker Compose.
4. Set the compose file path to `coolify.compose.yml`.
5. Assign a domain to the `web` service. Because the container listens on port
   `3000`, set the service domain as `https://your-domain.example:3000`.
6. Optional: assign a private/admin domain to `bull-board`, also with port
   `3000`.

Coolify treats Docker Compose as the source of truth for services, environment
variables, and storage. The compose file declares named volumes for PostgreSQL
and Redis so data survives redeploys.

The compose file is intentionally runtime-only for PopChoice services. It pulls
prebuilt images using:

```ini
APP_IMAGE_PREFIX=ghcr.io/shchilkin/popchoice
IMAGE_TAG=development
```

Use `IMAGE_TAG=development` for simple auto-deploys from the latest successful
`development` build. Use `IMAGE_TAG=sha-<12-char-github-sha>` when you want to
promote or roll back an exact immutable release. Keep the same `IMAGE_TAG` for
`web`, `workers`, `bull-board`, `movie-seed`, `movie-discovery`, and
`movie-backfill`; running mixed commits is intentionally not supported.

If the GHCR packages are private, add registry credentials in Coolify so the VPS
can pull `ghcr.io/shchilkin/popchoice/*`. Public packages do not need registry
credentials.

## Required variables

Set these in Coolify before the first deploy:

```ini
OPENAI_API_KEY=...
POSTGRES_PASSWORD=...
AUTH_SESSION_SECRET=...
NEXT_PUBLIC_BASE_URL=https://your-domain.example
IMAGE_TAG=development
```

For Docker Compose resources, these must exist in the resource's
**Environment Variables** page. If you keep the real values as Coolify shared
variables, add resource variables that reference them:

```ini
OPENAI_API_KEY={{ environment.OPENAI_API_KEY }}
POSTGRES_PASSWORD={{ environment.POSTGRES_PASSWORD }}
AUTH_SESSION_SECRET={{ environment.AUTH_SESSION_SECRET }}
NEXT_PUBLIC_BASE_URL=https://your-domain.example
IMAGE_TAG=development
```

Use `{{ project.NAME }}` instead of `{{ environment.NAME }}` if the shared
variable is stored at project scope. A shared variable existing on the project
or environment is not enough by itself; it must be referenced by the Compose
resource so Coolify writes it into the generated `.env` file. The PostgreSQL
password is required by Compose and by PostgreSQL on first database
initialization, so a missing value now fails before containers are created.

Recommended optional variables:

```ini
APP_IMAGE_PREFIX=ghcr.io/shchilkin/popchoice
POSTGRES_USER=popchoice
POSTGRES_DB=popchoice
TMDB_API_KEY=...
LOG_LEVEL=info
API_KEY_HMAC_SECRET=...
VALID_API_KEYS=...
RESEND_API_KEY=...
EMAIL_FROM=PopChoice <noreply@mail.your-domain.example>
EMAIL_REPLY_TO=support@your-domain.example
```

Set `NEXT_PUBLIC_BASE_URL` to the URL users see in their browser, without a
trailing slash. Even though the Coolify domain field includes `:3000` for proxy
routing, the app's public URL is usually just `https://your-domain.example`.

### API key variables

`VALID_API_KEYS` is not a plaintext key. It must contain one or more
comma-separated scrypt digests generated with `API_KEY_HMAC_SECRET`.

Generate a production API key and digest locally:

```bash
API_KEY_HMAC_SECRET="$(openssl rand -hex 32)" node -e "const {randomBytes,scryptSync}=require('crypto'); const secret=process.env.API_KEY_HMAC_SECRET; const key=randomBytes(32).toString('hex'); const hash=scryptSync(key, secret, 32, {N:16384,r:8,p:1}).toString('hex'); console.log('API_KEY_HMAC_SECRET='+secret); console.log('PLAINTEXT_API_KEY='+key); console.log('VALID_API_KEYS='+hash)"
```

Store only these values in Coolify:

```ini
API_KEY_HMAC_SECRET=<API_KEY_HMAC_SECRET output>
VALID_API_KEYS=<VALID_API_KEYS output>
```

Keep `PLAINTEXT_API_KEY` outside Coolify in a password manager or secret store.
External callers send that plaintext value as `Authorization: Bearer <key>` or
`X-API-Key: <key>`.

If you store these as project shared variables, reference them from the Docker
Compose resource environment:

```ini
API_KEY_HMAC_SECRET={{ project.API_KEY_HMAC_SECRET }}
VALID_API_KEYS={{ project.VALID_API_KEYS }}
```

### Password reset email

Password reset requests use Resend in production. Create a Resend API key and
verify a sending domain such as `mail.your-domain.example`, then set these
variables on the Coolify Compose resource:

```ini
RESEND_API_KEY={{ project.RESEND_API_KEY }}
EMAIL_FROM=PopChoice <noreply@mail.your-domain.example>
EMAIL_REPLY_TO=support@your-domain.example
```

`EMAIL_REPLY_TO` is optional. In local development and previews, the app exposes
the reset URL after a successful forgot-password request so the flow can be
tested without sending real mail. In production, the URL is sent only by email.

### Version and build metadata

PopChoice exposes non-secret build metadata at:

```txt
/api/build
```

The browser console also installs a small helper:

```js
PopChoice.version;
PopChoice.commit;
await PopChoice.info();
```

Set these optional variables on the Coolify Compose resource:

```ini
APP_VERSION=0.1.0-beta.0
APP_CHANNEL=beta
APP_COMMIT_SHA=<current git commit sha>
APP_GIT_BRANCH=development
APP_PR_NUMBER=<preview PR number, optional>
APP_IMAGE_REPOSITORY=ghcr.io/shchilkin/popchoice/web
APP_IMAGE_TAG=<image tag, optional>
APP_IMAGE_DIGEST=sha256:<image digest, optional>
SOURCE_COMMIT=<PR head commit, optional>
SOURCE_BRANCH=<PR branch, optional>
```

If your Coolify version can include the source commit in the build/deploy
environment, enable that option and map the exposed commit value to
`APP_COMMIT_SHA`. If it is not set, the app reports the commit as `unknown`
instead of guessing.

For Docker Compose deployments, also enable Coolify's
**Include Source Commit in Build** option if it is available. The web image
persists non-secret build arguments as fallback metadata, so `/api/build` can
still report the commit when Coolify does not pass source metadata as runtime
environment variables.

When deploying a prebuilt GitHub Container Registry image, prefer runtime
metadata from the image workflow artifact over Coolify source metadata:

- Use `APP_COMMIT_SHA` for the GitHub Actions checkout commit that produced the
  image.
- Use `SOURCE_COMMIT` and `SOURCE_BRANCH` for the PR head commit and branch.
- Use `APP_IMAGE_DIGEST` for the digest-pinned image reference being deployed.

This lets `/api/build` connect the running preview back to the PR check and the
exact image digest.

## First deploy

Make sure the `container-images.yml` workflow has already published the selected
`IMAGE_TAG`, then deploy the stack from Coolify. The startup order is:

1. PostgreSQL and Redis start and pass health checks.
2. `web` applies every SQL file in `db/init/` with `start:with-migrations`, then
   starts Next.js.
3. `workers` and `bull-board` start against the same internal Redis and
   PostgreSQL services.

After deployment, set the Coolify health check path for the `web` service to:

```txt
/api/health
```

The endpoint returns `200` only when the Next.js app can reach both PostgreSQL
and Redis. It returns a sanitized `503` response when either dependency is not
available.

The Compose file injects Coolify's `SERVICE_NAME_DB` and `SERVICE_NAME_REDIS`
variables into the application containers, with local fallbacks to build
internal connection URLs. This matters for preview deployments because Coolify
can vary service names per preview stack; plain Docker Compose still falls back
to `db` and `redis`.

## Post-deploy smoke checklist

Run this checklist after production deploys and after any infrastructure change:

- `https://your-domain.example` loads with a trusted certificate.
- `https://docs.your-domain.example/docs` loads the documentation site if the
  `docs` service is enabled.
- `https://your-domain.example/api/health` returns `200`.
- `https://your-domain.example/api/build` shows the expected beta version and
  commit hash.
- A quiz submission creates and completes a recommendation.
- Worker logs show Redis readiness and recommendation job completion.
- The latest PostgreSQL backup exists in the configured backup destination.

## Optional observability stack

For searchable Docker/Coolify logs, run the separate Loki, Alloy, and Grafana
stack documented in [OBSERVABILITY-LOGS.md](/docs/OBSERVABILITY-LOGS). Keep it as
a separate Coolify Docker Compose resource so PopChoice containers do not depend
on Loki availability at runtime.

For external uptime and cheap synthetic monitoring, run Uptime Kuma as a
separate observability stack and configure the monitors in
[Uptime Kuma Monitoring](/docs/OBSERVABILITY-UPTIME). Keep those checks
read-only by default so production monitoring does not spend AI-provider
credits.

For Prometheus metrics and the initial Grafana dashboard, enable the app metrics
endpoints on the PopChoice resource:

```ini
METRICS_ENABLED=true
METRICS_BEARER_TOKEN=<long-random-token>
TRACING_ENABLED=true
TRACING_SAMPLE_RATE=0.05
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://observability-otel-collector:4318/v1/traces
```

Grafana also provisions Tempo traces plus conservative alert rules and runbooks
for app, DB, Redis, queue, provider, disk, and monitoring-stack incidents. Keep
the observability config in Git as the restore source of truth, and follow
[Observability Traces](/docs/OBSERVABILITY-TRACES),
[Observability Alerts](/docs/OBSERVABILITY-ALERTS), and
[Observability Runbooks](/docs/OBSERVABILITY-RUNBOOKS) when wiring notification
contact points or testing restore.

Then run the separate observability stack documented in
[OBSERVABILITY-METRICS.md](/docs/OBSERVABILITY-METRICS). The stack listens locally
on `127.0.0.1:9090` for Prometheus and `127.0.0.1:3001` for Grafana. Set
`POPCHOICE_APP_NETWORK` if Coolify names the app resource network differently
from `popchoice_default`, and set the Postgres exporter credentials with
`POSTGRES_EXPORTER_DATA_SOURCE_URI`, `POSTGRES_EXPORTER_DATA_SOURCE_USER`, and
`POSTGRES_EXPORTER_DATA_SOURCE_PASS`. Because the observability stack is a
separate Coolify resource, duplicate the app database password into
`POSTGRES_EXPORTER_DATA_SOURCE_PASS`; it is not inherited automatically from the
PopChoice app resource.

## Automatic redeploys

For a simple continuous deployment path:

1. Set `IMAGE_TAG=development` on the Coolify Compose resource.
2. Add the repository secret `COOLIFY_DEPLOY_WEBHOOK` with the production
   Coolify deploy webhook URL.
3. Add the repository secret `COOLIFY_TOKEN` with a Coolify API token that has
   deploy permission.
4. Merge to `development`.

GitHub Actions builds and publishes every PopChoice runtime image first. Only
after the full image matrix succeeds does the workflow call the deploy webhook.
The webhook call is an authenticated `GET` request using
`Authorization: Bearer ${COOLIFY_TOKEN}`. Coolify then pulls the already-built
`development` images and restarts the stack.

Current observability caveat: a normal redeploy may briefly stop or replace the
web container before Prometheus can scrape `web:3000` again. If that gap lasts
longer than the current Grafana alert window, Telegram can report the app
metrics target as down even when the deploy eventually recovers. Treat that as
deployment-context signal, not as proof of a user-facing outage by itself.
Follow-up issues track the planned improvements: Telegram formatting in
[#525](https://github.com/shchilkin/PopChoice/issues/525), deploy-sensitive
alert severity tuning in
[#526](https://github.com/shchilkin/PopChoice/issues/526), and short
deploy-aware silences plus post-deploy health verification in
[#527](https://github.com/shchilkin/PopChoice/issues/527).

To smoke-test the same path without a new merge, manually run the
`Container Images` workflow on the `development` branch. Manual runs rebuild and
republish the same image set, update the `development` image tag, then call the
Coolify deploy webhook after the matrix succeeds.

For stricter release promotion, keep automatic deployment disabled, copy the
`sha-<12-char-github-sha>` tag from the workflow run, set `IMAGE_TAG` to that
exact tag in Coolify, and redeploy manually. That gives better rollback and
auditability at the cost of one manual promotion step.

Do not point Coolify at source builds for production while also using GHCR
images. Choose one deployment source of truth; the recommended production path
is GHCR images plus this compose file.

### Documentation service

The `docs` service deploys the Fumadocs site from the same GHCR image bundle as
the application runtime:

```ini
APP_IMAGE_PREFIX=ghcr.io/<owner>/<repo>
IMAGE_TAG=development
```

Point a separate public domain, such as `docs.your-domain.example`, at the
`docs` service in Coolify. The service listens on port `3000` and redirects `/`
to `/docs`. It does not need application secrets, Postgres, Redis, OpenAI, or
TMDB credentials.

Keep the docs service on the same `IMAGE_TAG` as the app services. This makes
the deployed documentation describe the same commit as the running app and keeps
rollback behavior predictable.

## Pull request previews

Use Coolify's GitHub App integration for PR previews so deployments can be
created from pull requests and reported back to GitHub.

1. Add a wildcard DNS record pointing at the VPS:

   ```txt
   *.preview.your-domain.example A <VPS_PUBLIC_IP>
   ```

2. Enable preview deployments for repository members, collaborators, and
   contributors only. Keep public PR preview deployments disabled.
3. Use this preview URL template:

   ```txt
   https://{{pr_id}}.preview.your-domain.example:3000
   ```

4. Keep previews as full isolated stacks. Each PR should get its own `web`,
   `workers`, `db`, `redis`, and named volumes.
5. Configure preview environment variables separately from production if your
   Coolify version exposes preview overrides. Use limited-quota `OPENAI_API_KEY`
   and `TMDB_API_KEY` values when possible, and generate preview-only values for
   `POSTGRES_PASSWORD`, `AUTH_SESSION_SECRET`, `API_KEY_HMAC_SECRET`, and
   `VALID_API_KEYS`.
   If your Coolify version uses the same environment variable list for
   production and previews, make sure the production-safe shared-variable
   references above resolve for previews too.
6. Set preview `NEXT_PUBLIC_BASE_URL` from Coolify's generated web service URL
   for port `3000`.
7. Leave `bull-board` without a preview domain unless temporarily debugging a
   PR.
8. Do not set `COMPOSE_PROFILES=tools` globally. It enables the profiled
   `movie-seed` service during every production and preview deploy. Run seeding
   manually or as a Coolify scheduled task instead.

Before relying on previews, verify that opening a PR creates a preview
deployment and GitHub comment, the preview URL loads over HTTPS, quiz submission
completes without touching production data, and closing or merging the PR
removes the preview deployment.

### Prebuilt PR preview images

GitHub Actions builds production images in
`.github/workflows/container-images.yml` and publishes them to GHCR:

```txt
ghcr.io/shchilkin/popchoice/web
ghcr.io/shchilkin/popchoice/workers
ghcr.io/shchilkin/popchoice/bull-board
ghcr.io/shchilkin/popchoice/db-migrate
ghcr.io/shchilkin/popchoice/movie-seed
ghcr.io/shchilkin/popchoice/movie-discovery
ghcr.io/shchilkin/popchoice/movie-backfill
```

For same-repository PRs, the workflow tags each image as both
`sha-<12-char-github-sha>` and `pr-<number>`, then uploads
`container-image-<role>` artifacts with digest-pinned references. Use the
digest-pinned references for Coolify previews whenever possible:

```txt
ghcr.io/shchilkin/popchoice/web@sha256:<digest>
ghcr.io/shchilkin/popchoice/workers@sha256:<digest>
ghcr.io/shchilkin/popchoice/bull-board@sha256:<digest>
```

The preview stack should pull those images and run them with the same commands,
environment variables, health checks, PostgreSQL, and Redis dependencies shown
in `coolify.compose.yml`. Do not let the preview rebuild Dockerfiles when a
digest-pinned PR image exists; the reviewed artifact is already built and
published by CI.

Set the web container's non-secret provenance variables from the image artifact:

```ini
APP_COMMIT_SHA=<artifact commitSha>
APP_GIT_BRANCH=<github ref name>
APP_PR_NUMBER=<artifact pullRequestNumber>
APP_IMAGE_REPOSITORY=<artifact repository>
APP_IMAGE_TAG=<artifact tag>
APP_IMAGE_DIGEST=<artifact digest>
SOURCE_COMMIT=<artifact sourceCommitSha>
SOURCE_BRANCH=<artifact sourceRef>
```

After the preview starts, verify `/api/build` reports the expected PR number,
commit, image repository, image tag, and image digest. If the digest does not
match the image reference configured in Coolify, redeploy the preview from the
current workflow artifact before testing or promotion.

### Preview domain and certificate notes

Coolify preview URLs need to match the wildcard certificate shape. If DNS and
certificates are configured for:

```txt
*.preview.your-domain.example
```

then use preview hostnames with only one dynamic label before `preview`, for
example:

```txt
https://450.preview.your-domain.example:3000
https://450-random.preview.your-domain.example:3000
```

Avoid hostnames such as:

```txt
https://450.random.preview.your-domain.example:3000
```

because a single-label wildcard certificate for `*.preview.your-domain.example`
does not cover the extra `450.random` nesting. Browsers may show an untrusted
certificate warning even though production is healthy.

For the public app URL used by the browser, prefer the generated web service URL
without manually inventing extra subdomain levels. Do not expose `db`, `redis`,
or `workers` with public domains.

If a preview database fails with:

```txt
Database is uninitialized and superuser password is not specified
```

then `POSTGRES_PASSWORD` did not reach the preview stack. Check the Compose
resource's environment variables, not only shared variables, and delete the
failed preview stack before redeploying so PostgreSQL initializes from a clean
volume with the password present.

If `web` repeatedly logs `getaddrinfo EAI_AGAIN db` while the preview
PostgreSQL container is healthy, the app is trying to resolve the plain Compose
service name instead of Coolify's preview-specific service name. Verify the
preview has picked up the latest compose file and that `DATABASE_URL` resolves
through `SERVICE_NAME_DB`. Inside the preview container, `SERVICE_NAME_DB`
should be set to a value like `db-pr-400`, and `SERVICE_NAME_REDIS` should be
set to a value like `redis-pr-400`.

If a preview API route fails with a PostgreSQL error such as:

```txt
column "poster_url" does not exist
```

the preview stack is running newer code against an older preview database
volume. Force a redeploy after migrations are present, or delete/recreate the
preview deployment if the volume was initialized before the schema change. This
is common for long-lived PR previews because Coolify correctly preserves their
PostgreSQL volumes across redeploys.

For metadata-dependent features such as movie memory, a successful schema
migration is only the first step. Posters and localized titles also require seed
or backfill data. Missing posters should be treated as catalog-data drift, not
as a frontend-only bug.

## Seeding movie data

The database schema is created automatically by the web service, but movie rows
still need to be seeded. After the first successful web deploy, run this from a
Coolify terminal or an SSH shell on the VPS:

```bash
docker compose --profile tools -f coolify.compose.yml run --rm movie-seed
```

The same tools profile also exposes `movie-backfill` from the matching
prebuilt image:

```bash
docker compose --profile tools -f coolify.compose.yml run --rm movie-backfill
```

If you prefer doing this from your laptop against the production database, use
the public PostgreSQL connection string and run:

```bash
DATABASE_URL=<production-database-url> npm run populate-db
```

## Optional movie discovery service

The compose file includes a profiled `movie-discovery` service for scheduled
TMDB discovery syncs. Enable the `discovery` profile only if you want automatic
catalog growth. It requires:

```ini
TMDB_API_KEY=...
OPENAI_API_KEY=...
DATABASE_URL=...
SYNC_SCHEDULE=0 0 * * 0
```

The service runs once immediately on startup and then follows `SYNC_SCHEDULE`,
so enable it deliberately to avoid surprise API usage.

## Backups

Configure Coolify backups for the PostgreSQL volume before relying on this in
production. The application state lives primarily in PostgreSQL; Redis is used
for queues and rate limiting.

Store backups in S3-compatible storage rather than only on the VPS. Enable
Coolify notifications for failed deploys, failed backups, and server disk or
resource warnings. On the Hetzner firewall, expose only the public ports needed
by this setup: `22`, `80`, and `443`; do not expose PostgreSQL or Redis.
