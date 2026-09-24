---
status: accepted
---

# Keep group constraint recovery owner-private

When no eligible group recommendation exists, the shared view shows a Shared Constraint Summary without identifying which participant owns each blocking constraint. Exact constraints and revision controls remain private to their Constraint Owner, who may choose to disclose or change them. This reduces the social transparency of recovery but avoids blaming participants or exposing potentially sensitive answers in shared and projector views.

## Consequences

- Shared result and projector surfaces show constraint categories, not owner names or private answers.
- Each Constraint Owner needs a private Constraint Review path.
- Hosts can request review and observe readiness but cannot inspect another participant's exact constraints by default.
- Same-device flows should preserve the same privacy model even when privacy is procedural rather than technically isolated.
