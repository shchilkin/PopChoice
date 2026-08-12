---
status: accepted
---

# Include Maybe Tonight as direct intent without guaranteeing it

A Maybe Tonight Reaction adds that movie to the current TMDB Retrieval Set as a Direct Intent Candidate even if no other Retrieval Lane returns it. Direct inclusion does not guarantee selection: the movie must satisfy every Hard Constraint, pass the Recommendation Quality Gate, and compete in ordinary ranking against other candidates. Multiple Maybe Tonight movies follow the same comparison.

## Consequences

- The retrieval merge must preserve direct-intent provenance for the reacted TMDB ID.
- A Direct Intent Candidate cannot be dropped merely because lane budgets are full.
- Ineligible or low-quality direct-intent movies need an honest explanation rather than silent disappearance.
- Maybe Tonight strength is a ranking input, not an eligibility override.
- Evals should cover direct-intent wins, losses, hard-constraint rejection, and quality-gate rejection.
