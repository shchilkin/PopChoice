---
title: 'Code Quality Checks'
---

# Code Quality Checks

PopChoice uses Fallow for advisory static analysis across the TypeScript/JavaScript
monorepo. Fallow complements ESLint, TypeScript, tests, CodeQL, and dependency
review by finding unused code, duplicate code, complexity hotspots, and
PR-local regressions.

## Local Commands

Run these from the repository root:

```bash
npm run quality:fallow:workspaces
npm run quality:fallow:dead-code -- --workspace @pop-choice/web --summary
npm run quality:fallow:dead-code -- --workspace @pop-choice/backoffice --summary
npm run quality:fallow:dead-code -- --workspace @pop-choice/docs --summary
npm run quality:fallow:health -- --workspace @pop-choice/shared --summary
npm run quality:fallow:dupes -- --workspace @pop-choice/web --summary
npm run quality:fallow:health -- --workspace @pop-choice/web --summary
npm run quality:fallow:audit -- --changed-since origin/development
```

The first rollout is intentionally advisory. Current `development` still has
legacy findings, so PR review should focus on findings introduced by a changeset
and on obvious cleanup candidates. Use `fallow audit` for PR-shaped feedback and
the focused commands when planning cleanup work.

## Initial Baseline Notes

The first scoped pass on `@pop-choice/web` found useful signal:

- `dead-code`: 103 findings in 148ms, including unused files/exports, dependency
  hygiene issues, and duplicate exported type names.
- `dupes`: 194 clone groups in 83ms. Many initial findings are test, e2e, and
  app/service config similarities, so duplicate cleanup should be selective.
- `health`: 169 complexity findings in 514ms. Top hotspots included
  `apps/web/src/app/quiz/page.tsx`, `apps/web/src/app/results/[id]/ResultsIdClient.tsx`,
  `apps/web/src/lib/db/recommendations.ts`, and
  `apps/web/src/app/api/movies/route.ts`.

Treat these numbers as orientation, not a target to clear in one PR. Track the
rollout in [#684](https://github.com/shchilkin/PopChoice/issues/684). The
recommended adoption path is:

1. Keep the PR audit advisory while tuning false positives.
2. Convert high-confidence findings into focused cleanup tickets.
3. Add baselines or suppressions only when a finding is intentionally kept.
4. Make the PR audit blocking once new-only failures are consistently low-noise.

## Monorepo Follow-ups

Fallow is configured at the repository root and sees all npm workspaces:
`apps/backoffice`, `apps/bull-board`, `apps/docs`, `apps/web`,
`packages/shared`, and the service workspaces. PR audit should therefore be
read as a monorepo gate, even when a cleanup issue focuses on one workspace.

Current focused follow-ups:

- [#697](https://github.com/shchilkin/PopChoice/issues/697): backoffice/docs
  findings, including generated docs imports, Playwright e2e reachability, and
  backoffice export-surface cleanup.
- [#698](https://github.com/shchilkin/PopChoice/issues/698): shared/services
  findings, including package-level health hotspots and service-local unused
  exports/types.

The root config intentionally ignores `**/e2e/**` for dead-code reachability and
`collections/server` as a generated Fumadocs import. Keep those ignores narrow:
e2e behavior is covered by Playwright jobs, and docs type-check runs
`fumadocs-mdx` before `tsc`.
