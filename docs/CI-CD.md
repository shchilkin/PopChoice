# CI/CD Documentation

## GitHub Actions Workflow

This project uses two GitHub Actions workflow files for pull request validation:

- `.github/workflows/pr.yml` – main application checks (lint, type-check, tests, build, dependency review)
- `.github/workflows/movie-discovery-ci.yml` – TypeScript compilation and tests for the `services/movie-discovery` service, triggered when files under `services/movie-discovery/` change or when `.github/workflows/movie-discovery-ci.yml` itself changes

## Workflow Overview

Both workflows run automatically on pull requests targeting the `development` branch. Jobs run **in parallel** to minimise feedback time, with each job focused on a single concern.

### Jobs

| Workflow                 | Job                  | Purpose                                                          |
| ------------------------ | -------------------- | ---------------------------------------------------------------- |
| `pr.yml`                 | `changes`            | Classifies PR as docs-only vs code-changing                      |
| `pr.yml`                 | `lint`               | ESLint code quality + Prettier formatting                        |
| `pr.yml`                 | `type-check`         | TypeScript type safety (`tsc --noEmit`)                          |
| `pr.yml`                 | `server-tests`       | Vitest server tests with coverage collection and artifact upload |
| `pr.yml`                 | `storybook-tests`    | Playwright browser install + Storybook component tests           |
| `pr.yml`                 | `build`              | Next.js production build verification                            |
| `pr.yml`                 | `movie-seed-ci`      | TypeScript compilation for `services/movie-seed`                 |
| `pr.yml`                 | `dependency-review`  | Blocks PRs introducing vulnerable dependencies                   |
| `pr.yml`                 | `pr-validation`      | Stable required check that always runs on every PR               |
| `movie-discovery-ci.yml` | `movie-discovery-ci` | TypeScript compilation and tests for `services/movie-discovery`  |

## Workflow Features

### Parallel Jobs

Each concern (lint, type-check, tests, build) runs as an independent job. A failure in one job does not prevent the others from running, giving fast, complete feedback on every PR.

### Hard Failure on Playwright Install

The `storybook-tests` job runs `npx playwright install-deps` on every CI run and `npx playwright install` without a fallback when browsers are not already cached. If Playwright installation fails, the job fails visibly rather than silently skipping the tests.

### Playwright Browser Caching

The `storybook-tests` job caches Playwright browser binaries in `~/.cache/ms-playwright` using `actions/cache@v5`, keyed on the OS and `package-lock.json` hash. On a cache hit, the browser download step is skipped, but `npx playwright install-deps` still runs because Linux system packages are not part of the Playwright browser cache.

### Code Coverage

Server tests run with `--coverage` via `@vitest/coverage-v8`. Coverage reports (HTML, JSON, LCOV) are uploaded as a GitHub Actions artifact named `coverage-report` and retained for 30 days. Coverage is configured in `vitest.config.ts`.

### Google Fonts Build Reliability

The `build` job sets `NEXT_FONT_GOOGLE_DISABLE=1` to prevent flaky failures caused by network access to Google Fonts in restricted CI environments.

### Movie Discovery CI

The `movie-discovery-ci` job lives in its own workflow (`movie-discovery-ci.yml`) and is triggered when files inside `services/movie-discovery/` change or when `.github/workflows/movie-discovery-ci.yml` itself changes. It installs dependencies, runs `tsc` (`npm run build`) to ensure the service always compiles correctly, and runs the service's Vitest test suite.

### Dependency Review

The `dependency-review` job uses `actions/dependency-review-action` to block any PR that introduces a dependency with a known vulnerability. It does this by failing the GitHub Actions check, which can then prevent merging when that check is required. The workflow only grants `contents: read` for this job; it does not require `pull-requests: write`.

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

Both workflows are triggered on:

- Pull request events targeting the `development` branch (`branches: ['development']`)
- Both opening PRs and pushing new commits to existing PRs targeting development

`pr.yml` always runs and classifies docs-only PRs inside the workflow so `PR Validation` is always reported.
`movie-discovery-ci.yml` additionally **only runs** when at least one file under `services/movie-discovery/**` changes or when `.github/workflows/movie-discovery-ci.yml` itself changes.

## Dependabot

Dependabot is configured in `.github/dependabot.yml` to monitor:

- **npm (root)** – main application dependencies, grouped into `production-dependencies` and `development-dependencies`
- **npm (services/movie-seed)** – movie-seed service dependencies, grouped as `movie-seed-dependencies`
- **npm (services/movie-discovery)** – movie-discovery service dependencies, grouped as `movie-discovery-dependencies`
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

# Movie seed type check
cd services/movie-seed && npm run build

# Movie discovery type check and tests
cd services/movie-discovery && npm run build && npm test
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Failures**
   - The `storybook-tests` job will now fail explicitly — check runner disk space and OS compatibility for Playwright browsers.

2. **Google Fonts Network Timeouts**
   - Ensure `NEXT_FONT_GOOGLE_DISABLE=1` is set in the build step (already configured in CI).

3. **Build Failures**
   - Verify all required environment variables are present as repository secrets (`OPENAI_API_KEY`).

4. **Movie Discovery Type Errors**
   - Run `cd services/movie-discovery && npm run build` locally to reproduce and fix TypeScript errors.
5. **Movie Seed Type Errors**
   - Run `cd services/movie-seed && npm run build` locally to reproduce and fix TypeScript errors.

The workflow helps maintain code quality and functionality across all pull requests.
