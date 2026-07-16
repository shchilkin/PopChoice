---
title: 'Portfolio Evidence Pack'
description: 'A source-linked PopChoice evidence index for future portfolio work.'
---

# PopChoice Portfolio Evidence Pack

This directory is a compact handoff for a future PopChoice case-study update in
`portfolio-2025`. It does not replace canonical product or operations docs.

## Status vocabulary

| Label                      | Meaning                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Production verified**    | Observed on the public production surface on the stated date.                                                 |
| **Development verified**   | Observed in a controlled run against development code; not production behavior.                               |
| **Shipped in development** | Implemented and backed by code/tests on `development`; not automatically claimed as live production behavior. |
| **Planned**                | Documented future work or issue-backed direction, not current behavior.                                       |
| **Anecdotal / unverified** | Owner recollection or a plausible historical statement without enough primary evidence.                       |

## Evidence index

- [Product flow](/docs/portfolio-evidence/PRODUCT-FLOW): current browser path,
  audience variants, taste controls, result actions, and account boundaries.
- [Recommendation scenario](/docs/portfolio-evidence/RECOMMENDATION-SCENARIO): one
  reproducible deterministic, memory-aware scenario.
- [Controlled Duo quality](/docs/portfolio-evidence/CONTROLLED-DUO-QUALITY): a
  fixed-candidate compromise protocol with a credit-free validation mode, one
  recorded rejected live result, and an explicitly manual quality-review boundary.
- [Persisted lifecycle](/docs/portfolio-evidence/PERSISTED-LIFECYCLE): API,
  persistence, queue, polling, terminal states, and recovery evidence.
- [Operations](/docs/portfolio-evidence/OPERATIONS): operator surfaces and their
  shipped/live-verification status.
- [Design evolution](/docs/portfolio-evidence/DESIGN-EVOLUTION): evidence-backed
  design milestones and unresolved provenance.
- [Portfolio handoff](/docs/portfolio-evidence/PORTFOLIO-HANDOFF): claim table,
  screenshot manifest, safe case-study copy, blockers, and next step.

## Production snapshot

**Production verified — 2026-07-16.**
[`/api/build`](https://pop-choice.shchilkin.dev/api/build) reported PopChoice
`v0.2.0`, channel/environment `production`, branch `main`, and commit
`d5da1cd`. [`/api/health`](https://pop-choice.shchilkin.dev/api/health) reported
PostgreSQL and Redis healthy. The release commit is tagged
[`v0.2.0`](https://github.com/shchilkin/PopChoice/releases/tag/v0.2.0).

This snapshot verifies deployment provenance and dependency health only. It does
not prove recommendation quality, traffic, conversion, latency, reliability, or
any protected operator surface.

## Screenshot policy

Screenshots in `assets/` use the English locale, a 1440 × 900 desktop viewport,
reduced/disabled motion, no credentials, and no personal data. Assets `01`–`04`
are read-only public production states. Assets `05`–`08` come from the isolated
deterministic development harness: the Duo quiz completes through the real
browser/API/database path, while progress and failure are controlled persisted
states of that same result record. Images are evidence of UI and persistence
contracts, not proof of AI quality, recommendation quality, product usage, or a
real production incident.

## Reproduce the deterministic captures

Run the capture only against the disposable E2E database:

```bash
npm run test:e2e:setup
CAPTURE_PORTFOLIO_EVIDENCE=1 npm run test:e2e:run -- --grep "normal duo"
npm run test:e2e:down
```

The capture branch inside `apps/web/e2e/recommendation.spec.ts` writes the four
development screenshots, then restores the record to `completed`. The ordinary
E2E run does not write evidence assets.
