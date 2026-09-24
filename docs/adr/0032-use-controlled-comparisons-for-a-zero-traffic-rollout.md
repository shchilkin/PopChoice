---
status: accepted
---

# Use controlled comparisons for a zero-traffic rollout

PopChoice does not have enough user traffic to produce meaningful shadow-run or percentage-rollout evidence. Recommendation V2 therefore uses a Recommendation Comparison Harness to run deterministic personas, saved provider scenarios, and manual dogfood intents through V1 and V2 with trace and quality comparison. After the Release Gate passes, V2 becomes the default. V1 remains temporarily available through a Recommendation Kill Switch for rapid rollback.

Percentage rollout, experiment allocation, and traffic-based statistical infrastructure are deferred until real usage can support them.

## Consequences

- The project does not build an A/B system for portfolio appearance without statistical value.
- Comparison evidence must be reproducible and tied to both pipelines' Policy Version Bundles.
- Backoffice should make candidate, invariant, quality, fairness, latency, and provider differences inspectable.
- V1 and V2 dual maintenance has a planned end date after V2 stability is demonstrated.
- Dogfood observations remain qualitative evidence and must not be presented as user-traffic outcomes.
