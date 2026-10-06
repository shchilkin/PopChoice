---
status: accepted
---

# Bound AI to resolvable taste query proposals

The Query Planner uses deterministic mappings for structured quiz answers and TMDB Similar or Recommendations endpoints for a resolved reference movie. Free-text intent may ask AI for taste-oriented genre or keyword Query Proposals, but every proposal must resolve to a real TMDB identifier before it can create a Retrieval Lane. AI does not generate candidate movie titles and cannot create or modify Hard Constraints.

## Consequences

- Maintained mappings from structured product answers to TMDB identifiers become versioned recommendation assets.
- AI output for retrieval is structured, validated, and observable rather than treated as a free-form candidate list.
- An unresolved Query Proposal is discarded without weakening confirmed constraints.
- Prompt and model changes can affect taste expansion but cannot alter the candidate contract or constraint semantics.
- Retrieval evals should distinguish deterministic lanes, reference-movie lanes, accepted Query Proposals, and rejected proposals.
