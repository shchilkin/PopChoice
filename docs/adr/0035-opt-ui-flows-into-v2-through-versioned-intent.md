---
status: accepted
---

# Opt UI flows into V2 through versioned intent

During migration, only a Canonical Recommendation Intent with `intentVersion: 2` runs Recommendation V2. Existing quiz payloads continue to route to V1 through the Legacy Intent Adapter. Each UI flow adopts V2 deliberately. The adapter never promotes legacy free text into Hard Constraints. After every supported flow emits canonical intent and the rollback window closes, PopChoice removes V1 engine routing and the legacy adapter.

## Consequences

- V1/V2 comparisons use explicit engine selection rather than inferred request shape.
- Semantic changes cannot silently affect old clients or partially migrated UI flows.
- The V2 Tracer Slice includes its UI-to-intent adapter, not only engine internals.
- Legacy compatibility has an explicit deletion condition and is not a permanent architecture layer.
- Tests cover routing for missing, supported, and unsupported intent versions.
