---
title: 'Recommendation Scenario'
description: 'One reproducible deterministic PopChoice recommendation example.'
---

# Recommendation Scenario

## Feedback-memory repeat avoidance

**Shipped in development.** This is the deterministic fixture
`taste-feedback-memory-repeat-avoidance`. It exercises filtering and result
shape without OpenAI, TMDB, Redis, PostgreSQL, or production writes. It is not a
claim about live model quality. Source:
[fixture](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/features/recommendation/evals/fixtures.ts),
[runner](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/features/recommendation/evals/runner.ts),
and [scoring](https://github.com/shchilkin/PopChoice/blob/development/apps/web/src/features/recommendation/evals/scoring.ts).

| Field                        | Reproducible value                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Mode / audience              | Memory-aware, hybrid-fast, solo viewer `Riley`                                                                                        |
| Taste signals                | No reference movie; mood `Mystery` + `Heartwarming`; era `Balanced`; tone `Gentle`; brief: “Need a softer reset after recent misses.” |
| Direct hard avoids           | None in the quiz answer for this fixture                                                                                              |
| Feedback-derived constraints | `Familiar Romcom` is watched, `Three-Hour Epic` is wrong mood, and `Gore Carnival` is not interested                                  |
| Candidate source strategy    | `hybrid-fast`: at least one `local-cache` and one `tmdb-discover` result are required                                                 |
| Bounded candidate set        | Six fixture candidates: Cozy Mystery, Familiar Romcom, Three-Hour Epic, Gore Carnival, Ensemble Comedy, Family Adventure              |
| Selected film                | `PopChoice E2E Cozy Mystery`                                                                                                          |
| Alternatives                 | `PopChoice E2E Ensemble Comedy`; `PopChoice E2E Family Adventure`                                                                     |
| Explanation                  | “For the solo viewer, Cozy Mystery respects feedback memory: it avoids watched titles, wrong mood signals, and rejected picks.”       |
| Forbidden results            | Familiar Romcom, Three-Hour Epic, and Gore Carnival                                                                                   |
| Passing threshold            | At least 90 points, three result movies, three metadata-complete candidates, and the required explanation terms                       |

Run it with the default deterministic gate:

```bash
npm run eval:recommendations
```

The generated report is written to
`apps/web/test-results/recommendation-evals/report.json` and is intentionally
ignored by Git.

## What the fixture proves

**Shipped in development.** The evaluation contract checks that the returned
main title belongs to the allowed set, memory-derived excluded titles do not
appear, source distribution meets the configured minimums, the explanation
contains the expected concepts, and the result has enough alternatives and
metadata.

## What it does not prove

**Anecdotal / unverified.** It does not measure recommendation accuracy,
real-user satisfaction, live model behavior, production latency, catalog
coverage, or whether the same inputs would select the same real film from the
current production catalog.

## Controlled two-taste follow-up

**Shipped in development — protocol ready, provider run not performed.** The
[Controlled Duo quality protocol](/docs/portfolio-evidence/CONTROLLED-DUO-QUALITY)
uses `Amélie` and `Mad Max: Fury Road` as contrasting references, four fixed
real-film candidates, shared hard constraints, one optional ranking call, and a
separate owner-review step. Its default command makes zero provider calls.

This follow-up is intentionally separate from the deterministic `32/32` report.
Adding a prepared protocol must not inflate the CI count or imply that
subjective quality has passed.
