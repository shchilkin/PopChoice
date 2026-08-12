---
status: accepted
---

# Build candidate sets from multiple TMDB retrieval lanes

A non-curated Retrieval Plan builds its TMDB Retrieval Set by unioning multiple bounded Retrieval Lanes rather than relying on one Discover request. The available lanes include constraint-aware Discover, Similar or Recommendations for a reference movie, and genre or keyword retrieval derived from current intent. Results are deduplicated by TMDB ID, enriched as required, revalidated against Hard Constraints, and only then ranked.

Fast Pick and Normal Match use the same lane model and candidate universe. Fast Pick selects fewer lanes and gives them smaller page, enrichment, and timing budgets; Normal Match may explore more lanes more deeply.

## Consequences

- Retrieval breadth is an explicit part of the effective Retrieval Plan and must be observable.
- A lane may fail without automatically invalidating the entire request if other lanes can still produce enough Eligible Candidates.
- Hard Constraints shape each lane where TMDB supports them and are always rechecked after enrichment.
- Duplicate movies from different lanes retain provenance so ranking and evals can inspect which intents retrieved them.
- The system needs deterministic merge and budget-allocation rules rather than a sequential local-first fallback chain.
