---
status: accepted
---

# Use TMDB as the non-curated candidate universe

Every recommendation mode except Curated Picks discovers candidates from the TMDB Candidate Universe. The Local Movie Cache accelerates and enriches retrieval but never gates whether TMDB is queried or defines the full set of possible movies. Curated Picks remains the deliberate exception because its bounded Curated Collection is part of that mode's product promise. This accepts TMDB availability and request-budget costs in exchange for avoiding the severe coverage ceiling of a DB-first recommendation system.

## Consequences

- Local candidate counts must not decide whether a non-curated mode may query TMDB.
- Fast Pick, Normal Match, Taste Swipe, Duo, and Group all start from the same broad candidate universe even when their retrieval budgets differ.
- A non-curated final ranking may only contain movies from the current TMDB Retrieval Set; local vector search cannot inject candidates that TMDB retrieval did not return.
- A fresh TMDB Query Cache entry may satisfy a retrieval query without a live provider call; the candidate universe remains TMDB-derived.
- The mere presence of local movie rows is not equivalent to a cached TMDB query and must not suppress provider retrieval.
- Hard Constraints should shape TMDB discovery and be rechecked after enrichment before ranking.
- Local embeddings, identity, movie memory, recommendation history, and cached metadata remain valuable enrichment and reranking inputs for matching TMDB IDs.
- Raw TMDB discovery pages belong in the TMDB Query Cache and are not imported into the movie catalog.
- Cache Admission is limited to enriched candidates that reach final ranking and movies shown as recommendations.
