---
status: accepted
---

# Derive retrieval from audience and experience

Recommendation V2 exposes two product dimensions: Audience Context and Recommendation Experience. Candidate source is not a third user-facing axis; an internal Retrieval Plan is derived from the selected experience and audience to control query breadth, enrichment, compromise ranking, and latency. Curated Picks remains an experience with a deliberately bounded Curated Collection, while every other experience uses the TMDB Candidate Universe. This removes source-strategy complexity from the product contract while retaining operational control inside the recommendation system.

## Consequences

- Fast Pick, Normal Match, Taste Swipe, and Curated Picks are Recommendation Experiences rather than combinations of depth and source flags.
- Solo, Duo, and Group remain orthogonal Audience Contexts.
- Internal identifiers such as `hybrid-fast`, `tmdb-first`, and `compromise-hybrid` may survive as Retrieval Plan implementations but are not product concepts.
- Persistence and eval reports should record Audience Context, Recommendation Experience, and the effective Retrieval Plan separately.
- The Recommendation V2 epic should no longer describe candidate source as an independent product axis.
