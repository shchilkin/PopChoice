---
status: accepted
---

# Require explicit consent to adopt anonymous swipe memory

After an anonymous participant receives a result and creates an account, PopChoice may offer an explicit “Save my taste” Memory Adoption action. Seen, Loved It, and Not for Me become signed-in Movie Memory Events using their established Watch Status and Taste Status semantics. Maybe Tonight remains occasion-scoped and Skip remains non-evidence. Without explicit action, no anonymous reaction is attached to the account. Adoption is one-time and idempotent.

## Consequences

- Signup alone does not authorize importing anonymous reaction data.
- The adoption token must be short-lived, scoped to one anonymous session, and unusable after successful import.
- Repeated requests cannot create duplicate Movie Memory Events or change the resulting snapshot.
- UI copy must distinguish account creation from optional taste-memory import.
- Audit and privacy tests should prove that Maybe Tonight and Skip never enter durable movie memory through adoption.
