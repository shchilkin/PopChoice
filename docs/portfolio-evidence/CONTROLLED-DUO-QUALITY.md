---
title: 'Controlled Duo Quality Protocol'
description: 'A fixed-candidate protocol for reviewing how PopChoice balances two contrasting taste profiles.'
---

# Controlled Duo Quality Protocol

## Current status

**Development verified — first provider run rejected.** The protocol was first
validated without calling OpenAI, then run once with explicit budget approval.
The live response passed six of seven automated checks but selected the
deliberately weaker comparison candidate. The owner rejected the compromise.

The question is narrow: can the production ranking prompt choose one plausible
bridge between two contrasting profiles and explain the compromise without
violating their shared constraints?

## Fixed inputs

| Field              | Alex                                       | Sam                                        |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| Reference film     | `Amélie`                                   | `Mad Max: Fury Road`                       |
| Taste signals      | whimsical, romantic, playful, humane       | kinetic, stylish, energetic, bold          |
| Preferred tone     | warm and charming                          | bold with momentum                         |
| Shared constraints | no horror; no film longer than 125 minutes | no horror; no film longer than 125 minutes |

## Bounded candidate set

The live protocol does not run retrieval, embeddings, TMDB discovery, database
queries, poster lookup, or description generation. It passes four fixed movies
directly to the same `getRecommendation` ranking function used by the product.
That isolates compromise quality from candidate-retrieval quality and limits a
live run to one provider call.

| Candidate                     | Runtime | Role in the protocol                                                                 | Metadata source                                                           |
| ----------------------------- | ------: | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `Run Lola Run`                |  81 min | Strong bridge: romantic urgency and playful structure; kinetic pacing and bold style | [TMDB](https://www.themoviedb.org/movie/104-lola-rennt)                   |
| `Scott Pilgrim vs. the World` | 112 min | Strong bridge: playful romance and comic charm; kinetic action and stylish editing   | [TMDB](https://www.themoviedb.org/movie/22538-scott-pilgrim-vs-the-world) |
| `Baby Driver`                 | 113 min | Strong bridge: romantic escape and human connection; kinetic driving and rhythm      | [TMDB](https://www.themoviedb.org/movie/339403-baby-driver)               |
| `The Grand Budapest Hotel`    | 100 min | Bounded comparison: strong Alex fit and visual style, but weaker energetic overlap   | [TMDB](https://www.themoviedb.org/movie/120467-the-grand-budapest-hotel)  |

Every candidate already satisfies the shared hard constraints. The comparison
movie remains in the set so the test can distinguish a valid candidate from a
strong compromise.

## Acceptance contract

Automated checks require the response to:

- match the production ranking response schema;
- select a title from the fixed candidate set;
- select one of the three pre-declared bridge candidates;
- name both Alex and Sam;
- represent at least one taste signal from each profile;
- explain the choice in at least 120 characters.

Passing those checks is not the same as passing a quality review. The owner must
still answer:

1. Does the film feel like a fair bridge rather than a win for one person?
2. Does the explanation connect the film to both profiles rather than repeat
   prompt keywords?
3. Is the recommendation credible for the stated night?

## Recorded live result

The first controlled live run was recorded on 2026-07-16 and made exactly one
provider call. The complete sanitized report is stored in
[`results/controlled-duo-live-2026-07-16.json`](https://github.com/shchilkin/PopChoice/blob/development/docs/portfolio-evidence/results/controlled-duo-live-2026-07-16.json).

| Field            | Result                                                                |
| ---------------- | --------------------------------------------------------------------- |
| Selected film    | `The Grand Budapest Hotel`                                            |
| Automated checks | 6 of 7 passed                                                         |
| Failed check     | `bridge-selection`                                                    |
| Review status    | `blocked-by-automated-checks`                                         |
| Owner verdict    | Rejected: too little kinetic overlap for Sam despite fluent reasoning |

The result stayed inside the fixed set, respected the shared constraints,
named Alex and Sam, represented terms from both profiles, and provided a
detailed explanation. It still failed the central compromise test. The
explanation made the weaker overlap sound resolved instead of demonstrating
that the selected film was a strong bridge.

This is useful negative evidence, not a recommendation-quality success. The
next live run should wait until bridge fit is represented explicitly in the
ranking policy.

## Reproduce without provider spend

```bash
npm run eval:recommendations:duo
```

This validates the people records, candidate uniqueness, hard constraints, and
bridge coverage. It writes
`apps/web/test-results/recommendation-evals/controlled-duo-report.json` with
`providerCallCount: 0`, `status: protocol-ready`, and `reviewStatus: not-run`.

## Optional live run

Only run this after explicit API-budget approval and with `OPENAI_API_KEY`
configured:

```bash
npm run eval:recommendations:duo -- --live
```

Live mode makes one ranking call. If automated checks pass, the report uses
`status: awaiting-owner-review` and `reviewStatus: pending-owner-review`. It does
not emit a final recommendation-quality pass.

## Evidence boundary

**Proven now:** the protocol is executable, bounded, credit-free by default,
uses valid production-shaped inputs, and can separate machine-checkable
constraints from subjective review. One controlled provider response also
showed that fluent reasoning can overstate a weak taste overlap.

**Not yet proven:** that the configured provider selects convincing bridges
consistently, that the ranking policy prevents weak compromises, or that
production users receive better recommendations.
