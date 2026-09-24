---
status: accepted
---

# Store watch and taste as independent movie-memory dimensions

Movie memory stores Watch Status and Taste Status as independent dimensions rather than one mutually exclusive interaction kind. Loved It sets Watch Status to Seen and Taste Status to Liked. Seen sets only Watch Status. Not for Me sets Taste Status to Not Interested and excludes the exact movie according to current memory policy. Maybe Tonight remains session-scoped current intent rather than durable memory. Wrong Mood is Occasion Feedback and does not become a permanent Taste Status by itself.

Existing single-kind records must migrate without losing their known meaning.

## Consequences

- The current one-row, one-`kind` schema cannot remain the canonical movie-memory contract.
- APIs and UI filters must allow watch and taste facts to coexist for the same movie.
- Existing `watched` and `not_seen` rows map to Watch Status; `liked` and `not_interested` map to Taste Status; `wrong_mood` remains occasion-scoped evidence.
- Candidate filtering reads exact-movie exclusions independently from taste similarity signals.
- Current intent can override an allowed Memory Exclusion without rewriting durable memory.
