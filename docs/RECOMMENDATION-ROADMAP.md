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

## Current Quiz Flow

The current quiz captures:

- solo or group mode
- group participant names for group mode
- favorite or reference movie
- preferred era: newer, classic, or both
- broad mood/genre labels
- tone: light, balanced, serious, or dark
- optional favorite actor

This creates a usable first recommendation, but the data is coarse. It asks users to describe taste abstractly, while users often know their taste better through concrete reactions to movies.

## Current Limitations

- The favorite movie prompt is high friction and can over-anchor the result toward movies the user already watched.
- Mood options are partly genre labels, which makes them too broad for accurate ranking.
- The quiz does not capture enough negative intent, such as "not slow", "not horror", "not long", "not subtitles", or "not something obvious".
- The app has started using signed-in movie memory for exclusions, down-ranking, and exact liked-candidate boosts, but watched/liked/not-interested signals are still not unified behind a first-class recommendation signal model.
- Group mode currently collects individual preferences, but the recommendation model should eventually optimize for overlap and compromise explicitly.
- The embedded/local movie catalog is too small to produce consistently satisfying real-world results.

## Recent Product QA Notes

- Fast Pick match percentages are not yet user-trustworthy. A result can show about `30% match` even when the recommendation may still be plausible, while older `70%` values effectively read as near-perfect. Treat raw percentage display as uncalibrated until [#680](https://github.com/shchilkin/PopChoice/issues/680) decides whether to recalibrate scores, bucket them into confidence tiers, rename the label, or replace raw percentages with clearer result copy.
- The quiz entry flow is currently confusing because Fast Pick appears beside `Just me`, `Duo night`, and `Group mode`, then asks for audience afterward. Product direction is to choose match depth first (`Fast Pick` vs `Normal Match`), then audience (`Solo`, `Duo`, `Group`), then enter the corresponding short or normal flow. Track this in [#681](https://github.com/shchilkin/PopChoice/issues/681).
- Normal Match is producing promising qualitative results for specific intent prompts. A Russian dystopian/post-apocalyptic survival prompt returned a strong `Blade Runner`-style selection and explanation.
- Duo and Group need more manual product QA after the entry-flow ordering is fixed, especially to verify whether compromise results feel meaningfully different from solo recommendations.

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

Tinder-style mode for movie-heavy users who do not want questions.

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

Room-backed group mode should become the larger milestone behind [#359](https://github.com/shchilkin/PopChoice/issues/359), separate from the current same-device group flow.

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

### Stage 3: Taste Swipe MVP

- Add an entry choice: "Answer a few questions" or "Swipe movies".
- Build a swipe screen backed by TMDB and local cached metadata.
- Store signed-in reactions in movie memory.
- For anonymous users, keep session-local reactions long enough to produce one recommendation.
- Translate swipe reactions into current recommendation inputs before introducing a deeper backend rewrite.

### Stage 4: Signal-based recommendation backend

- Add a canonical recommendation request shape based on `TasteSignal[]`.
- Convert quiz answers, swipe reactions, and account memory into signals.
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

## Near-Term PR Candidates

Good next PRs, in order:

1. [x] [#484](https://github.com/shchilkin/PopChoice/issues/484): refactor the quiz submit/results handoff so navigation state is explicit and the quiz page does not need short-lived reset guards.
2. [x] [#492](https://github.com/shchilkin/PopChoice/issues/492): move TMDB discovery/backfill/enrichment into a shared rate-limited BullMQ catalog worker before scaling catalog volume.
3. [x] [#618](https://github.com/shchilkin/PopChoice/issues/618): classify/refactor current seeded real-data checks before adding backoffice eval execution.
4. [x] [#616](https://github.com/shchilkin/PopChoice/issues/616): persist eval run/result history for backoffice and worker reports.
5. [x] [#617](https://github.com/shchilkin/PopChoice/issues/617): add non-live environment retrieval/source-strategy eval jobs.
6. [x] [#619](https://github.com/shchilkin/PopChoice/issues/619): expose recommendation eval runs in backoffice.
7. Replace the current quiz copy and options with a more "tonight" oriented flow while preserving existing API shape.
8. Add a small taste-swipe prototype behind a feature flag or alternate quiz entry path.
9. Add TMDB-backed candidate-card sourcing for swipe mode.
10. Add a `TasteSignal` domain model and adapters from quiz answers and swipe reactions.
11. [x] [#620](https://github.com/shchilkin/PopChoice/issues/620): add guarded live-provider evals after safe backoffice evals exist.
12. [x] Start [#612](https://github.com/shchilkin/PopChoice/issues/612) with first-class candidate source provenance, source-strategy policy, route/job/pipeline metadata, and eval assertions for curated showcase, hybrid fast, and TMDB-first behavior.
13. [x] Connect [#612](https://github.com/shchilkin/PopChoice/issues/612) source strategy to initial retrieval behavior: `hybrid-fast` and `compromise-hybrid` use bounded TMDB fallback, while curated/local-only strategies block external lookup.
14. [x] Add `experienceMode` request/job/pipeline metadata so `fast-pick` can select `hybrid-fast` while current requests default to `normal-match`.
15. [x] Add a first Fast Pick quiz intro entry that sends the `fast-pick` wrapper into the existing recommendation API.
16. [x] Add the first short solo Fast Pick guided flow for intent, hard avoids, and discovery appetite under [#609](https://github.com/shchilkin/PopChoice/issues/609).
17. [x] Extend Fast Pick to Duo/Group by adding an audience layer before the short question flow.
18. [x] Start [#608](https://github.com/shchilkin/PopChoice/issues/608) by adding an optional Normal-mode hard-avoids step and carrying those negative signals into the current recommendation payload.
19. [x] Make Duo first-class in the guided UI: separate Normal/Fast audience entry, two-person setup copy, Duo result copy, and deterministic e2e coverage.
20. [x] Connect the first `tmdb-first` retrieval slice: Normal solo now attempts TMDB discover as a primary candidate-discovery path, then score-ranks TMDB and strong local matches together.
21. [x] Deepen the first `tmdb-first` query-shaping slice: Normal/Fast hard avoids and discovery appetite now shape TMDB discover params, and eval fixtures include source/metadata quality thresholds.
22. [x] Deepen `tmdb-first` JIT enrichment before making it the Normal quality default: fetch richer TMDB details for strong direct candidates, persist/cache useful runtime/rating/provider metadata, and calibrate backoffice real-data thresholds.
23. [#655](https://github.com/shchilkin/PopChoice/issues/655): add provider-aware result UI and user-facing availability copy once product behavior decides whether availability is informational, a soft preference, or a hard constraint.
24. [#656](https://github.com/shchilkin/PopChoice/issues/656): evaluate a movie embedding text v2 contract before adding metadata such as genres, keywords, cast, director, language, popularity, or certification to retrieval embeddings.
25. [#680](https://github.com/shchilkin/PopChoice/issues/680): calibrate recommendation match percentages and user-facing score copy before treating raw percentages as precise quality claims.
26. [#681](https://github.com/shchilkin/PopChoice/issues/681): rework the quiz entry flow so users choose match depth first, then Solo/Duo/Group audience, then answer the matching short or normal question set.
27. Add manual-review logging for ambiguous TMDB/local identity matches.

## Non-Goals For Now

- No full recommendation rewrite in one PR.
- No removal of the current quiz until swipe mode proves useful.
- No hard dependency on user accounts for the first swipe MVP.
- No admin panel before the app has enough ambiguous-match volume to justify it.
- No attempt to make the local embedded catalog the complete movie universe.
