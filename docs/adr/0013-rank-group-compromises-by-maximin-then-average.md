---
status: accepted
---

# Rank group compromises by maximin, then average

For Duo and Group, PopChoice calculates a Participant Score for every Eligible Candidate and participant. It ranks candidates lexicographically: first maximize the lowest Participant Score, then use the group average as a tie-breaker. Every participant has equal weight; the host receives no ranking priority. Hard Constraints remain eligibility vetoes applied before compromise scoring.

## Consequences

- A majority favorite that performs badly for one participant ranks below a broadly acceptable compromise.
- Participant-level scoring must remain available through deterministic ranking and AI reranking inputs.
- Shared results use a Group Fit Explanation without participant names, preference attribution, or numeric Participant Scores.
- Detailed Participant Scores remain internal to evals and observability in v1.
- Group evals need explicit fairness checks for the least-satisfied participant, not only aggregate relevance.
- Adding participants may legitimately change the winner even when the group's average preference remains similar.
- AI reranking must preserve the maximin fairness contract or be rejected in favor of deterministic order.
