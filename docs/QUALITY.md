---
title: 'Code Quality Checks'
---

# Code Quality Checks

PopChoice uses Fallow for static analysis across the TypeScript/JavaScript
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

The PR audit is a blocking new-only gate in CI. Current `development` still has
legacy findings, so the gate focuses on findings introduced by a changeset rather
than failing every inherited issue. Use `fallow audit` for PR-shaped feedback and
the focused commands when planning cleanup work.

## Baseline Notes

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
adoption path is:

1. PR-local Fallow Audit runs as a required new-only CI gate.
2. Convert high-confidence inherited findings into focused cleanup tickets.
3. Add baselines or suppressions only when a finding is intentionally kept.
4. Keep broad repo-wide cleanup under focused issues instead of relaxing the gate.

The repo-wide changed-code hygiene rollout is complete: PR-local Fallow Audit is
green on the cleanup PRs, and changed-code dead-code and duplication checks are
clean for the focused cleanup slices. The remaining backlog is inherited
complexity rather than new-code regressions.

Fresh `development` complexity baseline on 2026-06-05:

- `health`: 165 findings.
- Severity split: 37 critical, 47 high, 81 moderate.
- Workspace split: 136 in `apps/web`, 28 in `apps/backoffice`, and 1 script
  finding.

Track the repo-wide complexity cleanup in
[#717](https://github.com/shchilkin/PopChoice/issues/717). The child issues split
the work by file/workflow so each PR can keep behavior stable and avoid broad
complexity suppressions.

## Monorepo Follow-ups

Fallow is configured at the repository root and sees all npm workspaces:
`apps/backoffice`, `apps/bull-board`, `apps/docs`, `apps/web`,
`packages/shared`, and the service workspaces. PR audit should therefore be
read as a monorepo gate, even when a cleanup issue focuses on one workspace.

Completed focused follow-ups:

- [#697](https://github.com/shchilkin/PopChoice/issues/697): backoffice/docs
  findings, including generated docs imports, Playwright e2e reachability, and
  backoffice export-surface cleanup.
- [#698](https://github.com/shchilkin/PopChoice/issues/698): shared/services
  findings, including service orchestration complexity
  ([#702](https://github.com/shchilkin/PopChoice/issues/702)), Bull Board
  entrypoint ownership ([#703](https://github.com/shchilkin/PopChoice/issues/703)),
  and shared package health hotspots
  ([#704](https://github.com/shchilkin/PopChoice/issues/704)).

Completed repo-wide complexity follow-up:

- [#717](https://github.com/shchilkin/PopChoice/issues/717): drive inherited
  Fallow complexity findings to zero actionable items. Start with the highest
  risk worker, recommendation, persistence, eval, backoffice, account/results,
  auth, catalog, and UI helper slices tracked by its child issues.

Completed health-score follow-up:

- [#766](https://github.com/shchilkin/PopChoice/issues/766): improve the Fallow
  health score after complexity findings reached zero. The score-hardening pass
  split shared DB helpers, movie catalog query handling, movie-memory service
  helpers, recommendation TMDB modules, and the remaining coupling targets.
- [#772](https://github.com/shchilkin/PopChoice/issues/772): move the root
  Fallow health score into the desired `85-90` band without broad suppressions.
  After PR [#773](https://github.com/shchilkin/PopChoice/pull/773), the root
  health score is `87.9` (`A`), with zero complexity findings and zero
  dead-code issues. The remaining score delta is dominated by inherited
  `unit_size` and `coupling` penalties; future work toward `90+` should be a
  separate optional hardening wave.

The root config intentionally ignores `**/e2e/**` for dead-code reachability and
`collections/server` as a generated Fumadocs import. Keep those ignores narrow:
e2e behavior is covered by Playwright jobs, and docs type-check runs
`fumadocs-mdx` before `tsc`.

The health config also ignores `apps/web/public/mockServiceWorker.js` because it
is the generated MSW browser worker checked into `public/`. Regenerate it through
MSW tooling when the package requires an update; do not hand-refactor it to
silence complexity metrics.
