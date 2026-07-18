---
status: accepted
---

# Project current movie memory from immutable events

Signed-in movie-memory changes are recorded as immutable Movie Memory Events carrying source, occurrence time, and available session or recommendation provenance. A Movie Memory Snapshot projects the current Watch Status and Taste Status for each user and movie and serves latency-sensitive product reads. A user correction appends a new event and updates the snapshot instead of overwriting the only historical fact. Existing interaction rows migrate into baseline events and equivalent snapshots.

## Consequences

- Recommendation reads do not need to replay the full event history.
- Projection rules can evolve and snapshots can be rebuilt from events.
- Event writes and snapshot updates require transactional consistency or an explicitly recoverable projection path.
- APIs that mutate movie memory must record source and preserve movie identity by TMDB ID where available.
- Account deletion must remove both events and snapshots.
- Anonymous session reactions are not Movie Memory Events unless attached to a signed-in participant.
