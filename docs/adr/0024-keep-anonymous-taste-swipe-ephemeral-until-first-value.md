---
status: accepted
---

# Keep anonymous Taste Swipe ephemeral until first value

Anonymous Taste Swipe is a no-account path from reactions to one stable recommendation. Its purpose is to solve cold start, remove signup friction before first value, and let PopChoice evaluate the swipe experience independently of accumulated account memory. The working Anonymous Swipe Session is resumable for at most 24 hours. When recommendation processing begins, PopChoice creates a minimized Recommendation Intent Snapshot containing TMDB IDs, normalized signal types, and policy version, then deletes the working session. Expiry also deletes an unfinished session.

Anonymous use does not create Movie Memory Events, a Movie Memory Snapshot, or an implicit profile.

## Consequences

- Issue #920 remains valuable as the proof of the complete swipe-to-result loop without an account dependency.
- Long-term personalization remains the responsibility of signed-in persistence in issue #923.
- The completed result may remain stable without retaining UI action order or the anonymous session token.
- Signup is offered after first value as a way to save useful reactions, not required before recommendation.
- Anonymous session storage needs TTL enforcement and data-minimization tests.
