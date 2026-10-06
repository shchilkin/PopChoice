---
status: accepted
---

# Use adaptive signal readiness for Taste Swipe

Taste Swipe does not complete after a fixed number of displayed cards. Seen, Loved It, Not for Me, and Maybe Tonight are Informative Swipe Reactions; Skip advances the deck without contributing taste evidence. A participant may request a recommendation after eight informative reactions. PopChoice may suggest completion between eight and twelve when the accumulated evidence is sufficient, and twelve informative reactions establish Swipe Readiness for retrieval.

## Consequences

- Card impressions, skipped cards, and informative reactions are separate metrics.
- The deck may need to show more than twelve cards when a participant frequently skips.
- Readiness evaluation must inspect signal coverage, not only count reactions.
- Anonymous session state must preserve reaction identity and order until the recommendation attempt completes.
- Recommendation Quality Gate still determines whether a ready swipe session produces a Confident Match.
