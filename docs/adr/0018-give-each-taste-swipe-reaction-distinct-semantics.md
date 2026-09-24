---
status: accepted
---

# Give each Taste Swipe reaction distinct semantics

Taste Swipe reactions are not values on one generic like-dislike scale. Seen excludes the exact movie from the current attempt without taste valence. Loved It contributes strong positive taste evidence, marks the movie as watched, and excludes it from the current attempt. Not for Me contributes strong negative evidence and excludes the movie. Maybe Tonight contributes strong current positive evidence while keeping that movie eligible for recommendation. Skip only advances the deck and creates no taste or movie-memory evidence.

Signed-in reactions may persist through the corresponding movie-memory representation. Anonymous reactions remain session-local for the recommendation attempt.

## Consequences

- Recommendation inputs must preserve reaction type rather than collapsing reactions to one numeric value too early.
- Loved It requires both positive evidence and exact-movie exclusion.
- Maybe Tonight is the only positive swipe reaction that keeps the reacted movie eligible for the current result.
- Skip may suppress immediate card repetition inside the session but must not become durable memory or ranking evidence.
- Movie-memory persistence needs to represent the reaction semantics without losing the distinction between durable taste and current intent.
