---
status: accepted
---

# Treat hard constraints as candidate vetoes

Recommendation V2 treats every participant's Hard Constraint as a candidate-validity rule, not a ranking penalty. A movie that violates any participant's Hard Constraint cannot be recommended, and missing evidence counts as ineligible rather than assumed-safe. If no candidate is known to satisfy every Hard Constraint, PopChoice should report that no valid match exists and ask the participants to relax a constraint rather than silently violating one. This preserves trust at the cost of sometimes returning no recommendation.

## Consequences

- Ranking compares only candidates that satisfy every participant's Hard Constraints.
- Missing or inconclusive evidence for a Hard Constraint excludes the candidate.
- The product needs an explicit no-valid-match state and a way to revise constraints.
- Inputs that cannot be evaluated reliably must not be presented as Hard Constraints.
