---
status: accepted
---

# Allow one targeted preference refinement

When Normal Match completes retrieval but no Eligible Candidate passes the Recommendation Quality Gate, PopChoice may ask one targeted Preference Refinement question. It preserves the current Audience Context, all prior answers, and every Hard Constraint, then performs one new retrieval and ranking attempt. If the second attempt still yields no Confident Match, the experience ends honestly without a recommendation and offers manual answer editing. It does not restart the quiz, silently relax constraints, or enter an unbounded clarification loop.

## Consequences

- The low-confidence result must identify one useful ambiguity or missing high-impact Preference.
- Recommendation intent needs a new revision while preserving provenance from the original request.
- Metrics should distinguish first-pass success, refinement offered, refinement accepted, and second-pass success.
- The refinement answer may change Preferences and Retrieval Lanes but not participant-owned Hard Constraints.
- A second failed quality gate produces a terminal no-confident-match state for that attempt.
