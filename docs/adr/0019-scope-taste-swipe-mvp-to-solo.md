---
status: accepted
---

# Scope Taste Swipe MVP to Solo

The first Taste Swipe release supports only the Solo Audience Context for both anonymous and signed-in participants. Signed-in persistence is a follow-up slice built on the same reaction semantics. Duo and Group swipe experiences are excluded because they require explicit interaction ownership, privacy, turn-taking, and compromise-scoring product decisions. The domain model should preserve participant ownership so a later Group Swipe can extend it without redefining reaction semantics.

## Consequences

- Issue #920 must not imply Duo or Group acceptance criteria.
- Issue #923 adds signed-in persistence without changing the Solo card interaction.
- Audience and experience remain separate domain concepts even though the MVP compatibility matrix does not expose every combination.
- Group Swipe needs its own design and implementation issue before it becomes a supported Recommendation Experience combination.
- MVP browser coverage includes anonymous Solo and later signed-in Solo, not pass-the-phone or shared voting.
