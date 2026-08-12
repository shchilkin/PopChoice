---
status: accepted
---

# Keep Curated Picks inside an editorial collection

Curated Picks is an editorial Recommendation Experience in which the participant explicitly selects a named Curated Collection. That collection is the complete candidate universe for the attempt. Preferences and movie memory may reorder its movies, and Hard Constraints may remove movies, but retrieval never adds candidates from TMDB or another collection. If no movie remains, PopChoice reports a Collection Mismatch and offers another collection or an explicit transition to Normal Match.

## Consequences

- Curated Picks must not share non-curated TMDB Retrieval Plans.
- Collection membership and editorial intent are product data, not cache state.
- Personalization can change ordering but cannot undermine the collection's promise.
- Collection Mismatch is distinct from provider degradation, quality-gate failure, and non-curated constraint no-match.
- Switching to Normal Match creates a new explicit experience attempt while preserving compatible participant constraints.
