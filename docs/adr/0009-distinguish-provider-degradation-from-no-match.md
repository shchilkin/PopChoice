---
status: accepted
---

# Distinguish provider degradation from no match

When TMDB is unavailable, non-curated Recommendation Experiences may enter Degraded Retrieval using cached TMDB query results no older than seven days. Cached candidates must still be revalidated against every active Hard Constraint using available evidence. If the degraded path cannot produce enough Eligible Candidates, PopChoice reports technical unavailability. It must not claim that no matching movie exists or ask participants to relax constraints when provider failure prevented a trustworthy search.

## Consequences

- Provider failure, retrieval-budget exhaustion, and a completed no-match search are distinct outcomes in APIs, persistence, metrics, and UI copy.
- Degraded Retrieval may use stale query results but does not turn the Local Movie Cache into a separate candidate universe.
- Missing cached evidence for a Hard Constraint keeps a candidate ineligible.
- Seven days is the maximum age for a degraded TMDB query result; normal freshness policy may be shorter.
- Constraint Review is not shown solely because TMDB is unavailable.
