---
status: accepted
---

# Block Recommendation V2 release on invariants and measured quality

Recommendation V2 cannot roll out unless its Release Gate passes. Hard Constraint enforcement, supplied-TMDB-ID membership, privacy boundaries, and deterministic fallback behavior must pass at 100%. The deterministic recommendation eval must show no regression from the current baseline and cover required Solo, Duo, Group, no-match, provider-degradation, Fast Pick budget, and Taste Swipe scenarios. Live-provider evaluation and manual product QA are required release evidence but remain scheduled or manual rather than flaky CI jobs.

Numeric relevance and fairness thresholds are set only after measuring representative baselines; they are not invented during architecture planning.

## Consequences

- Invariant failures cannot be traded for higher average relevance scores.
- Baseline capture is an implementation prerequisite before policy tuning.
- Deterministic evals remain the CI-blocking layer; live-provider runs report evidence separately.
- Release evidence records the effective Policy Version Bundle and model IDs.
- Threshold calibration becomes a versioned, reviewable artifact linked to issue #606.
