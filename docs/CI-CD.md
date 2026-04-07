# CI/CD Documentation

## GitHub Actions Workflow

This project includes a comprehensive GitHub Actions workflow for pull request validation located at `.github/workflows/pr.yml`.

## Workflow Overview

The workflow runs automatically on pull requests targeting the `development` branch. Jobs run **in parallel** to minimise feedback time, with each job focused on a single concern.

### Jobs

| Job                 | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `lint`              | ESLint code quality + Prettier formatting                        |
| `type-check`        | TypeScript type safety (`tsc --noEmit`)                          |
| `server-tests`      | Vitest server tests with coverage collection and artifact upload |
| `storybook-tests`   | Playwright browser install + Storybook component tests           |
| `build`             | Next.js production build verification                            |
| `movie-sync-ci`     | TypeScript compilation for `services/movie-sync`                 |
| `dependency-review` | Blocks PRs introducing vulnerable dependencies                   |

## Workflow Features

### Parallel Jobs

Each concern (lint, type-check, tests, build) runs as an independent job. A failure in one job does not prevent the others from running, giving fast, complete feedback on every PR.

### Hard Failure on Playwright Install

The `storybook-tests` job runs `npx playwright install-deps` and `npx playwright install` without a fallback — if Playwright installation fails, the job fails visibly rather than silently skipping the tests.

### Playwright Browser Caching

The `storybook-tests` job caches Playwright browser binaries in `~/.cache/ms-playwright` using `actions/cache@v4`, keyed on the OS and `package-lock.json` hash. On a cache hit, both the browser download and system dependency installation steps are skipped entirely, reducing the job runtime significantly on warm runs.

### Code Coverage

Server tests run with `--coverage` via `@vitest/coverage-v8`. Coverage reports (HTML, JSON, LCOV) are uploaded as a GitHub Actions artifact named `coverage-report` and retained for 30 days. Coverage is configured in `vitest.config.ts`.

### Google Fonts Build Reliability

The `build` job sets `NEXT_FONT_GOOGLE_DISABLE=1` to prevent flaky failures caused by network access to Google Fonts in restricted CI environments.

### Movie Sync CI

The `movie-sync-ci` job installs dependencies and runs `tsc` (`npm run build`) inside `services/movie-sync` to ensure the service always compiles correctly.

### Dependency Review

The `dependency-review` job uses `actions/dependency-review-action` to block any PR that introduces a dependency with a known vulnerability. It does this by failing the GitHub Actions check, which can then prevent merging when that check is required. The workflow only grants `contents: read` for this job; it does not require `pull-requests: write`.

## Workflow Trigger

The workflow is triggered on:

- Pull request events targeting the `development` branch (`branches: ['development']`)
- Both opening PRs and pushing new commits to existing PRs targeting development

## Dependabot

Dependabot is configured in `.github/dependabot.yml` to monitor:

- **npm (root)** – main application dependencies, grouped into `production-dependencies` and `development-dependencies`
- **npm (services/movie-sync)** – movie-sync service dependencies, grouped as `movie-sync-dependencies`
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

# Movie sync type check
cd services/movie-sync && npm run build
```

## Troubleshooting

### Common Issues

1. **Playwright Installation Failures**
   - The `storybook-tests` job will now fail explicitly — check runner disk space and OS compatibility for Playwright browsers.

2. **Google Fonts Network Timeouts**
   - Ensure `NEXT_FONT_GOOGLE_DISABLE=1` is set in the build step (already configured in CI).

3. **Build Failures**
   - Verify all required environment variables are present as repository secrets (`OPENAI_API_KEY`).

4. **Movie Sync Type Errors**
   - Run `cd services/movie-sync && npm run build` locally to reproduce and fix TypeScript errors.

The workflow helps maintain code quality and functionality across all pull requests.
