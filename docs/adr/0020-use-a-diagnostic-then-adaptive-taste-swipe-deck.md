---
status: accepted
---

# Use a diagnostic then adaptive Taste Swipe deck

Taste Swipe begins with a Diagnostic Deck stratified across genre, era, popularity, and mainstream-to-niche familiarity. Its purpose is to gather broad taste evidence, not to preview the final Candidate Shortlist. After enough reactions, the experience transitions to an Adaptive Deck shaped by observed taste while reserving an exploration share for uncertain or uncovered preferences. A card's presence in either deck does not itself increase that movie's recommendation score.

## Consequences

- Deck selection and recommendation retrieval are separate policies with separate evals.
- The opening deck requires maintained coverage buckets rather than a single popularity sort.
- Adaptive selection needs reaction-derived taste clusters plus explicit exploration accounting.
- Exploration Cards should be purposeful and observable, not indistinguishable random noise.
- Deck exposure alone creates no Preference, movie-memory, or ranking signal.
