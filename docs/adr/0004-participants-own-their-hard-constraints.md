---
status: accepted
---

# Participants own their hard constraints

Each Hard Constraint belongs to the participant who confirmed it, and only that Constraint Owner may revise or remove it. A host may request reconsideration after a no-valid-match result but cannot override another participant's veto. This adds coordination steps to group recovery while preserving the meaning of participant confirmation and preventing host authority from silently weakening individual boundaries.

## Consequences

- Same-device flows must return control to the Constraint Owner for revision.
- Room-backed flows must associate each Hard Constraint with a participant session.
- Group constraint evaluation applies every participant's confirmed constraints regardless of who created the room.
- A no-valid-match recovery flow may suggest changes but cannot apply them without the Constraint Owner's confirmation.
