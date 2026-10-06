---
status: accepted
---

# Persist bounded candidate traces and sample full debug traces

Every Recommendation Attempt persists a Bounded Candidate Trace with each Retrieval Lane's query identity, candidate counts, filter counts, and rejection categories. Detailed eligibility evidence and score breakdowns are retained only for the Candidate Shortlist and displayed results. Raw TMDB pages are not copied into recommendation history. A sampled Debug Candidate Trace may retain the complete candidate progression for troubleshooting and calibration, but it has a short TTL.

## Consequences

- Ordinary recommendation storage grows with lane and shortlist size rather than raw provider result volume.
- Operators can distinguish retrieval scarcity, hard-constraint rejection, quality-gate rejection, and ranking outcomes.
- Debug sampling rate and TTL are operational configuration recorded outside high-cardinality metrics labels.
- Sensitive free text should be referenced through the minimized intent snapshot rather than duplicated across trace rows.
- Expired debug traces do not affect the reproducibility of durable policy and shortlist decisions.
