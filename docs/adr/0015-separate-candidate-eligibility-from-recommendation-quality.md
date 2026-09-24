---
status: accepted
---

# Separate candidate eligibility from recommendation quality

Hard Constraints determine whether a movie is an Eligible Candidate. A separate Recommendation Quality Gate determines whether an eligible movie is a Confident Match worth presenting. If no candidate passes the gate, PopChoice does not force a recommendation by returning the best of a weak set. Fast Pick offers Deepen Search; Normal Match asks participants to refine Preferences. Quality thresholds are calibrated through evals for each Audience Context and Recommendation Experience and are not chosen or overridden by AI.

## Consequences

- Eligibility rate and confident-match rate are separate metrics.
- A completed retrieval can return eligible candidates without producing a recommendation.
- APIs and persisted results need a distinct low-confidence outcome separate from provider degradation, retrieval-budget exhaustion, and constraint no-match.
- Eval fixtures must include weak-but-eligible candidate sets that fail the gate.
- Threshold changes are versioned ranking policy changes and require regression evaluation.
