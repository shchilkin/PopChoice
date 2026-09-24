---
status: accepted
---

# Version recommendation intent within the existing API lifecycle

Recommendation V2 continues to use `POST /api/recommendations` and the existing persisted status, polling, result, feedback, and stable-link lifecycle. UI-specific payloads are adapted into a versioned Canonical Recommendation Intent. Each Recommendation Attempt persists its Recommendation Engine Version and Policy Version Bundle. The temporary Recommendation Kill Switch changes internal engine routing without changing the client endpoint or result URL contract.

## Consequences

- A separate `/api/v2` route is not required for the recommendation-engine migration.
- Quiz, Taste Swipe, and future clients share one canonical domain contract through input adapters.
- Engine-specific execution data stays behind the feature boundary rather than leaking into route components.
- Existing result links remain readable after V1 retirement because attempts retain engine and policy provenance.
- Public response compatibility and internal semantic versioning require separate tests.
