---
status: accepted
---

# Select alternatives for diversity after the primary pick

PopChoice selects the Primary Pick as the highest-ranked Eligible Candidate after deterministic scoring and any valid AI Reranking. It then selects Alternative Picks with a diversity-aware policy across genre, era, and discovery familiarity instead of returning the next candidates by score alone. Every alternative must still satisfy all Hard Constraints and a minimum acceptable fit; diversity cannot rehabilitate a weak or ineligible candidate.

## Consequences

- Primary ranking quality and alternative-set usefulness are separate eval dimensions.
- Alternative selection runs after the Primary Pick and must not change it.
- Diversity logic needs normalized genre, release-era, and familiarity evidence.
- The system should avoid near-duplicate alternatives even when they occupy adjacent score positions.
- The exact diversity tradeoff and minimum fit remain calibratable policy values rather than AI discretion.
