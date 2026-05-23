# Architecture Roadmap (Current Workspace, Next Boundary Steps)

## Purpose

This roadmap exists to guide architectural refactoring in a practical, low-risk way so PopChoice stays maintainable as it grows. The repository already uses a workspace-based layout, so the focus now is not "move to a monorepo someday" but "make the current workspace boundaries explicit, enforceable, and easier to extract over time."

## Current State

The repository is maintainable today and productive for ongoing work.

What is already true:

- the repo already uses npm workspaces with `apps/*`, `packages/*`, and `services/*`
- the web app and supporting apps already live under `apps/`
- background jobs and sync processes already live under root `services/*`
- a shared package already exists in `packages/shared`
- recommendation orchestration now lives in reusable feature-owned modules outside route ownership
- account, password reset, recommendation feedback, and movie-memory flows exist for signed-in users

The main remaining risks are:

- boundary clarity across app/domain/infrastructure concerns
- extractability of logic into independently owned modules over time
- some API boundaries still retain more orchestration awareness than the target boundary model

## Status Snapshot

### Done Already

- [x] Workspace layout exists: `apps/`, `packages/`, and `services/` are already in place.
- [x] Shared package extraction has started with `packages/shared` reused by root services.
- [x] Background service responsibilities are partially separated into `services/movie-discovery`, `services/movie-seed`, and `services/movie-backfill`.
- [x] Recommendation orchestration is extracted into reusable feature-owned modules instead of living only inside route handlers.
- [x] Some recommendation thresholds/constants are separated into dedicated helper modules instead of being embedded directly in route handlers.
- [x] Ownership boundaries for `src/app`, `src/integrations`, `src/lib`, `src/utils`, and `src/clients` are documented in `BOUNDARIES.md`.
- [x] README and development docs reflect the current workspace layout.
- [x] `src/features` is documented as the home for cross-route product behavior.
- [x] App-local external API wrappers now live under `src/integrations`, distinct from root `services/*` runtimes.
- [x] Shared recommendation input screening and async job orchestration are extracted behind the feature layer.
- [x] Recommendation thresholds and limits are centralized in a single feature config module.
- [x] Recommendation persistence and DB row mapping are extracted behind a feature-owned adapter.
- [x] More-picks persistence and quiz-data loading are extracted behind a feature-owned adapter.
- [x] The reusable more-picks pipeline is extracted into the recommendation feature layer.
- [x] The more-picks route and worker now share feature-owned orchestration instead of duplicating queue fallback and processing logic.
- [x] Movies catalog data access and response types are extracted behind a feature module instead of living in the route file.
- [x] The register route now delegates user-creation workflow to a feature module instead of owning DB writes directly.
- [x] Poster utility routes now delegate TMDB fetch and proxy logic through the integration layer instead of owning raw fetch behavior.
- [x] Recommendation feature modules now import concrete clients directly instead of relying on the broad `@/clients` barrel.
- [x] A stable movie identity helper exists for recommendation memory, preferring TMDB ids and falling back to normalized title plus release year.
- [x] Favorite/reference movies mentioned in the quiz are excluded from recommendation candidates while still contributing to taste matching.
- [x] Recommendation feedback is captured from the results page and stored separately from generated recommendation payloads.
- [x] Signed-in feedback is persisted into `user_movie_interactions` with upsert semantics for `watched`, `liked`, `not_interested`, and `wrong_mood`.
- [x] Feedback-derived recommendation memory now filters watched/not-interested movies and down-ranks wrong-mood movies for signed-in users.
- [x] Liked movie memory now applies a conservative positive ranking boost for matching signed-in recommendation candidates.
- [x] Account recommendation history is deduplicated by movie identity so repeated recommendation attempts do not appear as separate discoveries.
- [x] Result pages expose a share action that creates/copies a stable recommendation URL.
- [x] New users are signed in automatically after registration when the session secret is configured.
- [x] Password reset request and confirmation routes exist, with Resend delivery in production and non-production reset URL exposure for local testing.
- [x] A dedicated `/account/movie-memory` experience exists with candidate cards and catalog search backed by `/api/account/movie-memory`.
- [x] Account movie-memory API orchestration now lives behind a feature-owned service module instead of the route handler.
- [x] Movie-memory candidate cards keep session state locally, submit completed choices in one batched request, and flush pending choices on page hide or unmount.
- [x] The account movie-memory view supports large histories with paginated loading, virtualized rendering, total counts, and poster-aware fallbacks.
- [x] The available-movies catalog now supports exact-title escape-hatch search with optional year-range filters across the API and page UI.
- [x] The available-movies table now has actionable empty states for empty catalogs and filter searches with no matches.
- [x] Expensive recommendation/poster POST routes now reject oversized JSON bodies before validation, moderation, queue creation, TMDB fetches, or OpenAI work.
- [x] OpenAI calls now use per-call timeout options and `AbortSignal` cancellation, with legacy recommendation requests mapping upstream OpenAI timeouts to HTTP 504.
- [x] `tmdb_match_reviews` persists ambiguous TMDB/local matches and runtime mismatches for later manual review.
- [x] PR CI has a consolidated `services-ci` pass for service workspaces and CodeQL runs for Actions and JavaScript/TypeScript.

### Issues Still Present

- The quiz-to-results handoff still relies on route-local state and a short-lived browser handoff marker to avoid visual flashes. A follow-up PR should simplify this architecture so the quiz route never needs to reset itself while it is still responsible for rendering the submit handoff.
- The current quiz is still a first-generation guided flow. It should evolve toward a signal-based recommendation model with a shorter "tonight" quiz, a swipe-based mode for movie-heavy users, and a TMDB-first catalog strategy. See [RECOMMENDATION-ROADMAP.md](./RECOMMENDATION-ROADMAP.md).
- Route-local compatibility re-export files still exist under `src/app/api/movie-recommendation`; future recommendation changes should continue moving real logic into `src/features/recommendation`.
- Account settings/profile/provider identity remain intentionally thin.

Reference: use [BOUNDARIES.md](./BOUNDARIES.md) as the current ownership baseline.

## Target Direction

PopChoice should continue evolving within the current workspace layout toward clearer ownership and easier extractability, for example:

- `apps/web`
- `apps/bull-board`
- `services/movie-discovery`
- `services/movie-seed`
- `services/movie-backfill`
- `packages/domain`
- `packages/config`
- `packages/clients`
- `packages/shared`
- optional: `packages/ui`

This is an extraction direction, not a mandate for large-scale file moves right now. Current work should optimize for clean boundaries inside the existing workspace first.

## Guiding Principles

- Prefer explicit boundaries over convenience imports.
- Keep route handlers thin; move orchestration into reusable modules.
- Separate domain logic from infrastructure details (DB, API clients, queues).
- Minimize coupling and avoid hidden dependencies through broad utility barrels.
- Standardize shared tooling only after boundaries are stable.
- Refactor in small, reversible steps with existing tests and CI gates.

## Phased Plan

### Phase 1: Stabilize boundaries in the current workspace

- Define and document ownership for app, domain, infrastructure, and shared helpers.
- Reduce cross-layer imports that bypass intended boundaries.
- Keep API routes focused on validation, orchestration calls, and response mapping.
- Align docs with the real workspace structure before making larger architectural claims.

### Phase 2: Refactor for extractability

- Move reusable domain logic into cohesive modules that can be lifted out later.
- Isolate external integrations behind stable client/service interfaces.
- Centralize configuration and constants to reduce manual synchronization.
- Prefer extracting recommendation flows out of `src/app/api` into clearer domain-owned modules.
- Refactor the quiz submission lifecycle so recommendation creation is modeled explicitly instead of coordinated through route-local `useEffect`, refs, and navigation timing.
- Keep account/movie-memory orchestration behind feature-owned modules as the API surface grows beyond the current service extraction.

### Phase 3: Extract intentional packages from the existing layout

- Use the existing `apps/`, `services/`, and `packages/` layout more intentionally as boundaries become clearer.
- Move modules incrementally to preserve behavior and delivery speed.
- Keep migration steps explicit and reversible.

### Phase 4: Standardize shared tooling/config/testing

- Consolidate shared TypeScript, lint, formatting, and test conventions.
- Reuse config packages where duplication exists across app/services.
- Align CI checks to the new boundaries and ownership model.

### CI/CD and Deployment Track

- [x] Build production container images in GitHub PR/CI once, publish them with commit/PR metadata, and document preview or downstream deploys running those already-built images instead of rebuilding the monorepo in each deployment environment.
- [x] Preserve provenance between a PR check, container digest, deployed preview, and `/api/build` metadata through GHCR labels, digest artifacts, runtime image metadata, and Docker-baked fallbacks.
- [x] Run Coolify from GHCR images via a single `IMAGE_TAG` release bundle instead of compiling PopChoice services on the VPS.
- [x] Add an optional Coolify deploy webhook path after successful `development` image publishing.
- Keep deployment-time work focused on migrations, health checks, runtime configuration validation, and compatibility checks rather than application compilation.
- Add a dedicated migration release gate so database migrations are visibly completed before rolling long-running web/worker services.
- Add release compatibility checks that verify all running PopChoice services report the same commit/image tag.

### Operational Observability Track

- Enable Coolify notifications for failed deploys, failed backups, server disk/resource warnings, and unhealthy or restarting containers where supported.
- Add external uptime monitoring for `https://pop-choice.shchilkin.dev/api/health`, then consider a deeper synthetic recommendation smoke check.
- Add application error tracking for frontend, API routes, and workers so browser errors, API exceptions, and background job failures are visible outside Coolify logs.
- Improve structured log correlation by carrying `requestId`, `recommendationId`, `recommendationSlug`, `jobId`, and `stage` through web and worker logs.
- Make BullMQ job failures easier to diagnose by logging retry count, final failure state, recommendation identifiers, and stage at failure.
- Ship Docker/Coolify logs to a searchable log store once local log scrolling becomes painful.
- Track lightweight operational metrics: recommendation success/failure counts, average recommendation duration, queue depth, failed jobs, OpenAI/TMDB timeout counts, and DB/Redis health failures.

### Security and Reliability Track

- [x] Add per-call OpenAI timeout handling with cancellation where supported, and map upstream timeout failures to clear 504-style API responses.
- [x] Add request body size limits for externally facing routes before expensive parsing, moderation, embedding, or recommendation work begins.
- Add retry/backoff and circuit-breaker behavior for expensive external dependencies where retrying is safe.
- Sanitize client-facing error responses so internal exception details, upstream payloads, and infrastructure hints stay out of API responses.
- Validate required environment variables on application startup for web, workers, and root services so misconfigured deployments fail early.
- Clarify idempotency and retry behavior for recommendation creation, worker retries, more-picks jobs, and failed queue recovery.
- Add a shared operator login model for operational apps. `apps/bull-board` is
  currently unprotected, and a future backoffice app should use the same
  protection instead of embedding admin access in the user-facing web app.
- Add dependency/security scanning, static security checks, and periodic security review expectations to CI or maintenance workflows.

### Data Quality Track

- [#471](https://github.com/shchilkin/PopChoice/issues/471): add a catalog metadata model for cast, directors, genres, and keywords before expanding search beyond title/year.
- [#472](https://github.com/shchilkin/PopChoice/issues/472): extend TMDB backfill/discovery to populate people and genre metadata, with catalog-health visibility for missing coverage.
- Persist TMDB backfill review cases in `tmdb_match_reviews`, then add an admin/back-office UI to resolve ambiguous matches, missing metadata, or rejected runtime/year confidence cases.
- Track catalog health signals such as duplicate movie identities, missing posters, missing localized names/overviews, missing runtimes, and stale TMDB metadata. The initial `npm run catalog:health` report covers current `movies` schema signals; admin resolution and automated refresh remain future work.
- Create a dedicated backoffice app for catalog-health reports, TMDB match
  review queues, and later manual data repair. Do not add this UI to
  `apps/web`; that app remains user-facing.
- Periodically refresh TMDB-backed metadata for older records without destabilizing existing recommendation history.
- Make seed, discovery, and backfill responsibilities explicit enough that data-quality fixes do not duplicate or fight each other.
- Define migration/versioning expectations for schema changes, including production migration safety, rollback notes, and seed/backfill coordination.

### Account Platform Track

- Add a user profile model for display name, avatar, and account settings metadata.
- Add account settings APIs and UI for profile edits, saved recommendation edits, and taste-profile management.
- Design a provider identity model before adding magic-link or social login so local credentials and external providers can coexist cleanly.
- Add saved-recommendation mutations for rename, annotate, remove, and organize actions without leaving the account page.
- Make taste memory inspectable and editable so users can correct watched, liked, not-interested, and wrong-mood signals.
- Plan scalable account memory views before the list grows: search, signal filters, pagination or virtualized lists, and compact rows for large watched/liked histories.

### Accessibility and UI Quality Track

- Add recurring accessibility checks for keyboard navigation, focus states, labels, color contrast, and reduced-motion behavior.
- Add focused tests or visual checks for the quiz, loading/results handoff, account pages, and feedback controls.
- Keep design-system examples aligned with production components so UI regressions are easier to spot before release.

### Testing and Evaluation Track

- [x] [#474](https://github.com/shchilkin/PopChoice/issues/474): add a Playwright e2e harness with an isolated migrated test database and deterministic seed fixtures.
- [x] [#475](https://github.com/shchilkin/PopChoice/issues/475): cover auth, catalog, quiz, recommendation, and feedback smoke flows through product-level e2e tests.
- [#476](https://github.com/shchilkin/PopChoice/issues/476): add an AI recommendation eval harness with deterministic fixtures by default and optional live model/provider runs.
- Keep Storybook/component tests separate from full product e2e tests so UI component regressions and app-flow regressions fail with clear ownership.
- Keep AI evals separate from normal e2e smoke tests because recommendation quality gates need fixture scoring, model controls, and optional API cost.

### Product Feedback Track

- Expand the explicit movie-memory experience so watched/not-seen setup feels complete for users with large histories.
- Expand `liked` feedback beyond exact candidate boosts into a richer positive taste signal once the canonical signal model exists.
- Consider a separate "worth rewatching" angle for watched movies so strong matches can still appear intentionally, with copy that frames them as rewatch candidates instead of new discoveries.
- Make the reason for reused titles transparent when feedback history intentionally allows a repeat.
- Manual watched-list management, rewatch mode, richer preference editing, and gamified taste history can follow after the core memory behavior is stable.
- Continue polishing the dedicated movie-memory experience around exact-title search, empty states, and large-history review now that deck state and batched submission are in place.
- Keep manual movie search as a secondary escape hatch for exact titles. Movie memory and available-movies now both expose catalog search; extract a shared catalog-search component if another surface needs the same controls.
- Treat posters and localized metadata as first-class data quality requirements for movie memory. Candidate cards should degrade gracefully, but missing poster coverage should be visible in catalog-health reporting.
- Add a stable way to avoid recommending movies the user just marked as watched, not-interested, or wrong-mood, while still allowing an intentional "rewatch" recommendation mode later.

### TMDB and Catalog Expansion Track

- Pivot recommendation retrieval toward TMDB-backed catalog coverage instead of relying primarily on the embedded/course-sized movie database.
- Keep the local `movies` table as a cache/index of known titles, embeddings, localized names, poster URLs, and TMDB ids rather than the full source of truth.
- Backfill TMDB ids for existing local movies using exact title/year matches first, then persist ambiguous or low-confidence matches for manual review.
- Add cast, director, genre, and keyword metadata as first-class catalog data before implementing actor/director/genre search.
- Add a back-office review queue for ambiguous TMDB matches, missing posters, duplicate identities, and metadata conflicts before applying risky automatic merges.
- Prefer TMDB ids for all cross-feature identity checks. Fall back to normalized title plus year only when TMDB identity is unavailable.
- Design future discovery flows around dynamic TMDB candidate sets: "I have watched many films" deck mode, quiz-assisted mode, and later a preference/taste-training mode.

### Account Experience Track

- Add magic-link style login options, with rate limits and email delivery observability.
- Add social login/provider linking after the provider identity model is stable.
- Add profile editing for display name, avatar, and basic preferences.
- Add account achievements, taste progress, and gamified memory-building only after the underlying movie-memory signals are reliable.
- Add feedback loops that explain how recommendation feedback changes future recommendations.

### Recommendation Experience Track

- Treat quiz answers, swipe reactions, account memory, and result feedback as inputs into a shared taste-signal model.
- Rework the guided quiz around "what do you want tonight?" instead of relying on a favorite movie, broad genre labels, and optional actor input.
- Add an alternate taste-swipe mode for users who have watched many films and prefer to react to concrete movie cards instead of answering abstract questions.
- Move toward TMDB-first candidate generation: use TMDB for broad discovery and keep the local database as a cache/enrichment/reranking layer rather than the whole movie universe.
- Keep TMDB ids as the preferred movie identity and log ambiguous title/year matches for later admin/back-office review.
- See [RECOMMENDATION-ROADMAP.md](./RECOMMENDATION-ROADMAP.md) for the staged plan.

### Group Recommendation Rooms Track

- Keep [#359](https://github.com/shchilkin/PopChoice/issues/359) as the umbrella for the group-room milestone instead of treating it as a single implementation PR.
- [#467](https://github.com/shchilkin/PopChoice/issues/467): build room persistence, TTL, cleanup, and participant storage first.
- [#468](https://github.com/shchilkin/PopChoice/issues/468): add share links, participant join flow, and readiness state.
- [#469](https://github.com/shchilkin/PopChoice/issues/469): run the recommendation pipeline from completed room answers and persist a stable shared result.
- [#470](https://github.com/shchilkin/PopChoice/issues/470): add QR invite and projector mode only after the core room flow works.
- Preserve the current same-device group mode until room-backed group mode is complete enough to replace it intentionally.

## Priority Items for the Next 30 Days

1. [x] Complete [#81](https://github.com/shchilkin/PopChoice/issues/81) with available-movies runtime, score, and age-rating filters on the existing catalog fields.
2. [ ] Refactor the quiz submit/results handoff so navigation state is explicit and the quiz page does not need short-lived reset guards.
3. [x] Start [#474](https://github.com/shchilkin/PopChoice/issues/474) so full e2e work has a real isolated DB foundation before adding many browser scenarios.
4. [x] Add [#475](https://github.com/shchilkin/PopChoice/issues/475) auth, catalog, quiz, and recommendation smoke flows on top of the isolated e2e harness.
5. [ ] Add [#476](https://github.com/shchilkin/PopChoice/issues/476) deterministic recommendation eval fixtures and scoring.
6. [ ] Decide the catalog metadata model in [#471](https://github.com/shchilkin/PopChoice/issues/471) before expanding #82 into actor/director/genre search.
7. [ ] Create a dedicated backoffice app for catalog-health and TMDB review, then add shared login protection for it and `apps/bull-board`.
8. [ ] Clarify production migration/versioning expectations for schema changes, rollbacks, and preview volume recreation.

## Working Checklist

### Boundary Cleanup

- [x] Route handlers validate input, call orchestration, and map responses without owning business logic in the current API surface.
- [x] Domain orchestration does not depend on route-local module placement.
- [x] Infrastructure concerns stay behind clients, repositories, or queue adapters.
- [x] Shared exports remain intentional and do not hide ownership in cross-boundary code paths.

### Recommendation Flow

- [x] A reusable recommendation pipeline exists.
- [x] Recommendation pipeline ownership is no longer tied to `src/app/api/movie-recommendation`.
- [x] Queueing, DB writes, and response mapping are separated cleanly from recommendation decision logic.
- [x] Similarity thresholds and related calibration docs point to the same source of truth.
- [x] Positive user memory (`liked`) influences ranking.
- [ ] Quiz submit handoff no longer depends on route-local reset timing.

### Documentation Alignment

- [x] README reflects the current `apps/web/src` structure.
- [x] Development docs reflect the current `apps/`, `packages/`, and `services/` layout.
- [x] Service docs and architecture docs use the same terminology for boundaries and ownership.
- [x] Agent guidance exists in root `AGENTS.md`.

## Non-Goals (For Now)

- No large-scale restructuring just to make the repo look more "monorepo-like".
- No large-scale file moves that mix structural and behavioral change.
- No broad rewrite of working features.
- No premature package splitting before clear ownership boundaries exist.
