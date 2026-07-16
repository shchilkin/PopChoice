---
title: 'Portfolio Handoff'
description: 'Factual PopChoice case-study handoff with claims, evidence, and blockers.'
---

# PopChoice Portfolio Handoff

## 1. Factual summary

**Shipped in development.** PopChoice is a Next.js/React movie recommendation
product that turns a short Fast Pick or Normal Match flow into a persisted
result for Solo, Duo, or same-device Group audiences. The repository includes
pgvector-backed catalog retrieval, TMDB enrichment/discovery, OpenAI-backed
ranking paths, BullMQ workers, account movie memory, feedback, deterministic
recommendation evals, operator tooling, and a multi-service
deployment/observability setup.

**Production verified — 2026-07-16.** Production identifies itself as v0.2.0
from `main` at `d5da1cd`; public health reported PostgreSQL and Redis healthy.
This does not verify every development feature on the live product.

## 2. Claim → status → evidence

| Claim                                                                 | Status                     | Evidence                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.2.0 is the production release                                      | **Production verified**    | [build endpoint](https://pop-choice.shchilkin.dev/api/build), [tag](https://github.com/shchilkin/PopChoice/releases/tag/v0.2.0), [release notes](/docs/releases/v0.2.0)                                                                                                 |
| Entry flow is Fast Pick/Normal Match, then Solo/Duo/Group             | **Production verified**    | [state machine](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/quiz/quiz.machine.ts), [e2e matrix](https://github.com/shchilkin/PopChoice/blob/development/apps/web/e2e/recommendation.spec.ts), [captures](#5-screenshot-and-asset-manifest) |
| Group supports multi-device rooms or QR invites                       | **Planned**                | [issue #359](https://github.com/shchilkin/PopChoice/issues/359), [product behavior](/docs/PRODUCT-BEHAVIOR#planned-product-direction)                                                                                                                                   |
| Result URLs survive reload and can be shared                          | **Shipped in development** | [result GET](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/api/recommendations/%5Bid%5D/route.ts), [results view](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/results/%5Bid%5D/RecommendationResultsView.tsx)   |
| Feedback affects durable signed-in movie memory                       | **Shipped in development** | [feedback API](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/app/api/recommendations/%5Bid%5D/feedback/route.ts), [recommendation e2e](https://github.com/shchilkin/PopChoice/blob/development/apps/web/e2e/recommendation.spec.ts)              |
| PopChoice has deterministic recommendation regression gates           | **Shipped in development** | [fixtures](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/features/recommendation/evals/fixtures.ts), [CI](https://github.com/shchilkin/PopChoice/blob/development/.github/workflows/pr.yml)                                                      |
| A fixed-candidate Duo quality-review protocol is executable           | **Shipped in development** | [protocol](/docs/portfolio-evidence/CONTROLLED-DUO-QUALITY), [implementation](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/features/recommendation/evals/controlledDuoQuality.ts)                                                               |
| Protected operator surfaces are live and routinely used               | **Anecdotal / unverified** | Code map in [Operations](/docs/portfolio-evidence/OPERATIONS); no authenticated live inspection performed                                                                                                                                                               |
| The recommendation engine improved conversion, accuracy, or retention | **Anecdotal / unverified** | No product analytics dataset or approved metric was found                                                                                                                                                                                                               |

## 3. Product-flow evidence pack

Use [Product Flow](/docs/portfolio-evidence/PRODUCT-FLOW) as the canonical short
path. The strongest portfolio sequence is: current landing → depth choice →
audience choice → one taste-control screen → persisted progress → completed
result with feedback/follow-up. Do not imply that every screen was verified on
production when deterministic local evidence was used.

## 4. Recommendation scenario

Use [feedback-memory repeat avoidance](/docs/portfolio-evidence/RECOMMENDATION-SCENARIO)
for the reproducible deterministic regression example. Use the
[Controlled Duo protocol](/docs/portfolio-evidence/CONTROLLED-DUO-QUALITY) only
to describe how the next quality review is structured. The protocol is ready,
but a real-provider result and owner verdict remain blocked on explicit budget
approval.

## 5. Screenshot and asset manifest

| Asset                                    | Status                                       | Caption                                              | Alt text                                                                                  |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `assets/01-production-landing.png`       | **Production verified**                      | PopChoice v0.2.0 public landing in English.          | PopChoice landing page with animated poster hero and primary movie-finder call to action. |
| `assets/02-match-depth.png`              | **Production verified**                      | First quiz decision: Fast Pick or Normal Match.      | Two large quiz cards offering Fast Pick and Normal Match.                                 |
| `assets/03-audience.png`                 | **Production verified**                      | Audience follows match depth: Solo, Duo, or Group.   | Audience selection screen with Solo, Duo, and Group options.                              |
| `assets/04-hard-avoids.png`              | **Production verified**                      | Fast Pick hard-avoid controls.                       | Fast Pick screen with long runtime and too-obvious constraints selected.                  |
| `assets/05-deterministic-progress.png`   | **Shipped in development; controlled state** | Persisted Duo result while ranking is in progress.   | PopChoice progress screen choosing the strongest matches and building a shortlist.        |
| `assets/06-deterministic-duo-result.png` | **Shipped in development**                   | Deterministic Normal Match result for Alice and Bob. | PopChoice Duo result explaining the shared mood and each participant's inputs.            |
| `assets/07-deterministic-failure.png`    | **Shipped in development; controlled state** | Terminal result state and fresh-quiz action.         | PopChoice failed-result screen with a Start a fresh quiz button.                          |
| `assets/08-deterministic-duo-reload.png` | **Shipped in development**                   | The same completed Duo result after reload.          | Reloaded PopChoice Duo result for Alice and Bob at the same persisted URL.                |

All captures use a 1440 × 900 desktop viewport, English locale, and no personal
data. Assets `01`–`04` were captured from public production without submitting a
recommendation. Assets `05`–`08` were captured locally from the isolated
deterministic harness. The Duo result uses the real browser/API/database flow;
progress and failure are controlled persisted states of the same disposable
record. They must not be described as production states, real model output, or
evidence that BullMQ retried successfully.

## 6. What the case study can honestly say now

- “I grew a course exercise into a full-stack movie recommendation product with
  persisted results, background jobs, account memory, and operator tooling.”
- “The current flow lets people choose recommendation depth and then decide for
  themselves, a duo, or a same-device group.”
- “I added deterministic recommendation evals so hard avoids, bounded candidate
  selection, memory exclusions, and explanation requirements can regress in CI
  without spending provider credits.”
- “PopChoice v0.2.0 is deployed in production; the public build endpoint exposes
  version and commit provenance.”

## 7. What not to claim without more data

Do not claim user counts, conversion, retention, recommendation accuracy,
latency improvement, cost savings, production reliability, product-market fit,
or a final product outcome. Do not call protected dashboards live based only on
deployment configuration. Do not describe deterministic fixture output as a
real AI success story.

## 8. Shipped versus planned

**Shipped in development:** Fast Pick/Normal Match; Solo/Duo/same-device Group;
taste controls and hard avoids; persisted stable results; feedback; one-shot
more picks; movie memory; deterministic evals; Backoffice/Bull Board/Storybook/
docs/observability code surfaces.

**Planned:** multi-device rooms, invite links, QR/projector flow, a canonical
`TasteSignal[]` backend, broader TMDB-first evolution, and any unimplemented
roadmap item.

## 9. Questions for the owner

1. Is the original Figma Make file still available, and may it be linked or
   screenshotted in a public case study?
2. Was the mascot redrawn in Figma, Affinity Designer, or another tool?
3. Which protected operator surfaces may be captured, with what redaction?
4. Is there an approved staging budget for one live-provider recommendation
   scenario?
5. Are there attributable friend/family quotes that may be used as qualitative
   observations, with consent and without presenting them as research?
6. Is the design-system route intentionally private, or should its broken
   `/style-guide` internal links and public navigation status be completed first?

## 10. Recommended next step in `portfolio-2025`

Create a separate portfolio worktree. Read this handoff and linked source files,
then update the case study using only **Production verified** and **Shipped in
development** claims with their labels preserved in working notes. Keep the four
production screenshots as a compact entry-flow story. Use the deterministic Duo
result, progress, and failure captures as development evidence with their
controlled-state provenance preserved.
Keep planned room flows and unverified outcome/metric claims out of visitor copy.

Suggested visitor-facing lines:

- “Choose how deep to go, then pick for yourself, a duo, or the whole couch.”
- “A stable result survives the wait, reloads, and gives feedback a path back
  into future picks.”
- “Deterministic evals keep taste constraints testable without turning CI into a
  paid model-quality experiment.”
