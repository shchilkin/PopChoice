---
status: accepted
---

# Current rewatch intent can override watched memory

A `watched` movie-memory signal excludes a movie by default but is not a Hard Constraint. Explicit Rewatch Intent for the current viewing occasion makes watched movies eligible again, allowing current intent to override historical viewing state without deleting that history. A `not_interested` signal remains excluded until the user explicitly corrects their movie memory.

## Consequences

- Candidate eligibility must distinguish current Hard Constraints from durable Memory Exclusions.
- Rewatch Intent changes eligibility only for watched movies, not for every negative memory signal.
- Movie memory remains truthful history even when current intent temporarily changes candidate selection.
