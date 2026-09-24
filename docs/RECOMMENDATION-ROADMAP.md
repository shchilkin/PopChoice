---
title: 'Recommendation Experience Roadmap'
---

# Recommendation Experience Roadmap

## Purpose

PopChoice started as a course-sized recommendation engine with a small embedded movie catalog and a guided quiz. That is useful for proving the end-to-end flow, but it is not enough for a real recommendation app. The next product direction is to make recommendations feel more adaptive, more movie-aware, and less dependent on a fixed local seed list.

The guiding shift is:

- from a static quiz to reusable taste signals
- from a small embedded catalog to TMDB-first discovery and enrichment
- from "answer questions, get one result" to an app that learns what the user has seen, liked, disliked, and wants tonight

This should be done in stages. A full rewrite is not the goal.

## Backlog Hygiene

- Create a GitHub issue for each actionable roadmap ticket before or alongside adding it here.
- If the work is too large for one PR, keep the original issue as an epic/umbrella and split focused implementation issues underneath it.
- Prefer linked roadmap entries so completed work can be checked off without losing context.

## Active Milestones

The roadmap was refreshed on 2026-07-17. GitHub issues are the execution source
of truth; this document explains the product sequence and keeps completed work
separate from the active frontier.

| Milestone                                                                                   | Purpose                                                                                                                           |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [v0.3.0 Recommendation V2 Foundation](https://github.com/shchilkin/PopChoice/milestone/6)   | Complete the scenario quality gate, participant-specific Normal Match compromise behavior, and visitor-facing Curated Picks mode. |
| [v0.4.0 Taste Swipe MVP](https://github.com/shchilkin/PopChoice/milestone/7)                | Ship an anonymous TMDB-backed swipe-to-result path, then persist signed-in reactions into movie memory.                           |
| [Group Rooms](https://github.com/shchilkin/PopChoice/milestone/8)                           | Add multi-device room persistence, join/readiness, one recommendation run, and finally QR/projector presentation.                 |
| [Catalog & Recommendation Intelligence](https://github.com/shchilkin/PopChoice/milestone/9) | Improve Available Movies discovery, provider availability UI, and evidence-based embedding evolution.                             |
| [Backoffice Hardening](https://github.com/shchilkin/PopChoice/milestone/10)                 | Make operator workflows more testable, resilient, consistent, observable, and safe.                                               |
| [Platform Operations](https://github.com/shchilkin/PopChoice/milestone/11)                  | Extract shared observability, formalize release gates, and attribute paid-provider usage.                                         |

## Current Quiz Flow

The current quiz first asks for match depth (`Fast Pick` or `Normal Match`), then
audience (`Solo`, `Duo`, or `Group`). Duo and Group are same-device sequential
flows; multi-device rooms remain planned.

Normal Match captures:

- participant names for Duo/Group
- favorite or reference movie
- preferred era: newer, classic, or both
- broad mood/genre labels
- tone: light, balanced, serious, or dark
- discovery appetite
- hard avoids and constraints
- optional favorite actor

Fast Pick captures a shorter intent, hard-avoid, and discovery-appetite set for
each participant. Both flows create a usable first recommendation, but most
signals still bridge through the legacy request shape rather than a canonical
`TasteSignal[]` contract.

## Current Limitations

- The favorite movie prompt is optional and lower-friction, but supplied titles
  can still over-anchor a result if they outweigh tonight-specific signals.
- Mood options are partly genre labels, which makes them too broad for accurate ranking.
- The quiz captures explicit negative intent, but the public request contract still
  bridges several signals through legacy fields instead of accepting canonical
  taste signals directly.
- The app uses signed-in movie memory for exclusions, down-ranking, and exact
  liked-candidate boosts, and has an internal `TasteSignal` adapter. Quiz,
  account, result-feedback, and future swipe inputs are not yet one complete
  end-to-end request contract.
- Group mode currently collects individual preferences, but the recommendation model should eventually optimize for overlap and compromise explicitly.
- The embedded/local movie catalog is too small to produce consistently satisfying real-world results.

## Recent Product QA Notes

- [#680](https://github.com/shchilkin/PopChoice/issues/680) replaced user-facing raw match percentages with calibrated confidence tiers. The exact experimental percentage remains available in hover/accessibility copy for debugging, but the primary UI should not imply false precision.
- [#681](https://github.com/shchilkin/PopChoice/issues/681) reordered quiz entry into three layers: match depth first (`Fast Pick` vs `Normal Match`), then audience (`Solo`, `Duo`, `Group`), then the corresponding short or normal question flow.
- Normal Match is producing promising qualitative results for specific intent prompts. A Russian dystopian/post-apocalyptic survival prompt returned a strong `Blade Runner`-style selection and explanation.
- Duo and Group need more manual product QA after the entry-flow ordering is fixed, especially to verify whether compromise results feel meaningfully different from solo recommendations.

## 0.2.0 Better Taste Control

The Better Taste Control release is tracked by
[#826](https://github.com/shchilkin/PopChoice/issues/826). It makes PopChoice
more controllable without turning the quiz into a technical filter form. Users
can say what they want, what they want to avoid, and how safe or surprising the
pick should feel.

Completed scope:

- [x] [#827](https://github.com/shchilkin/PopChoice/issues/827): add explicit
      avoids and constraints to Fast Pick and Normal Match.
- [x] [#828](https://github.com/shchilkin/PopChoice/issues/828): make reference
      movie input optional and lower-friction.
- [x] [#829](https://github.com/shchilkin/PopChoice/issues/829): add discovery
      appetite control for safe, balanced, and surprising recommendations.
- [x] [#830](https://github.com/shchilkin/PopChoice/issues/830): improve the
      result feedback loop so feedback can guide follow-up recommendations.
- [x] [#831](https://github.com/shchilkin/PopChoice/issues/831): expand
      deterministic recommendation eval coverage for the new taste-control
      signals.
- [x] [#832](https://github.com/shchilkin/PopChoice/issues/832): keep product
      docs and release notes aligned as behavior lands.

Release notes: [/docs/releases/v0.2.0](/docs/releases/v0.2.0).

Out of scope for `v0.2.0`:

- Taste Swipe MVP.
- Multi-device group rooms.
- A full canonical `TasteSignal[]` backend rewrite.

## Target Model: Taste Signals

Both quiz answers and swipe interactions should eventually map into a shared signal model.

Example signal types:

```ts
type TasteSignal =
  | { type: 'liked_movie'; tmdbId?: number; title: string; year?: number; weight: number }
  | { type: 'seen_movie'; tmdbId?: number; title: string; year?: number; weight: number }
  | { type: 'not_interested_movie'; tmdbId?: number; title: string; year?: number; weight: number }
  | { type: 'wrong_mood_movie'; tmdbId?: number; title: string; year?: number; weight: number }
  | { type: 'desired_trait'; value: string; weight: number }
  | { type: 'avoid_trait'; value: string; weight: number }
  | { type: 'constraint'; value: string; weight: number };
```

The important point is that the recommendation engine should not care whether a signal came from the quiz, a swipe card, account history, or feedback on a past result.

## TMDB-First Catalog Direction

The small local movie database should become a cache and enrichment layer, not the primary catalog.

Target behavior:

- Use TMDB as the broad source of movie candidates.
- Keep local Postgres for:
  - embeddings and generated descriptions
  - normalized TMDB identity
  - recommendation history
  - user memory and feedback
  - cached metadata for performance and consistency
- Expand local records just in time when TMDB returns promising candidates.
- Prefer stable TMDB ids for movie identity whenever available.
- Keep fallback identity matching by normalized title and release year for older seed records.
- Log ambiguous TMDB/local matches for future manual review and admin tooling.
- Add cast, directors, genres, and keywords to the catalog core before promising actor/director/genre search in the available-movies UI.

This avoids pretending that a few hundred embedded titles can power a real app, while still preserving the value of local ranking, memory, and generated explanations.

## Candidate Source Strategy

Recommendation V2 should treat candidate source as a separate decision from audience size and match depth.

| Strategy             | Primary use                                          | Candidate mix                                                              |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Curated showcase     | Demo/showcase surfaces and safe regression fixtures. | `curated` local seed records only.                                         |
| Hybrid fast          | Fast Pick when latency matters.                      | `local-cache` first, then bounded `tmdb-discover` if local quality is low. |
| Memory-aware local   | Signed-in fast/normal recommendations with history.  | `local-cache` plus memory exclusions/down-ranks.                           |
| TMDB-first normal    | Normal Match and later Taste Swipe.                  | `tmdb-discover`/`tmdb-search`, enriched by local cache and JIT seeding.    |
| Compromise group/duo | Duo and group results where overlap matters.         | Same source mix as selected depth, but scored against participant overlap. |

[#612](https://github.com/shchilkin/PopChoice/issues/612) tracks carrying these source decisions through code, persistence, logs, eval reports, and optional UI badges.
The current code now has a first policy module, persisted `experienceMode`, and route/job/pipeline metadata bridge for these defaults:

- Curated showcase -> `curated-showcase`.
- Fast Pick solo -> `hybrid-fast`.
- Normal Match and Taste Swipe solo -> `tmdb-first`.
- Duo and Group -> `compromise-hybrid`, regardless of fast/normal entry point.
- Signed-in solo Fast Pick with existing memory can temporarily use `memory-aware-local` until TMDB-first memory reranking is implemented.

## Experience Modes

### 1. Fast Pick

Short guided mode for users who want a result fast. The current flow asks for audience, intent, hard avoids, and discovery appetite, then sends `experienceMode: fast-pick` through the recommendation API.

Target questions:

- What kind of night is this: easy, funny, gripping, emotional, weird, cozy, dark?
- What should PopChoice avoid: horror, gore, slow pacing, subtitles, long runtime, already-seen movies?
- Discovery level: safe hit, balanced, surprise me?

Duo/group Fast Pick reuses the same short question set per participant after audience-specific setup, then runs the same `hybrid-fast` source strategy.

### 2. Taste Swipe

Tinder-style mode for movie-heavy users who do not want questions. The first
anonymous vertical slice is tracked by
[#920](https://github.com/shchilkin/PopChoice/issues/920); durable signed-in
reactions follow in [#923](https://github.com/shchilkin/PopChoice/issues/923).

Show a stream of movie cards and collect simple reactions:

- Seen
- Loved it
- Not for me
- Maybe tonight
- Skip

After enough signal, usually 8-12 cards, the user can ask for a recommendation. For users who have watched many films, "seen" is useful data, not a failed recommendation.

Card sourcing should start broad:

- popular classics
- recent popular movies
- genre landmarks
- foreign/art-house picks
- niche or polarizing titles
- titles near prior likes
- titles far away from prior dislikes

### 3. Deep Match

Advanced mode for users who enjoy a more deliberate quiz.

This can keep parts of the current flow, but favorite/reference movie should become optional. It should also capture "why" and "what not to recommend" more explicitly.

### 4. Group Swipe

Group mode should eventually become more concrete:

- pass-the-phone swipe rounds, or
- shared vote cards where each person reacts to the same candidates

The model should optimize for overlap and acceptable compromise, not only average preferences.

### 5. Group Rooms

Room-backed group mode is tracked by the
[Group Rooms milestone](https://github.com/shchilkin/PopChoice/milestone/8)
behind [#359](https://github.com/shchilkin/PopChoice/issues/359), separate from
the current same-device group flow.

Implementation should be sequenced as:

1. [#467](https://github.com/shchilkin/PopChoice/issues/467): room persistence, TTL, cleanup, and participant storage.
2. [#468](https://github.com/shchilkin/PopChoice/issues/468): share links, participant join flow, and readiness state.
3. [#469](https://github.com/shchilkin/PopChoice/issues/469): recommendation orchestration from completed room answers.
4. [#470](https://github.com/shchilkin/PopChoice/issues/470): QR invite and projector mode.

This keeps the high-risk data and orchestration work ahead of visual polish. The existing same-device group mode should remain available until room mode is reliable.

## Staged Implementation Plan

### Stage 1: Document and stabilize current behavior

- Keep the existing quiz and recommendation flow working.
- Document the signal-model direction.
- Make sure current feedback and movie memory continue to avoid obvious repeats.
- Continue using the local catalog, but treat it as a cache plus ranking support.

### Stage 2: Improve the guided quiz

- Replace broad genre wording with more concrete "tonight" language.
- Add explicit avoid/constraint choices.
- Make favorite/reference movie optional.
- Keep the API compatible by translating new answers into current recommendation input.
- Improve group-mode copy so users understand whether PopChoice is balancing or optimizing for one person.
- Complete participant-specific compromise scoring and explanation behavior in
  [#608](https://github.com/shchilkin/PopChoice/issues/608), gated by the
  scenario matrix in [#606](https://github.com/shchilkin/PopChoice/issues/606).

### Stage 3: Taste Swipe MVP

- [#920](https://github.com/shchilkin/PopChoice/issues/920): add an alternate
  Taste Swipe entry, a bounded TMDB-backed card deck, anonymous session-local
  reactions, and one persisted recommendation result.
- [#923](https://github.com/shchilkin/PopChoice/issues/923): persist signed-in
  reactions idempotently into movie memory and verify their effect on later
  recommendations.
- Keep the anonymous slice account-optional and preserve Fast Pick and Normal
  Match while swipe mode proves its value.

### Stage 4: Signal-based recommendation backend

- Add a canonical recommendation request shape based on `TasteSignal[]`.
- Convert quiz answers, swipe reactions, and account memory into signals.
- First slice: `TasteSignal` v1 now maps quiz answers plus feedback/movie-memory rows into shared signal types, and existing candidate filtering consumes feedback-derived movie signals through that adapter.
- Update ranking to use positive signals, negative signals, constraints, and TMDB candidate expansion together.
- Keep generated explanations aware of which signals actually existed, so copy does not mention actors, genres, or constraints the user never provided.

### Stage 5: TMDB-first candidate generation

- Move candidate sourcing toward TMDB discover/search as the broad first pass.
- Use local embeddings as enrichment and reranking, not as the complete universe of possible movies.
- Add JIT embedding/enrichment for strong TMDB candidates.
- [x] Move TMDB discovery and backfill into rate-limited BullMQ catalog workers in [#492](https://github.com/shchilkin/PopChoice/issues/492) before increasing catalog expansion volume:
  - Add a dedicated catalog-maintenance queue for discovery pages, movie detail enrichment, metadata refresh, and per-movie backfill jobs.
  - Enforce one shared TMDB request budget across discovery, backfill, and worker-driven enrichment, with configurable concurrency and `429` backoff.
  - Use deterministic BullMQ-safe `jobId` values such as `tmdb-details-{tmdbId}-{language}` and `backfill-{movieId}` so retries and duplicate triggers do not fan out duplicate TMDB calls.
  - Keep the existing one-shot services as enqueue/maintenance entrypoints while workers own API pacing, retries, observability, and Bull Board visibility.
- Add catalog metadata prerequisites for richer search:
  - [x] [#471](https://github.com/shchilkin/PopChoice/issues/471) schema/model for cast, directors, genres, and keywords.
  - [x] [#472](https://github.com/shchilkin/PopChoice/issues/472) TMDB backfill and refresh for that metadata.
  - [x] [#473](https://github.com/shchilkin/PopChoice/issues/473) available-movies partial `ILIKE` search over titles, actors, directors, and genres, combined with exact/ranged catalog filters.
  - [x] Metadata v1 quality contract: hot identity/quality/language columns, normalized watch providers for `US`, `FI`, and `RU`, bounded TMDB details enrichment for top direct TMDB candidates, and catalog-health/eval visibility for low-quality metadata.
- Track TMDB API failures, timeout behavior, and fallback quality.
- Keep [#493](https://github.com/shchilkin/PopChoice/issues/493) as the epic for admin/back-office review of ambiguous title matches and catalog-health issues.

### Stage 5.5: Deterministic e2e and eval foundations

- [x] [#474](https://github.com/shchilkin/PopChoice/issues/474): add a full Playwright e2e harness with an isolated migrated test database.
- [x] [#475](https://github.com/shchilkin/PopChoice/issues/475): add product smoke flows for auth, catalog, quiz, recommendation, and feedback.
- [x] Extend recommendation browser smoke coverage across current Normal/Fast and Solo/Duo/Group entry paths in `apps/web/e2e/recommendation.spec.ts`.
- [x] [#476](https://github.com/shchilkin/PopChoice/issues/476): add recommendation eval fixtures and scoring so AI behavior can be changed with more control.
- [x] [#490](https://github.com/shchilkin/PopChoice/issues/490): add scheduled or manually triggered real-data recommendation evals for seeded DB and catalog-retrieval changes. The backoffice can now queue mock and real-data evals, persist run summaries/results, and expose guarded live eval enqueueing for explicit operator checks.
- Keep live-model evals optional. The default path should be deterministic, cheap, and safe for CI.

### Stage 5.6: Backoffice eval operations

The eval stack should be layered instead of treated as one overloaded "real data" command:

| Eval layer                        | Purpose                                                                                                                                                             | Where it runs                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Deterministic fixture eval        | Prompt/output shape, repeat avoidance, explanation quality, and basic scenario scoring without external services.                                                   | Per-PR CI.                                       |
| Seeded catalog retrieval eval     | Migrations, seeded catalog connectivity, fixture candidate availability, and catalog search.                                                                        | Scheduled/manual GitHub Actions.                 |
| Environment retrieval/source eval | Current environment DB health for recommendation scenarios: candidate counts, source distribution, metadata quality/provider gaps, and hard-constraint feasibility. | Backoffice-triggered BullMQ job.                 |
| Live provider eval                | Full provider-sensitive check with OpenAI/TMDB calls for intentional pre-launch validation.                                                                         | Manual, guarded, audited backoffice action only. |

Implementation should be split in this order:

1. [x] [#618](https://github.com/shchilkin/PopChoice/issues/618): classify and refactor the current seeded `--real-data` checks so the runner is importable by jobs and docs do not imply it is a full live recommendation eval.
2. [x] [#616](https://github.com/shchilkin/PopChoice/issues/616): persist eval run and result history so reports are not trapped in CLI logs or GitHub artifacts.
3. [x] [#617](https://github.com/shchilkin/PopChoice/issues/617): add bounded BullMQ jobs for environment retrieval and source-strategy evals against the configured DB.
4. [x] [#619](https://github.com/shchilkin/PopChoice/issues/619): add a protected backoffice UI for safe eval runs, history, status, and report details.
5. [x] [#620](https://github.com/shchilkin/PopChoice/issues/620): add a guarded live-provider eval action only after safe non-live backoffice evals exist.

### Stage 6: Long-term personalization

- Add an editable watched list and liked/not-interested memory.
- Add "rewatch mode" so watched movies can appear only when intentionally requested.
- Use feedback to learn the user's taste profile over time.
- Consider gamified taste history, achievements, and "taste map" views only after the core memory model is reliable.

## Active Work Frontier

The following issues have no unfinished blockers and can start independently:

1. [#606](https://github.com/shchilkin/PopChoice/issues/606): complete the
   Recommendation V2 audience/depth/source scenario quality gate.
2. [#613](https://github.com/shchilkin/PopChoice/issues/613): expose Curated
   Picks as an intentional visitor-facing product mode.
3. [#920](https://github.com/shchilkin/PopChoice/issues/920): ship the anonymous
   TMDB-backed Taste Swipe recommendation slice.
4. [#921](https://github.com/shchilkin/PopChoice/issues/921): add Available
   Movies live title suggestions and a complete reset flow.
5. [#922](https://github.com/shchilkin/PopChoice/issues/922): add multi-genre,
   keyword, and sorting controls to Available Movies.
6. [#655](https://github.com/shchilkin/PopChoice/issues/655): add
   provider-aware availability UI after confirming its informational product
   role.
7. [#656](https://github.com/shchilkin/PopChoice/issues/656): evaluate movie
   embedding text v2 before changing the production embedding format.

Blocked follow-ups:

- [#608](https://github.com/shchilkin/PopChoice/issues/608) follows #606 and
  completes participant-specific Normal Match compromise behavior.
- [#923](https://github.com/shchilkin/PopChoice/issues/923) follows #920 and
  persists signed-in swipe reactions into movie memory.
- Group Rooms remains the explicit #467 -> #468 -> #469 -> #470 sequence.

## Non-Goals For Now

- No full recommendation rewrite in one PR.
- No removal of the current quiz until swipe mode proves useful.
- No hard dependency on user accounts for the first swipe MVP.
- No admin panel before the app has enough ambiguous-match volume to justify it.
- No attempt to make the local embedded catalog the complete movie universe.
