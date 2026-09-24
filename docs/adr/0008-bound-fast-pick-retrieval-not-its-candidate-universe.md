---
status: accepted
---

# Bound Fast Pick retrieval, not its candidate universe

Fast Pick uses the same TMDB Candidate Universe as other non-curated Recommendation Experiences, but applies Bounded Retrieval to protect its speed and cost promise. Its target is to return a result within five seconds, and it must stop Fast Pick work after eight seconds. If that bounded plan cannot find an Eligible Candidate, PopChoice does not silently widen the search. It presents the result honestly and offers Deepen Search, an explicit transition to Normal Match that preserves the participants' current answers, Hard Constraints, and Audience Context.

## Consequences

- Fast Pick is fast because it asks less and spends a smaller retrieval budget, not because it searches a smaller catalog.
- Fast Pick metrics should measure the five-second target separately from the eight-second hard limit.
- The system must distinguish “no eligible candidate found within this retrieval budget” from “no eligible candidate exists.”
- Deepen Search reuses the current recommendation intent instead of starting a new questionnaire.
- Metrics and evals should record the effective Retrieval Plan, whether Bounded Retrieval was exhausted, and whether the user chose Deepen Search.
- The product must not silently change Recommendation Experience or incur Normal Match work while presenting the request as Fast Pick.
