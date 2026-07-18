---
status: accepted
---

# Use deterministic shortlisting before AI reranking

After retrieval and enrichment, PopChoice deterministically applies Hard Constraints and scores the remaining Eligible Candidates into a bounded Candidate Shortlist. AI may then rerank that shortlist and produce explanations, but it must return only supplied TMDB IDs. AI cannot introduce movie titles, restore an ineligible candidate, or change Hard Constraint outcomes. If AI is unavailable or its structured output is invalid, the deterministic shortlist order becomes the recommendation order.

## Consequences

- Candidate eligibility and fallback behavior remain testable without a live AI provider.
- AI prompt changes affect ordering and explanation quality, not candidate membership or safety guarantees.
- The shortlist contract must include stable TMDB IDs and enough normalized evidence for reranking and explanation.
- Invalid, missing, duplicate, or out-of-set AI IDs trigger deterministic fallback behavior.
- Evals should measure deterministic retrieval and shortlisting separately from AI reranking quality.
