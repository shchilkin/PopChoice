---
status: accepted
---

# Use Normal Match Solo as the first V2 tracer slice

After issue #606 establishes the executable Release Gate and V1 comparison baseline, the first end-to-end Recommendation V2 implementation is Normal Match for the Solo Audience Context. The slice includes normalized intent, typed Hard Constraints, multi-lane TMDB retrieval, deterministic shortlisting, bounded AI Reranking with fallback, Recommendation Quality Gate, Bounded Candidate Trace, and comparison against V1.

Fast Pick, Duo and Group compromise, Taste Swipe, and Curated Picks remain later slices built on the proven core.

## Consequences

- The tracer validates broad recommendation quality without initially carrying Fast Pick's eight-second hard budget.
- Solo avoids group fairness and privacy mechanics while preserving the same candidate and policy architecture.
- The slice must be user-complete and comparable, not only a set of internal interfaces.
- Fast Pick becomes a bounded Retrieval Plan over the same core instead of a separate pipeline.
- Ticket dependencies should place #606 before the Normal Match Solo V2 implementation issue.
