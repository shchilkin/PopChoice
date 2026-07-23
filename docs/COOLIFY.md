---
title: 'Deploying PopChoice with Coolify'
---

# Deploying PopChoice with Coolify

This project is ready to run on a VPS with Coolify using `coolify.compose.yml`.
The stack runs PostgreSQL with pgvector, Redis, the Next.js web app, BullMQ
workers, Bull Board, and optional catalog/data tools. PopChoice application
containers are pulled from GitHub Container Registry instead of being built on
the VPS.

The preserved Figma Make prototype is deployed separately from this stack. It
uses a standalone Coolify Docker Image application and the prebuilt
`ghcr.io/shchilkin/popchoice/figma-make:<tag>` image; it is intentionally absent
from `coolify.compose.yml`.

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
   `3000`. Set `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` when you
   want the shared operator login prompt.
7. Optional: assign a private/admin domain to `backoffice`, also with port
   `3000`. The backoffice is a separate service like `bull-board`, not a route
   inside `web`, and uses the same operator auth variables.
8. Optional: assign an internal/design-review domain to `storybook`, with port
   `80`. The Storybook service is static nginx output and does not need app
   secrets, Postgres, Redis, OpenAI, or TMDB credentials.

Coolify treats Docker Compose as the source of truth for services, environment
variables, and storage. The compose file declares named volumes for PostgreSQL
and Redis so data survives redeploys.

## Environment model

Use three long-lived environments instead of relying on many always-on PR
previews:

| Environment   | Purpose                                      | Source branch / tag                                                           | Data model                        | Typical domains                                                                |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `local`       | Fast iteration on a developer machine        | feature branches                                                              | Local Docker PostgreSQL and Redis | `http://localhost:3000`, `http://localhost:3003`, `http://localhost:4000`      |
| `development` | Shared staging for merged `development` work | Moving `development` GHCR image tag                                           | Shared staging volumes            | `dev.pop-choice.example`, `dev-docs.pop-choice.example`, admin-only tool hosts |
| `production`  | Stable user-facing deployment                | Gated `production` GHCR image tag or immutable `sha-<12-char-github-sha>` tag | Production volumes with backups   | `pop-choice.example`, `docs.pop-choice.example`, private/admin tool hosts      |

In this model, `development` is the place to test merged work on the VPS.
`production` should be promoted deliberately from a known image set after
development is healthy. PR previews are still useful for risky branch testing,
but they should be temporary and cleaned up quickly.

Create separate Coolify Docker Compose resources for `development` and
`production`. Do not share PostgreSQL or Redis named volumes between them. Both
resources can use the same `coolify.compose.yml`, but their variables, domains,
volumes, backups, and webhooks should be independent.

Recommended domain layout:

- Public app: `pop-choice.example` in production, `dev.pop-choice.example` in
  development.
- Docs: `docs.pop-choice.example` in production,
  `dev-docs.pop-choice.example` in development.
- Backoffice and Bull Board: use separate admin-only domains such as
  `backoffice.pop-choice.example` and `bullboard.pop-choice.example`, protected
  with operator auth. Avoid exposing these before credentials are configured.
- Grafana/observability: keep on a separate admin domain such as
  `grafana.pop-choice.example`, with its own auth and backup plan.
- PR previews: if enabled, use one preview hostname per PR/service only while
  actively testing that PR.

The current long-lived VPS layout is:

| Environment   | Branch        | Image tag     | Public app                             | Docs                                        | Operator/review surfaces                                                                                                                              |
| ------------- | ------------- | ------------- | -------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `development` | `development` | `development` | `https://dev.pop-choice.shchilkin.dev` | `https://dev-docs.pop-choice.shchilkin.dev` | `https://dev-backoffice.pop-choice.shchilkin.dev`, `https://dev-bullboard.pop-choice.shchilkin.dev`, `https://dev-storybook.pop-choice.shchilkin.dev` |
| `production`  | `main`        | `production`  | `https://pop-choice.shchilkin.dev`     | `https://docs.pop-choice.shchilkin.dev`     | `https://backoffice.pop-choice.shchilkin.dev`, `https://bullboard.pop-choice.shchilkin.dev`, `https://storybook.pop-choice.shchilkin.dev`             |

`development` is continuously deployed from the `development` branch after the
image matrix succeeds. `production` is promoted manually from `main` after
staging has been accepted.

The GitHub Actions deploy jobs use the same `development` and `production`
environment names with these public app URLs. Keep those names stable so the
GitHub repository Deployments/Environments surfaces show the current staging and
production deployments.

## Service Links

Keep the long-lived operator and review surfaces on stable, memorable domains.
The current PopChoice convention is:

| Surface    | Production URL                                                                     | Local URL                               | Coolify service         | Auth notes                                                                 |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| App        | [pop-choice.shchilkin.dev](https://pop-choice.shchilkin.dev)                       | [localhost:3000](http://localhost:3000) | `web`                   | Public user-facing app.                                                    |
| Docs       | [docs.pop-choice.shchilkin.dev](https://docs.pop-choice.shchilkin.dev)             | [localhost:3003](http://localhost:3003) | `docs`                  | Public project documentation unless intentionally kept private.            |
| Bull Board | [bullboard.pop-choice.shchilkin.dev](https://bullboard.pop-choice.shchilkin.dev)   | [localhost:4000](http://localhost:4000) | `bull-board`            | Operator-only. Protect with `OPERATOR_AUTH_USERNAME` and password.         |
| Storybook  | [storybook.pop-choice.shchilkin.dev](https://storybook.pop-choice.shchilkin.dev)   | [localhost:6006](http://localhost:6006) | `storybook`             | Design-review surface. Keep private/admin-only if unreleased UI is shown.  |
| Figma Make | Assign after review                                                                | Vite dev server                         | standalone application  | Historical design reference; static image with no application secrets.     |
| Backoffice | [backoffice.pop-choice.shchilkin.dev](https://backoffice.pop-choice.shchilkin.dev) | [localhost:3004](http://localhost:3004) | `backoffice`            | Operator-only. Uses the same shared operator auth variables as Bull Board. |
| Grafana    | [grafana.pop-choice.shchilkin.dev](https://grafana.pop-choice.shchilkin.dev)       | Observability stack-specific            | `observability-grafana` | Admin-only. Use Grafana auth and avoid exposing unauthenticated metrics.   |

For a different domain, keep the same service names and replace
`pop-choice.shchilkin.dev` with the environment-specific base domain. In
Coolify, assign the public domain to the service and include the container port
in the domain field when required by Coolify routing:

| Service      | Container port |
| ------------ | -------------- |
| `web`        | `3000`         |
| `docs`       | `3000`         |
| `backoffice` | `3000`         |
| `bull-board` | `3000`         |
| `storybook`  | `80`           |
| `figma-make` | `80`           |

Local commands for the same surfaces:

```bash
npm run dev                       # web at http://localhost:3000
npm run dev:docs                  # docs at http://localhost:3003
npm run dev:backoffice            # backoffice at http://localhost:3004
npm run dev --workspace=apps/bull-board # Bull Board at http://localhost:4000
npm run storybook                 # Storybook at http://localhost:6006
npm run dev:figma-make            # original Figma Make prototype
```

For DNS, a wildcard such as `*.pop-choice.example` can reduce manual record
creation for service domains, but it does not automatically solve every
certificate case. A single-label wildcard certificate for
`*.preview.pop-choice.example` covers `540.preview.pop-choice.example`; it does
not cover `540.web.preview.pop-choice.example` or other extra nested labels.
Keep preview URL templates to one dynamic label before the wildcard suffix, or
use generated Coolify/sslip domains for previews to avoid burning through
registered-domain certificate limits.

Avoid enabling preview deployments for every PR by default while the project is
using a single registered domain. Too many one-off preview hostnames can hit the
Let's Encrypt limit of 50 certificates per registered domain per 7 days, which
can then block production domains such as Grafana from receiving a trusted
certificate. If previews are enabled temporarily, delete them after testing and
watch Coolify/Traefik ACME logs for rate-limit errors.

The compose file is intentionally runtime-only for PopChoice services. It pulls
prebuilt images using:

```ini
APP_IMAGE_PREFIX=ghcr.io/shchilkin/popchoice
IMAGE_TAG=development
```

Use `IMAGE_TAG=development` for simple auto-deploys from the latest successful
`development` build. For the GitHub Actions production promotion path, set the
production resource to `IMAGE_TAG=production`; the manual workflow run publishes
that tag only after the image matrix passes and the GitHub `production`
Environment is approved. Use `IMAGE_TAG=sha-<12-char-github-sha>` when you want
to promote or roll back an exact immutable release manually. Keep the same
`IMAGE_TAG` for `web`, `workers`, `bull-board`, `storybook`, `docs`,
`backoffice`, `movie-discovery`, and `movie-backfill`; running
mixed commits is intentionally not supported.

The standalone `figma-make` application is not governed by the Compose
`IMAGE_TAG`. Pin it to a reviewed `sha-<12-char-github-sha>` or image digest,
or use the moving `development` tag for a non-production review environment.
The shared production promotion does not publish a moving
`figma-make:production` tag.

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
DEPLOYMENT_ENVIRONMENT=development
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
DEPLOYMENT_ENVIRONMENT=development
```

Use `{{ project.NAME }}` instead of `{{ environment.NAME }}` if the shared
variable is stored at project scope. A shared variable existing on the project
or environment is not enough by itself; it must be referenced by the Compose
resource so Coolify writes it into the generated `.env` file. The PostgreSQL
password is required by Compose and by PostgreSQL on first database
initialization, so a missing value now fails before containers are created.

Recommended long-lived resource presets:

```ini
# development / staging resource
IMAGE_TAG=development
DEPLOYMENT_ENVIRONMENT=development
APP_CHANNEL=development
NEXT_PUBLIC_BASE_URL=https://dev.your-domain.example
```

```ini
# production resource promoted by GitHub Actions
IMAGE_TAG=production
DEPLOYMENT_ENVIRONMENT=production
APP_CHANNEL=production
NEXT_PUBLIC_BASE_URL=https://your-domain.example
```

For a fully pinned production deploy or rollback, temporarily replace
`IMAGE_TAG=production` with the exact `sha-<12-char-github-sha>` tag from a
known-good image workflow run, redeploy the production resource, and switch back
to the promotion tag only when you are ready for the next normal release.

### Shared variable scopes

Coolify project/environment shared variables are only reusable templates. They
are not automatically injected into a Docker Compose resource. Every value that
the app needs at runtime must still be present on the resource's **Environment
Variables** page, usually as a `{{ project.NAME }}` or `{{ environment.NAME }}`
reference.

Keep stable non-secret or low-sensitivity values at the Coolify project scope:

```ini
APP_IMAGE_PREFIX=ghcr.io/shchilkin/popchoice
POSTGRES_USER=popchoice
POSTGRES_DB=popchoice
LOG_LEVEL=info
EMAIL_REPLY_TO=support@mail.shchilkin.dev
OPERATOR_AUTH_REALM=PopChoice Operators
OPERATOR_AUTH_RATE_LIMIT_MAX=30
OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS=900
```

Keep deployment-specific secrets and public origins at the Coolify environment
scope. Create separate values for `development` and `production`:

```ini
POSTGRES_PASSWORD=...
OPENAI_API_KEY=...
TMDB_API_KEY=...
RESEND_API_KEY=...
AUTH_SESSION_SECRET=...
API_KEY_HMAC_SECRET=...
VALID_API_KEYS=...
METRICS_BEARER_TOKEN=...
NEXT_PUBLIC_BASE_URL=https://dev.pop-choice.shchilkin.dev
EMAIL_FROM=PopChoice <noreply@mail.shchilkin.dev>
OPERATOR_AUTH_USERNAME=...
OPERATOR_AUTH_PASSWORD=...
```

Use the same verified Resend sender domain in both development and production:
`EMAIL_FROM=PopChoice <noreply@mail.shchilkin.dev>`. The `RESEND_API_KEY`
value does not change when moving the sender domain.

Use URL-safe database passwords such as `openssl rand -hex 32`; PostgreSQL
passwords that contain URL-reserved characters can break generated
`DATABASE_URL` values if they are not encoded.

Keep plaintext API keys outside Coolify in a password manager. Store only
`VALID_API_KEYS` digests and `API_KEY_HMAC_SECRET` in Coolify.

Set `NEXT_PUBLIC_BASE_URL` to the URL users see in their browser, without a
trailing slash. Even though the Coolify domain field includes `:3000` for proxy
routing, the app's public URL is usually just `https://your-domain.example`.

### Resource environment contract

Both long-lived Coolify Compose resources use the same contract. The resource
environment bridges project/environment shared variables into the generated
`.env` file and declares the service domains for that one environment.
Do not set `APP_VERSION` in Coolify. Runtime build metadata reads the version
from the built package when the environment variable is absent, so release
versions come from the repository and image build rather than manual Coolify
edits.

Development resource:

```ini
APP_IMAGE_PREFIX={{ project.APP_IMAGE_PREFIX }}
IMAGE_TAG=development
DEPLOYMENT_ENVIRONMENT=development
APP_CHANNEL=development

POSTGRES_USER={{ project.POSTGRES_USER }}
POSTGRES_DB={{ project.POSTGRES_DB }}
POSTGRES_PASSWORD={{ environment.POSTGRES_PASSWORD }}

OPENAI_API_KEY={{ environment.OPENAI_API_KEY }}
OPENAI_ADMIN_API_KEY={{ environment.OPENAI_ADMIN_API_KEY }}
TMDB_API_KEY={{ environment.TMDB_API_KEY }}
RESEND_API_KEY={{ environment.RESEND_API_KEY }}

AUTH_SESSION_SECRET={{ environment.AUTH_SESSION_SECRET }}
API_KEY_HMAC_SECRET={{ environment.API_KEY_HMAC_SECRET }}
VALID_API_KEYS={{ environment.VALID_API_KEYS }}

NEXT_PUBLIC_BASE_URL={{ environment.NEXT_PUBLIC_BASE_URL }}
SERVICE_FQDN_WEB=dev.pop-choice.shchilkin.dev
SERVICE_URL_WEB=https://dev.pop-choice.shchilkin.dev

EMAIL_FROM={{ environment.EMAIL_FROM }}
EMAIL_REPLY_TO={{ project.EMAIL_REPLY_TO }}
LOG_LEVEL={{ project.LOG_LEVEL }}

METRICS_ENABLED=false
METRICS_BEARER_TOKEN={{ environment.METRICS_BEARER_TOKEN }}

TRACING_ENABLED=false
TRACING_SAMPLE_RATE=0.05
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://observability-otel-collector:4318/v1/traces

OPERATOR_AUTH_REQUIRED=1
OPERATOR_AUTH_USERNAME={{ environment.OPERATOR_AUTH_USERNAME }}
OPERATOR_AUTH_PASSWORD={{ environment.OPERATOR_AUTH_PASSWORD }}
OPERATOR_AUTH_REALM={{ project.OPERATOR_AUTH_REALM }}
OPERATOR_AUTH_RATE_LIMIT_MAX={{ project.OPERATOR_AUTH_RATE_LIMIT_MAX }}
OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS={{ project.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS }}

SERVICE_NAME_DB=db
SERVICE_NAME_REDIS=redis

SERVICE_FQDN_DOCS=dev-docs.pop-choice.shchilkin.dev
SERVICE_URL_DOCS=https://dev-docs.pop-choice.shchilkin.dev
SERVICE_FQDN_BACKOFFICE=dev-backoffice.pop-choice.shchilkin.dev
SERVICE_URL_BACKOFFICE=https://dev-backoffice.pop-choice.shchilkin.dev
SERVICE_FQDN_BULL_BOARD=dev-bullboard.pop-choice.shchilkin.dev
SERVICE_URL_BULL_BOARD=https://dev-bullboard.pop-choice.shchilkin.dev
SERVICE_FQDN_STORYBOOK=dev-storybook.pop-choice.shchilkin.dev
SERVICE_URL_STORYBOOK=https://dev-storybook.pop-choice.shchilkin.dev
BULL_BOARD_URL=https://dev-bullboard.pop-choice.shchilkin.dev

DRY_RUN=false
SYNC_SCHEDULE=0 0 * * 0
TMDB_SOURCES=
MAX_PAGES_PER_SOURCE=3
MIN_VOTE_COUNT=500
MIN_VOTE_AVERAGE=6.5
MAX_MOVIES_PER_RUN=50
TMDB_LANGUAGE=en-US
BATCH_SIZE=5
MAX_MOVIES=0
CATALOG_HEALTH_SAMPLE_LIMIT=5
CATALOG_HEALTH_STALE_DAYS=180

SOURCE_COMMIT=
SOURCE_BRANCH=
COOLIFY_BRANCH=
COOLIFY_RESOURCE_UUID=
APP_COMMIT_SHA=${SOURCE_COMMIT:-}
APP_GIT_BRANCH=${SOURCE_BRANCH:-}

SERVICE_FQDN_MOVIE_DISCOVERY=
SERVICE_URL_MOVIE_DISCOVERY=
```

Production resource:

```ini
APP_IMAGE_PREFIX={{ project.APP_IMAGE_PREFIX }}
IMAGE_TAG=production
DEPLOYMENT_ENVIRONMENT=production
APP_CHANNEL=production

POSTGRES_USER={{ project.POSTGRES_USER }}
POSTGRES_DB={{ project.POSTGRES_DB }}
POSTGRES_PASSWORD={{ environment.POSTGRES_PASSWORD }}

OPENAI_API_KEY={{ environment.OPENAI_API_KEY }}
OPENAI_ADMIN_API_KEY={{ environment.OPENAI_ADMIN_API_KEY }}
TMDB_API_KEY={{ environment.TMDB_API_KEY }}
RESEND_API_KEY={{ environment.RESEND_API_KEY }}

AUTH_SESSION_SECRET={{ environment.AUTH_SESSION_SECRET }}
API_KEY_HMAC_SECRET={{ environment.API_KEY_HMAC_SECRET }}
VALID_API_KEYS={{ environment.VALID_API_KEYS }}

NEXT_PUBLIC_BASE_URL={{ environment.NEXT_PUBLIC_BASE_URL }}
SERVICE_FQDN_WEB=pop-choice.shchilkin.dev
SERVICE_URL_WEB=https://pop-choice.shchilkin.dev

EMAIL_FROM={{ environment.EMAIL_FROM }}
EMAIL_REPLY_TO={{ project.EMAIL_REPLY_TO }}
LOG_LEVEL={{ project.LOG_LEVEL }}

METRICS_ENABLED=true
METRICS_BEARER_TOKEN={{ environment.METRICS_BEARER_TOKEN }}

TRACING_ENABLED=false
TRACING_SAMPLE_RATE=0.05
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://observability-otel-collector:4318/v1/traces

OPERATOR_AUTH_REQUIRED=1
OPERATOR_AUTH_USERNAME={{ environment.OPERATOR_AUTH_USERNAME }}
OPERATOR_AUTH_PASSWORD={{ environment.OPERATOR_AUTH_PASSWORD }}
OPERATOR_AUTH_REALM={{ project.OPERATOR_AUTH_REALM }}
OPERATOR_AUTH_RATE_LIMIT_MAX={{ project.OPERATOR_AUTH_RATE_LIMIT_MAX }}
OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS={{ project.OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS }}

SERVICE_NAME_DB=db
SERVICE_NAME_REDIS=redis

SERVICE_FQDN_DOCS=docs.pop-choice.shchilkin.dev
SERVICE_URL_DOCS=https://docs.pop-choice.shchilkin.dev
SERVICE_FQDN_BACKOFFICE=backoffice.pop-choice.shchilkin.dev
SERVICE_URL_BACKOFFICE=https://backoffice.pop-choice.shchilkin.dev
SERVICE_FQDN_BULL_BOARD=bullboard.pop-choice.shchilkin.dev
SERVICE_URL_BULL_BOARD=https://bullboard.pop-choice.shchilkin.dev
SERVICE_FQDN_STORYBOOK=storybook.pop-choice.shchilkin.dev
SERVICE_URL_STORYBOOK=https://storybook.pop-choice.shchilkin.dev
BULL_BOARD_URL=https://bullboard.pop-choice.shchilkin.dev

DRY_RUN=false
SYNC_SCHEDULE=0 0 * * 0
TMDB_SOURCES=
MAX_PAGES_PER_SOURCE=3
MIN_VOTE_COUNT=500
MIN_VOTE_AVERAGE=6.5
MAX_MOVIES_PER_RUN=50
TMDB_LANGUAGE=en-US
BATCH_SIZE=5
MAX_MOVIES=0
CATALOG_HEALTH_SAMPLE_LIMIT=5
CATALOG_HEALTH_STALE_DAYS=180

SOURCE_COMMIT=
SOURCE_BRANCH=
COOLIFY_BRANCH=
COOLIFY_RESOURCE_UUID=
APP_COMMIT_SHA=${SOURCE_COMMIT:-}
APP_GIT_BRANCH=${SOURCE_BRANCH:-}

SERVICE_FQDN_MOVIE_DISCOVERY=
SERVICE_URL_MOVIE_DISCOVERY=
```

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
use the verified sending domain `mail.shchilkin.dev`, then set these
variables on the Coolify Compose resource:

```ini
RESEND_API_KEY={{ project.RESEND_API_KEY }}
EMAIL_FROM=PopChoice <noreply@mail.shchilkin.dev>
EMAIL_REPLY_TO=support@mail.shchilkin.dev
```

`EMAIL_REPLY_TO` is optional. In local development and previews, the app exposes
the reset URL after a successful forgot-password request so the flow can be
tested without sending real mail. In production, the URL is sent only by email.

### Operator surfaces

Bull Board and Backoffice are operational/admin surfaces. They use shared Basic
Auth that is separate from the normal user-facing app login. Before assigning a
public or admin domain to either service, set these variables on the Coolify
Compose resource:

```ini
OPERATOR_AUTH_USERNAME=<operator username>
OPERATOR_AUTH_PASSWORD=<long random password>
OPERATOR_AUTH_REALM=PopChoice Operators
```

`OPERATOR_AUTH_REQUIRED` defaults to `0` for the Coolify operator services so
the pet-project deployment does not break while the full RBAC model is still
being built. If the username and password are missing, the operator apps start
with a warning and no operator login. Set `OPERATOR_AUTH_REQUIRED=1` when you
want fail-closed behavior. Leave the Compose health checks on `/healthz`; that
endpoint intentionally bypasses the login prompt so Coolify can verify
containers without storing operator credentials in health checks. Protected
operator routes are rate-limited in-process to slow repeated login attempts. In
Bull Board and the backoffice, successful requests are skipped by the limiter;
tune `OPERATOR_AUTH_RATE_LIMIT_MAX` and
`OPERATOR_AUTH_RATE_LIMIT_WINDOW_SECONDS` if manual testing needs a wider
window.

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

Set these optional variables on the Coolify Compose resource. Do not set
`APP_VERSION`; when absent, `/api/build` reports the version baked into the
deployed package.

```ini
APP_CHANNEL=development
DEPLOYMENT_ENVIRONMENT=development
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
4. `backoffice`, `docs`, and `storybook` start as independent operator/docs UI
   surfaces.

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
- `https://your-domain.example/api/build` shows the expected release version and
  commit hash.
- `https://storybook.your-domain.example` loads the component workshop if the
  `storybook` service is enabled.
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

For a simple continuous deployment path to the shared `development` resource:

1. Set `IMAGE_TAG=development` on the Coolify Compose resource.
2. Set `DEPLOYMENT_ENVIRONMENT=development` and `APP_CHANNEL=development` on
   that resource.
3. Create a GitHub Environment named `development`.
4. Add the `development` environment secret `COOLIFY_DEPLOY_WEBHOOK` with the
   development Coolify deploy webhook URL.
5. Add the `development` environment secret `COOLIFY_TOKEN` with a Coolify API
   token that has deploy permission.
6. Optional but recommended: add `POPCHOICE_DEPLOY_VERIFY_BASE_URL`, for example
   `https://dev.pop-choice.example`, to the same GitHub Environment so Actions
   can verify `/api/health` and `/api/build` after the webhook runs.
7. Optional if Grafana is reachable from GitHub Actions: add `GRAFANA_URL` and
   `GRAFANA_SERVICE_ACCOUNT_TOKEN` to the GitHub Environment so the deploy job
   can create a short silence for deploy-sensitive alerts before triggering
   Coolify.
8. Merge to `development`.

GitHub Actions builds and publishes every PopChoice runtime image first. Only
after the full image matrix succeeds does the workflow call the deploy webhook.
The webhook call is an authenticated `GET` request using
`Authorization: Bearer ${COOLIFY_TOKEN}`. Coolify then pulls the already-built
`development` images and restarts the stack.

Normal redeploys may briefly stop or replace the web container before
Prometheus can scrape `web:3000` again. That alert is now a P2
deploy-sensitive visibility signal. When Grafana secrets are present, the
workflow creates a short silence for `noise_profile=deploy-sensitive` before
the webhook. When `POPCHOICE_DEPLOY_VERIFY_BASE_URL` is present, the workflow
then polls public `/api/health` and `/api/build` and fails if the deployed
resource does not recover in time. The older `POPCHOICE_PRODUCTION_BASE_URL`
secret is still accepted as a backwards-compatible fallback, but new setup
should use the neutral deploy-verification name because the webhook normally
targets development.

To smoke-test the same path without a new merge, manually run the
`Container Images` workflow on the `development` branch. Manual runs rebuild and
republish the same image set, update the `development` image tag, then call the
development Coolify deploy webhook after the matrix succeeds when
`deploy_environment=development`.

For production release promotion:

1. Keep production as a separate Coolify resource with `IMAGE_TAG=production`,
   `DEPLOYMENT_ENVIRONMENT=production`, and production domains/secrets.
2. Create a GitHub Environment named `production` and add production-scoped
   `COOLIFY_DEPLOY_WEBHOOK`, `COOLIFY_TOKEN`, and
   `POPCHOICE_DEPLOY_VERIFY_BASE_URL` secrets.
3. Configure required reviewers on the GitHub `production` Environment.
4. After the development resource passes the smoke checklist, manually run the
   `Container Images` workflow on the `main` branch with
   `deploy_environment=production`.
5. Approve the GitHub Environment deployment. The workflow publishes the
   `production` image tag for every service, triggers the production Coolify
   webhook, and verifies `/api/health` plus `/api/build`.
6. After the deploy, verify the public build metadata:

   ```bash
   curl -fsS https://pop-choice.example/api/build | jq .
   curl -fsS https://pop-choice.example/api/health | jq .
   ```

   `/api/build` should report the release package version, `channel:
production`, `branch: main`, and the expected commit/image tag. Do not set
   `APP_VERSION` in the Coolify project, environment, resource, or preview
   variables; stale Coolify values override the package version baked into the
   image.

7. If `/api/build` reports an old version after a successful deploy, search the
   resource environment variables for `APP_VERSION`, including preview
   variables, remove every match, reload the Compose file if Coolify still
   treats the variable as Compose-managed, then redeploy.

For a pinned rollback, set production `IMAGE_TAG` to the previous known-good
`sha-<12-char-github-sha>` tag and redeploy the production resource manually.
Do not promote production from a branch build that has not already passed the
image workflow and the development smoke checklist.

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

## Storybook service

The `storybook` service deploys the static Storybook build from the same GHCR
image bundle as the application runtime. Point a separate internal or
design-review domain, such as `storybook.your-domain.example`, at the
`storybook` service in Coolify and use port `80`.

The service is static nginx output. It does not need application secrets,
Postgres, Redis, OpenAI, or TMDB credentials. Keep it on the same `IMAGE_TAG` as
the app services so component docs match the deployed code.

## Standalone Figma Make prototype

Create this prototype as a separate Coolify **Docker Image** application, not
as a service in the PopChoice Compose resource:

1. Wait for `.github/workflows/container-images.yml` to publish the reviewed
   image from GitHub Actions.
2. Set the image to
   `ghcr.io/shchilkin/popchoice/figma-make:sha-<12-char-github-sha>` or, for a
   shared development review surface,
   `ghcr.io/shchilkin/popchoice/figma-make:development`.
3. Expose container port `80` and configure `/healthz` as the health check.
4. Assign a dedicated design-review domain.
5. Do not add runtime secrets, PostgreSQL, Redis, OpenAI, or TMDB variables.
6. If the package is private, configure GHCR pull credentials on this Coolify
   resource.

Do not connect the Git repository as a build source. In particular, do not use
Nixpacks or ask Coolify to build `apps/figma-make/Dockerfile`; the production
VPS only pulls the artifact built by GitHub Actions.

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
8. Do not set `COMPOSE_PROFILES=tools` globally. It enables profiled operator
   tools during every production and preview deploy. Keep one-shot tools manual
   or scheduled intentionally instead.

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
ghcr.io/shchilkin/popchoice/storybook
ghcr.io/shchilkin/popchoice/docs
ghcr.io/shchilkin/popchoice/figma-make
ghcr.io/shchilkin/popchoice/db-migrate
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
ghcr.io/shchilkin/popchoice/storybook@sha256:<digest>
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
still need to be seeded. After the first successful web deploy, use Backoffice
-> Catalog seed -> Trigger movie seed. Backoffice enqueues a `seed-movies` job on
the `movie-seed` BullMQ queue, and the `workers` service performs the curated
seed from `apps/web/data/movies.txt`. The action requires `REDIS_URL` on
backoffice and workers, and `DATABASE_URL` plus `OPENAI_API_KEY` on workers.
Watch the `workers` logs for provider or database errors.

For CI-driven post-deploy seeding, set `BACKOFFICE_AUTOMATION_TOKEN` in the
backoffice Coolify environment and the same GitHub Environment secret, then set
`BACKOFFICE_BASE_URL` to the environment's backoffice origin. Enable
`POSTDEPLOY_SEED_ENABLED=true` as a GitHub Environment variable only for
environments that should automatically queue the curated seed after a successful
deploy verification.

If backoffice is unavailable, fix the backoffice/worker deployment before
seeding. The curated seed path intentionally goes through BullMQ so operators
can see the job in Bull Board and reuse the same retry/dedupe behavior as
production automation.

The tools profile exposes `movie-backfill` from the matching
prebuilt image:

```bash
docker compose --profile tools -f coolify.compose.yml run --rm movie-backfill
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
