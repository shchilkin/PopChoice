---
status: accepted
---

# Version the effective policy of every recommendation attempt

Every Recommendation Attempt persists a Policy Version Bundle identifying the Query Planner mappings, effective Retrieval Plan, deterministic ranking, Result Diversity, Recommendation Quality Gate, active model IDs, and any Collection Version used. The attempt also retains its normalized Recommendation Intent Snapshot and final TMDB IDs. Policy identifiers and configuration hashes are stored instead of copying implementation source.

## Consequences

- Results and eval regressions can be attributed to specific policy or model changes.
- Retries with a changed policy become new Recommendation Attempts rather than mutating historical execution context.
- Model aliases should record the resolved response model where available in addition to the requested ID.
- Analytics dimensions must avoid unbounded raw configuration labels; stable version identifiers belong in metrics and full hashes belong in persisted traces.
- Policy changes require an explicit version bump and representative eval comparison.
