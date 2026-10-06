# PopChoice Recommendation

The language of turning one or more participants' current intent and taste into a movie recommendation they can accept for this viewing occasion.

## Language

**Audience Context**:
The participant configuration whose preferences and constraints a recommendation represents: Solo, Duo, or Group.
_Avoid_: Audience size, people mode

**Recommendation Experience**:
The user-facing way participants provide intent and receive a recommendation: Fast Pick, Normal Match, Taste Swipe, or Curated Picks.
_Avoid_: Match depth, experience mode axis

**Taste Swipe MVP**:
The Solo-only first release of Taste Swipe for anonymous and signed-in participants. Duo and Group swipe interactions remain a separate future product slice.
_Avoid_: Group Swipe, all-audience swipe

**Anonymous Swipe Session**:
A resumable, non-profile Taste Swipe workspace retained for at most 24 hours so a visitor can reach first recommendation value without registration.
_Avoid_: Anonymous profile, durable movie memory

**Recommendation Intent Snapshot**:
A minimized, versioned record of the TMDB IDs and normalized signal types used to create a recommendation. For anonymous Taste Swipe it replaces the working session without creating Movie Memory.
_Avoid_: Raw interaction log, user profile

**Recommendation Attempt**:
One immutable execution of a normalized recommendation intent using a specific Audience Context, Recommendation Experience, effective Retrieval Plan, and Policy Version Bundle.
_Avoid_: User session, recommendation row only

**Canonical Recommendation Intent**:
The versioned internal request contract containing Audience Context, Recommendation Experience, participant-owned Hard Constraints, Preferences, current intent, and memory references independently of the UI payload that produced it.
_Avoid_: Quiz form data, API v2 body

**Recommendation Engine Version**:
The persisted identifier of the engine that executed a Recommendation Attempt, allowing V1 and V2 to share the same public recommendation lifecycle during migration.
_Avoid_: Endpoint version, deployment version

**Legacy Intent Adapter**:
The temporary boundary that keeps pre-V2 quiz payloads on V1 during migration. It never infers Hard Constraints from free text and is removed with V1 after all UI flows adopt the Canonical Recommendation Intent.
_Avoid_: Automatic V2 conversion, permanent compatibility layer

**V2 Tracer Slice**:
The first end-to-end Recommendation V2 implementation: Normal Match for Solo, covering normalized intent, typed constraints, multi-lane TMDB retrieval, deterministic shortlisting, bounded AI reranking, quality gate, trace, and V1 comparison.
_Avoid_: Foundation-only refactor, all-mode migration

**Policy Version Bundle**:
The identifiers and configuration hashes for the Query Planner mappings, Retrieval Plan, ranking, diversity, Recommendation Quality Gate, active model IDs, and optional Collection Version used by a Recommendation Attempt.
_Avoid_: Deployment version, copied source code

**Bounded Candidate Trace**:
The durable Recommendation Attempt evidence containing per-lane query and count summaries plus detailed eligibility and score breakdowns only for the Candidate Shortlist and displayed results.
_Avoid_: Raw provider response archive, full candidate log

**Debug Candidate Trace**:
A sampled, short-TTL diagnostic record that may retain the full candidate progression for troubleshooting and policy calibration.
_Avoid_: Standard recommendation history, permanent audit record

**Memory Adoption**:
An explicit, one-time, idempotent action after signup that converts eligible reactions from an Anonymous Swipe Session into signed-in Movie Memory Events.
_Avoid_: Automatic account merge, anonymous profiling

**Diagnostic Deck**:
The opening Taste Swipe card set stratified across genre, era, popularity, and mainstream-to-niche familiarity to learn broad taste coverage rather than propose recommendation finalists.
_Avoid_: Candidate shortlist, popular feed

**Adaptive Deck**:
The later Taste Swipe card stream shaped by accumulated reactions while retaining an exploration share outside the strongest inferred taste cluster.
_Avoid_: Personalized recommendations, filter bubble

**Exploration Card**:
An Adaptive Deck card deliberately sampled outside the currently strongest taste cluster to test uncertain or uncovered preferences.
_Avoid_: Random card, low-quality candidate

**Retrieval Plan**:
An internal policy derived from Audience Context and Recommendation Experience that controls query breadth, enrichment, ranking, and latency budget without changing the promised candidate universe.
_Avoid_: Candidate source strategy, user-selected source

**Bounded Retrieval**:
A Retrieval Plan with an explicit limit on query breadth, enrichment work, ranking work, or elapsed time. It limits how much of the candidate universe is examined, not which universe is available.
_Avoid_: Small catalog, local-only fast mode

**Fast Pick Budget**:
The Bounded Retrieval timing contract for Fast Pick: target a result within five seconds and stop Fast Pick work after eight seconds.
_Avoid_: Best-effort fast, provider timeout

**Deepen Search**:
An explicit transition from Fast Pick to Normal Match that preserves the current answers, Hard Constraints, and Audience Context while allowing a larger Retrieval Plan.
_Avoid_: Silent retry, automatic widening

**Hard Constraint**:
A structured, participant-confirmed requirement that every valid recommendation must satisfy. A candidate that violates any participant's hard constraint is invalid.
_Avoid_: Hard avoid, dealbreaker, veto

**Constraint Owner**:
The participant who confirmed a Hard Constraint and is the only participant who may revise or remove it.
_Avoid_: Room owner, host, constraint author

**Maximum Runtime**:
A Hard Constraint that sets the greatest acceptable movie duration in minutes for the current viewing occasion.
_Avoid_: Long-runtime preference, duration wish

**Excluded Genre**:
A Hard Constraint naming a movie genre that an eligible candidate must not have.
_Avoid_: Disliked genre, genre penalty

**Eligible Candidate**:
A movie known to satisfy every participant's Hard Constraints. Missing evidence for any Hard Constraint makes the movie ineligible.
_Avoid_: Valid candidate, safe candidate

**Candidate Shortlist**:
The bounded set of Eligible Candidates selected by deterministic scoring from the TMDB Retrieval Set for optional AI reranking.
_Avoid_: AI candidate list, final six

**Recommendation Quality Gate**:
A deterministic, eval-calibrated minimum-fit policy applied after eligibility. It prevents PopChoice from presenting the best available candidate when that candidate is still a weak match.
_Avoid_: Hard Constraint, AI confidence

**Recommendation V2 Release Gate**:
The blocking evidence contract requiring perfect invariant checks, no deterministic baseline regression, required scenario coverage, and explicit live-provider plus manual product evidence before rollout.
_Avoid_: CI green, subjective sign-off

**Recommendation Comparison Harness**:
A Backoffice and eval capability that runs the same versioned intent through V1 and V2 and presents candidate, quality, fairness, latency, and trace differences without relying on production traffic.
_Avoid_: Shadow traffic, A/B test

**Recommendation Kill Switch**:
A temporary operator control that restores V1 as the default after V2 release when an invariant, latency, or provider regression is observed.
_Avoid_: Permanent dual pipeline, percentage rollout

**Confident Match**:
An Eligible Candidate that passes the Recommendation Quality Gate for the current Audience Context and Recommendation Experience.
_Avoid_: Valid candidate, model-approved pick

**AI Reranking**:
Reordering a Candidate Shortlist and explaining the selection while referring only to supplied TMDB IDs. It cannot add candidates, change eligibility, or override deterministic fallback order.
_Avoid_: AI recommendation generation, title generation

**Primary Pick**:
The highest-ranked Eligible Candidate after deterministic scoring and valid AI Reranking.
_Avoid_: Main AI title, winner

**Alternative Pick**:
An Eligible Candidate selected after the Primary Pick using diversity-aware ordering across genre, era, and discovery familiarity while retaining a minimum acceptable fit.
_Avoid_: Next result, runner-up

**Result Diversity**:
The controlled variation among Alternative Picks that reduces near-duplicate choices without weakening Hard Constraints or the minimum fit requirement.
_Avoid_: Randomness, genre quota

**TMDB Candidate Universe**:
The broad movie universe from which every non-curated recommendation mode discovers candidates.
_Avoid_: TMDB fallback, external candidates

**TMDB Retrieval Set**:
The bounded set of TMDB movie IDs returned for the current Retrieval Plan. Non-curated ranking may only consider movies in this set; local search cannot inject additional candidates.
_Avoid_: Local plus TMDB merge, final six

**Retrieval Lane**:
One bounded TMDB query path contributing movie IDs to a TMDB Retrieval Set, such as constraint-aware Discover, reference-movie Similar/Recommendations, or a genre/keyword query.
_Avoid_: Fallback stage, candidate source

**Query Planner**:
The component that converts confirmed structured answers, a reference movie, and free-text intent into a bounded set of Retrieval Lanes. Deterministic inputs use maintained mappings; AI may only propose taste-oriented genres or keywords that resolve to real TMDB IDs.
_Avoid_: Movie generator, prompt-only search

**Query Proposal**:
An AI-suggested taste-oriented genre or keyword awaiting successful resolution to a real TMDB identifier before it may create a Retrieval Lane. It cannot create a Hard Constraint.
_Avoid_: AI filter, inferred veto

**TMDB Query Cache**:
A reusable result of a specific TMDB retrieval query. A fresh cached result may avoid a live TMDB call without changing the TMDB Candidate Universe.
_Avoid_: Local catalog, database-first retrieval

**Degraded Retrieval**:
A provider-outage path that may reuse TMDB Query Cache entries no older than seven days, then revalidates every Hard Constraint from cached evidence. If it cannot produce enough Eligible Candidates, it reports technical unavailability rather than a no-match result.
_Avoid_: Local fallback, best-effort match

**Local Movie Cache**:
The local set of known movies and recommendation metadata used for identity, enrichment, embeddings, memory-aware ranking, and reuse. It does not bound the TMDB Candidate Universe.
_Avoid_: Local candidate universe, primary catalog

**Cache Admission**:
The bounded act of adding an enriched TMDB candidate to the Local Movie Cache after it reaches final ranking or is shown as a recommendation. Raw discovery results remain only in the TMDB Query Cache.
_Avoid_: Catalog sync, discovery import

**Curated Collection**:
An intentionally bounded set of locally known movies that defines the candidate universe for Curated Picks.
_Avoid_: Local cache, full catalog

**Collection Version**:
An immutable published revision of a Curated Collection with localized editorial copy and an ordered set of TMDB movie IDs. Editors change a collection by preparing and publishing a new version.
_Avoid_: Mutable collection row, cache revision

**Collection Metadata Snapshot**:
The publish-time copy of identity, runtime, genres, title, year, poster metadata, and localized display data required to serve and constraint-check every movie in a Collection Version without live TMDB.
_Avoid_: Local movie cache, live enrichment

**Collection Lifecycle**:
The Backoffice-controlled states Draft, Published, and Archived. Draft versions support preview; Published versions serve users; Archived versions remain reproducible for historical results but cannot start new attempts.
_Avoid_: Enabled flag, cache status

**Collection Mismatch**:
The Curated Picks outcome in which Hard Constraints remove every movie in the selected Curated Collection. It offers another collection or an explicit switch to Normal Match without widening the collection itself.
_Avoid_: TMDB fallback, global no-match

**Memory Exclusion**:
A durable movie-memory signal that removes a movie from the default candidate pool. Unlike a Hard Constraint, a Memory Exclusion may be overridden by an explicit current intent where the signal permits it.
_Avoid_: Permanent ban, hard constraint

**Watch Status**:
The durable, independently updateable knowledge of whether a participant has seen a movie: Seen, Not Seen, or Unknown.
_Avoid_: Movie-memory kind, taste reaction

**Movie Memory Event**:
An immutable signed-in record of a movie-memory change with its source, occurrence time, and available session or recommendation provenance.
_Avoid_: Current memory row, audit log only

**Movie Memory Snapshot**:
The current per-user, per-movie projection of Watch Status and Taste Status used by product reads and recommendation filtering.
_Avoid_: Interaction history, source event

**Taste Status**:
The durable, independently updateable relationship between a participant and a movie: Liked, Not Interested, or Unknown.
_Avoid_: Watch status, current intent

**Occasion Feedback**:
Feedback whose meaning belongs to one recommendation occasion, such as Wrong Mood. It may inform future ranking with context but does not become a permanent Taste Status by itself.
_Avoid_: Durable dislike, movie memory

**Preference**:
A participant desire used to compare otherwise valid candidates. Preferences may be traded against one another when finding a group compromise.
_Avoid_: Soft constraint

**Preference Refinement**:
The single targeted follow-up question available after Normal Match finds Eligible Candidates but no Confident Match. It preserves prior answers and Hard Constraints, then permits one new retrieval and ranking attempt.
_Avoid_: Quiz restart, constraint relaxation, retry loop

**Informative Swipe Reaction**:
A Taste Swipe reaction that contributes current recommendation evidence: Seen, Loved It, Not for Me, or Maybe Tonight. Skip controls deck progression but is not taste evidence.
_Avoid_: Card viewed, swipe count

**Seen Reaction**:
An Informative Swipe Reaction that excludes the exact movie from the current attempt without expressing positive or negative taste.
_Avoid_: Dislike, watched preference

**Loved Reaction**:
An Informative Swipe Reaction that supplies strong positive taste evidence and marks the exact movie as watched and therefore excluded from the current attempt.
_Avoid_: Maybe tonight, recommendation candidate

**Not for Me Reaction**:
An Informative Swipe Reaction that supplies strong negative taste evidence and excludes the exact movie from the current attempt.
_Avoid_: Skip, hard constraint

**Maybe Tonight Reaction**:
An Informative Swipe Reaction that supplies strong current positive evidence while keeping the exact movie eligible to become a recommendation.
_Avoid_: Durable like, watched

**Direct Intent Candidate**:
A movie explicitly kept in the TMDB Retrieval Set by a Maybe Tonight Reaction. It still passes ordinary eligibility, quality, and ranking and is not guaranteed to become a result.
_Avoid_: Pinned result, guaranteed recommendation

**Skip Reaction**:
A deck-control action that advances Taste Swipe without creating taste or movie-memory evidence.
_Avoid_: Neutral preference, weak dislike

**Swipe Readiness**:
The adaptive Taste Swipe state reached after at least eight Informative Swipe Reactions. PopChoice may suggest recommending once evidence is sufficient and treats twelve informative reactions as ready for retrieval.
_Avoid_: Fixed card count, deck completion

**Participant Score**:
A deterministic estimate of how well an Eligible Candidate satisfies one participant's Preferences for the current viewing occasion.
_Avoid_: Vote, personal constraint score

**Compromise Score**:
The Duo or Group ordering that first maximizes the lowest Participant Score and then uses the group's average Participant Score as a tie-breaker. Every participant has equal weight.
_Avoid_: Average score, host score, majority score

**Group Fit Explanation**:
An owner-anonymous, non-numeric explanation of why a recommendation balances the group's Preferences. Participant Scores and preference attribution remain internal.
_Avoid_: Participant breakdown, compromise leaderboard

**Proposed Constraint**:
A structured Hard Constraint inferred from free text but not yet confirmed by the participant. Until confirmed, it has only Preference semantics.
_Avoid_: Parsed constraint, automatic constraint

**Shared Constraint Summary**:
An owner-anonymous explanation of the constraint categories preventing an eligible group recommendation.
_Avoid_: Blocking participant, constraint blame

**Constraint Review**:
A private interaction in which a Constraint Owner inspects, revises, or retains their own Hard Constraints after no eligible recommendation is found.
_Avoid_: Host override, group edit

**Rewatch Intent**:
An explicit current-viewing intent that makes previously watched movies eligible for this recommendation.
_Avoid_: Watched override, repeat mode
