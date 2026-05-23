# CI/CD Documentation

## GitHub Actions Workflow

This project uses these GitHub Actions workflow files for pull request validation and security scanning:

- `.github/workflows/pr.yml` – main application and workspace checks (lint, type-check, web tests, recommendation evals, Storybook tests, e2e smoke tests, build, service CI, dependency review)
- `.github/workflows/container-images.yml` – production container image builds for app and service runtimes, published to GitHub Container Registry with commit and PR provenance metadata
- `.github/workflows/movie-discovery-ci.yml` – TypeScript compilation and tests for the `services/movie-discovery` service, triggered when files under `services/movie-discovery/` change or when `.github/workflows/movie-discovery-ci.yml` itself changes
- `.github/workflows/codeql.yml` – CodeQL analysis for GitHub Actions and JavaScript/TypeScript on pushes, pull requests, and a weekly schedule

## Workflow Overview

The PR validation workflows run automatically on pull requests targeting the `development` branch. Jobs run **in parallel** to minimise feedback time, with each job focused on a single concern. CodeQL also runs on pushes to `development` and on a weekly schedule.

### Jobs

| Workflow                 | Job                    | Purpose                                                                         |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------- |
| `pr.yml`                 | `changes`              | Classifies PR as docs-only vs code-changing                                     |
| `pr.yml`                 | `lint`                 | ESLint code quality + Prettier formatting                                       |
| `pr.yml`                 | `type-check`           | TypeScript type safety (`tsc --noEmit`)                                         |
| `pr.yml`                 | `server-tests`         | Vitest server tests with coverage collection and artifact upload                |
| `pr.yml`                 | `recommendation-evals` | Deterministic recommendation quality fixtures and scoring                       |
| `pr.yml`                 | `storybook-tests`      | Playwright browser install + Storybook component tests                          |
| `pr.yml`                 | `e2e-tests`            | Playwright smoke tests against isolated PostgreSQL + Redis services             |
| `pr.yml`                 | `build`                | Next.js production build verification                                           |
| `pr.yml`                 | `services-ci`          | Turbo test pass for `services/*`                                                |
| `pr.yml`                 | `dependency-review`    | Blocks PRs introducing vulnerable dependencies                                  |
| `pr.yml`                 | `pr-validation`        | Stable required check that always runs on every PR                              |
| `container-images.yml`   | `build-images`         | Builds and publishes GHCR production images with provenance                     |
| `container-images.yml`   | `deploy-coolify`       | Optionally triggers the Coolify deploy webhook after development images publish |
| `movie-discovery-ci.yml` | `movie-discovery-ci`   | TypeScript compilation and tests for `services/movie-discovery`                 |
| `codeql.yml`             | `analyze`              | CodeQL static analysis for Actions and JavaScript/TypeScript                    |

## Workflow Features

### Parallel Jobs

Each concern (lint, type-check, tests, build) runs as an independent job. A failure in one job does not prevent the others from running, giving fast, complete feedback on every PR.

### Hard Failure on Playwright Install

The `storybook-tests` job runs `npx playwright install-deps` on every CI run and `npx playwright install` without a fallback when browsers are not already cached. If Playwright installation fails, the job fails visibly rather than silently skipping the tests.

### Playwright Browser Caching

The `storybook-tests` job caches Playwright browser binaries in `~/.cache/ms-playwright` using `actions/cache@v5`, keyed on the OS and `package-lock.json` hash. On a cache hit, the browser download step is skipped, but `npx playwright install-deps` still runs because Linux system packages are not part of the Playwright browser cache.

### E2E Smoke Tests

The `e2e-tests` job runs `npm run test:e2e`. That command starts the isolated `docker-compose.e2e.yml` services, applies the same `db/init` migrations used by production/local setup, seeds deterministic movie fixtures, starts Next.js on port `3100`, and runs Playwright. The job always runs `npm run test:e2e:down` afterwards so the disposable database volume is removed.

The e2e coverage proves the real app can read seeded catalog data from PostgreSQL, that `/api/health` can reach both PostgreSQL and Redis, and that auth/session, catalog empty states, quiz submission, deterministic result rendering, feedback, and movie-memory persistence work through the browser. AI-eval coverage is tracked separately so model quality gates can use fixture scoring and optional live-provider runs.

### Recommendation Evals

The `recommendation-evals` job runs `npm run eval:recommendations`. This is a CI-blocking deterministic suite: it uses fixture prompts, fixture memory constraints, and mocked model outputs, then writes `apps/web/test-results/recommendation-evals/report.json`. The report is uploaded as the `recommendation-eval-report` artifact.

Default evals do not require `OPENAI_API_KEY`, `TMDB_API_KEY`, Redis, or PostgreSQL. Optional live-provider evals use `npm run eval:recommendations -- --live` and are intentionally manual because they can spend API credits, depend on provider availability, and may need seeded local data.

### Code Coverage

Server tests run with `--coverage` via `@vitest/coverage-v8`. Coverage reports (HTML, JSON, LCOV) are uploaded as a GitHub Actions artifact named `coverage-report` and retained for 30 days. Coverage is configured in `vitest.config.ts`.

### Google Fonts Build Reliability

The `build` job sets `NEXT_FONT_GOOGLE_DISABLE=1` to prevent flaky failures caused by network access to Google Fonts in restricted CI environments.

### Services CI

The `services-ci` job in `pr.yml` runs `npm run test:services`, which delegates to Turbo for root `services/*` packages that define a `test` script. Services without a `test` script are skipped by that command; use `npm run build:services` locally when you specifically need a compile pass across service workspaces.

### Movie Discovery CI

The `movie-discovery-ci` job lives in its own workflow (`movie-discovery-ci.yml`) and is triggered when files inside `services/movie-discovery/` change or when `.github/workflows/movie-discovery-ci.yml` itself changes. It installs dependencies, runs `tsc` (`npm run build`) to ensure the service always compiles correctly, and runs the service's Vitest test suite.

### CodeQL

The CodeQL workflow analyzes GitHub Actions and JavaScript/TypeScript on pushes and pull requests targeting `development`, plus a weekly scheduled run.

### Dependency Review

The `dependency-review` job uses `actions/dependency-review-action` to block any PR that introduces a dependency with a known vulnerability. It does this by failing the GitHub Actions check, which can then prevent merging when that check is required. The workflow only grants `contents: read` for this job; it does not require `pull-requests: write`.

### Prebuilt Container Images

`container-images.yml` builds production Docker images for:

- `ghcr.io/<owner>/<repo>/web`
- `ghcr.io/<owner>/<repo>/workers`
- `ghcr.io/<owner>/<repo>/bull-board`
- `ghcr.io/<owner>/<repo>/db-migrate`
- `ghcr.io/<owner>/<repo>/movie-seed`
- `ghcr.io/<owner>/<repo>/movie-discovery`
- `ghcr.io/<owner>/<repo>/movie-backfill`

On pull requests from the same repository, the workflow publishes:

- `sha-<12-char-github-sha>` – exact checked commit used by the workflow
- `pr-<number>` – moving PR tag for the latest image built for that PR

On pushes to `development`, it also publishes `development`.

Each image receives OCI labels for the repository, workflow run, checked
commit, source PR branch, source PR head commit, and image role. Published runs
also upload a `container-image-<role>` artifact containing the digest-pinned
reference (`ghcr.io/.../<role>@sha256:...`). Downstream previews and deploys
should consume the digest-pinned reference from that artifact or from GHCR
rather than rebuilding from the monorepo.

Forked pull requests still build the images for validation, but publishing is
disabled because the GitHub token does not have package write permission.

Coolify consumes the published images through `coolify.compose.yml`. The compose
file does not build application images on the server; it pulls every PopChoice
runtime from:

```env
APP_IMAGE_PREFIX=ghcr.io/<owner>/<repo>
IMAGE_TAG=development
```

For simple continuous deployment, keep `IMAGE_TAG=development` in Coolify and
let the optional deploy webhook run after the image matrix succeeds. For a
stricter promotion flow, set `IMAGE_TAG=sha-<12-char-github-sha>` and redeploy
that exact release bundle. Every PopChoice service must use the same
`IMAGE_TAG`; mixing `web`, `workers`, `bull-board`, and service images from
different commits is not a supported deployment shape.

Set the repository secrets `COOLIFY_DEPLOY_WEBHOOK` and `COOLIFY_TOKEN` to
enable redeploys after pushes to `development`. `COOLIFY_TOKEN` must be a
Coolify API token with deploy permission because the deploy webhook is
authenticated with `Authorization: Bearer <token>`. The same deploy step also
runs for manual `workflow_dispatch` runs on `development`, which is useful for
smoke-testing the image build and Coolify webhook path without merging another
code change. Manual `development` runs publish the `development` image tag
before the webhook is called, so Coolify pulls the images from that workflow
run. When the webhook secret is absent, images are still published, but
deployment remains manual. When the webhook is present but the token is missing,
the deploy job fails to make the misconfiguration visible.

For provenance in `/api/build`, pass these non-secret runtime variables to the
deployed web container when using a prebuilt image:

```env
APP_COMMIT_SHA=<github workflow commit sha>
APP_GIT_BRANCH=<github ref name>
APP_PR_NUMBER=<pull request number, if any>
APP_IMAGE_REPOSITORY=ghcr.io/<owner>/<repo>/web
APP_IMAGE_TAG=sha-<12-char-github-sha>
APP_IMAGE_DIGEST=sha256:<image digest>
SOURCE_COMMIT=<pull request head sha, if any>
SOURCE_BRANCH=<pull request head ref, if any>
```

`APP_IMAGE_DIGEST` is only known after the image is pushed, so it is normally a
deploy-time environment variable rather than a Docker build argument. If the
deployment uses the moving `development` tag, the image also contains baked
fallback metadata from the build workflow so `/api/build` can still report the
source commit.

### Runtime Compatibility Rules

Treat the published image set as one release unit:

- use one `IMAGE_TAG` for all PopChoice services in `coolify.compose.yml`
- run database migrations before or during the web startup, then start workers
  against the same image tag
- keep SQL migrations additive and idempotent; use an expand/backfill/switch
  pattern before removing old columns or changing meanings
- version BullMQ job payloads when changing worker contracts, and keep workers
  tolerant of older queued jobs
- keep API changes additive between `web`, `workers`, Bull Board, and future
  backoffice apps unless a coordinated release and data migration is planned

## Workflow Triggers and Path Filtering

### How Path Filtering Works

GitHub Actions supports two path-related filters on workflow triggers:

- **`paths`** – the workflow runs **only** when at least one changed file matches a listed pattern.
- **`paths-ignore`** – the workflow is **skipped** when **all** changed files match the listed patterns.

Both filters accept [glob patterns](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet) such as `src/**` or `**/*.md`.

```yaml
on:
  push:
    branches: ['main']
    # Only trigger when source files change
    paths:
      - 'src/**'
      - 'package*.json'

  pull_request:
    branches: ['main']
    # Skip when only documentation changes
    paths-ignore:
      - 'docs/**'
      - '*.md'
```

### Path Filtering in This Repository

**`pr.yml`** now always triggers on pull requests to `development`, then classifies changed files in the `changes` job:

```yaml
on:
  pull_request:
    branches: ['development']
```

If the PR is docs-only (`docs/**` and root-level `*.md`), heavy CI jobs are skipped and the lightweight `PR Validation` job still reports success. For non-doc PRs, the full CI suite runs and `PR Validation` verifies all required CI jobs succeeded.

**`container-images.yml`** triggers on pull requests to `development`, pushes
to `development`, and manual dispatches. It intentionally does not use
docs-only path filtering: image-build changes often span workflow files,
Dockerfiles, package manifests, and deployment docs, and the workflow itself is
the source of truth for the deployable artifact.

**`movie-discovery-ci.yml`** uses `paths` so that the service CI only runs when the service source actually changes:

```yaml
on:
  pull_request:
    branches: ['development']
    paths:
      - 'services/movie-discovery/**'
      - '.github/workflows/movie-discovery-ci.yml'
```

### Best Practices

| Practice                                 | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefer always-running required workflows | If branch protection requires a check, keep the workflow trigger unconditional and gate expensive jobs with job-level conditions instead of `paths-ignore` at the workflow level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Prefer `paths` for isolated services     | Use `paths` when a job is only relevant to a single subdirectory (e.g., a microservice).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Do not mix `paths` and `paths-ignore`    | GitHub does not allow both filters on the same event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Account for required status checks       | If a workflow with path filtering is a **required** status check, GitHub will report the check as "skipped" (not "passed") when the workflow does not run. Skipped checks do not satisfy branch protection rules. A safe workaround is to add an always-run "noop" job that reports success when the paths filter is not met — avoid `pull_request_target` for this purpose, as it runs with base-branch permissions and can expose secrets when combined with PR code checkout. See [Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks). |
| `schedule` events ignore path filters    | Scheduled (`cron`) workflows always run regardless of any `paths` or `paths-ignore` configuration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Reference Links

- [Workflow syntax – `on.<event>.paths`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore)
- [Filter pattern cheat sheet](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet)
- [Triggering a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks)

## Workflow Trigger

The PR validation workflows are triggered on:

- Pull request events targeting the `development` branch (`branches: ['development']`)
- Both opening PRs and pushing new commits to existing PRs targeting development

`pr.yml` always runs and classifies docs-only PRs inside the workflow so `PR Validation` is always reported.
`container-images.yml` builds production images on pull requests and on pushes
to `development`. `movie-discovery-ci.yml` additionally **only runs** when at
least one file under `services/movie-discovery/**` changes or when
`.github/workflows/movie-discovery-ci.yml` itself changes. `codeql.yml` runs on
pushes and pull requests targeting `development`, plus its weekly scheduled
scan.

## Dependabot

Dependabot is configured in `.github/dependabot.yml` to monitor:

- **npm (root)** – workspace dependencies, grouped by framework, AI, database, UI utilities, testing, Storybook, build tools, linting/formatting, and miscellaneous production/development buckets
- **npm (services/movie-seed)** – movie-seed service dependencies, grouped by production, development, and security updates
- **npm (services/movie-discovery)** – movie-discovery service dependencies, grouped by production, development, and security updates
- **GitHub Actions** – workflow action versions

All groups cover `minor` and `patch` updates. Major updates still require manual review.

## Local Testing

To run the same checks locally before pushing:

```bash
# Code quality
npm run lint:check
npm run format:check
npm run type-check

# Server tests with coverage
npx vitest --project=server --run --coverage

# Storybook tests (requires Playwright browsers)
npm run pretest:storybook
npm run test:storybook

# Verify build
NEXT_FONT_GOOGLE_DISABLE=1 npm run build

# Service test pass
npm run test:services

# Focused movie discovery CI reproduction
npx turbo run build test --filter=./services/movie-discovery
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Failures**
   - The `storybook-tests` job will now fail explicitly — check runner disk space and OS compatibility for Playwright browsers.

2. **Google Fonts Network Timeouts**
   - Ensure `NEXT_FONT_GOOGLE_DISABLE=1` is set in the build step (already configured in CI).

3. **Build Failures**
   - Verify all required environment variables are present as repository secrets (`OPENAI_API_KEY`).

4. **Service Type or Test Errors**
   - Run `npm run test:services` locally, then narrow with `npx turbo run build test --filter=./services/<service-name>`.
5. **Movie Discovery Path-Filtered Workflow Errors**
   - Run `npx turbo run build test --filter=./services/movie-discovery` locally to reproduce the dedicated workflow.

The workflow helps maintain code quality and functionality across all pull requests.
