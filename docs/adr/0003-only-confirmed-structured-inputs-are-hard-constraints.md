---
status: accepted
---

# Only confirmed structured inputs are hard constraints

Recommendation V2 grants veto semantics only to structured constraints explicitly selected or confirmed by the participant. Free text may produce a Proposed Constraint, but it remains a Preference until confirmation; legacy text fields must not silently create Hard Constraints. This gives up some automatic interpretation in exchange for predictable filtering and an honest product promise.

## Consequences

- The recommendation request needs a typed Hard Constraint contract separate from free-text context.
- The product may suggest a Proposed Constraint extracted from text, but must obtain confirmation before enforcing it.
- Compatibility adapters can preserve legacy text as Preferences while callers migrate.
- Eligibility filtering consumes confirmed structured values, not prompt wording or inferred string weights.
