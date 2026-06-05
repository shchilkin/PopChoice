---
title: 'Architecture Roadmap (Current Workspace, Next Boundary Steps)'
---

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

- The current quiz is still a first-generation guided flow. It should evolve toward a signal-based recommendation model with explicit Solo/Duo/Group audience modes, Fast/Normal effort modes, a shorter "tonight" quiz, a swipe-based mode for movie-heavy users, and a TMDB-first catalog strategy. See [RECOMMENDATION-ROADMAP.md](/docs/RECOMMENDATION-ROADMAP).
- Route-local compatibility re-export files still exist under `src/app/api/movie-recommendation`; future recommendation changes should continue moving real logic into `src/features/recommendation`.
- Account settings/profile/provider identity remain intentionally thin.

Reference: use [BOUNDARIES.md](/docs/BOUNDARIES) as the current ownership baseline.

### Backlog Hygiene

- Create a GitHub issue for every actionable roadmap ticket before or alongside adding it to this document.
- If a roadmap item is too large for one PR, keep the original issue as an epic/umbrella and create focused child issues for implementation-sized work.
- Link roadmap items to concrete issues whenever possible so completed work can be checked off and future agents do not have to rediscover context.
- Keep unlinked bullets for direction-setting only; convert them into issues once they become actionable.

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
- [x] Adopt Fallow code-quality analysis in [#684](https://github.com/shchilkin/PopChoice/issues/684), starting advisory with PR-local findings before making it a required gate.
- [x] Extend Fallow cleanup beyond `apps/web` through [#697](https://github.com/shchilkin/PopChoice/issues/697) for backoffice/docs and [#698](https://github.com/shchilkin/PopChoice/issues/698) for shared/services.
- [ ] Drive inherited repo-wide Fallow complexity to zero actionable findings
      through [#717](https://github.com/shchilkin/PopChoice/issues/717), split into
      focused worker, recommendation, persistence, eval, backoffice, account/results,
      auth, catalog, and UI helper cleanup issues.

### CI/CD and Deployment Track

- [x] Build production container images in GitHub PR/CI once, publish them with commit/PR metadata, and document preview or downstream deploys running those already-built images instead of rebuilding the monorepo in each deployment environment.
- [x] Preserve provenance between a PR check, container digest, deployed preview, and `/api/build` metadata through GHCR labels, digest artifacts, runtime image metadata, and Docker-baked fallbacks.
- [x] Run Coolify from GHCR images via a single `IMAGE_TAG` release bundle instead of compiling PopChoice services on the VPS.
- [x] Add an optional Coolify deploy webhook path after successful `development` image publishing.
- [x] Define the staged `local -> development -> production` deployment model in [#556](https://github.com/shchilkin/PopChoice/issues/556), including DNS wildcard usage, Coolify service-domain mapping, development vs production resources, immutable production image tags, and preview cleanup/certificate rate-limit guidance.
- [x] Harden the preview certificate strategy in [#545](https://github.com/shchilkin/PopChoice/issues/545) by documenting single-label wildcard limits, preview cleanup, generated-domain alternatives, and Let's Encrypt registered-domain rate-limit debugging.
- Keep deployment-time work focused on migrations, health checks, runtime configuration validation, and compatibility checks rather than application compilation.
- Add a dedicated migration release gate so database migrations are visibly completed before rolling long-running web/worker services.
- Add release compatibility checks that verify all running PopChoice services report the same commit/image tag.

### Operational Observability Track

- [x] Build the self-hosted observability stack under [#498](https://github.com/shchilkin/PopChoice/issues/498). This is intentionally a learning track: SaaS tools would be simpler, but self-hosting teaches uptime checks, log shipping, metrics, traces, alerts, retention, and backups.
- [x] Add Uptime Kuma health and synthetic monitoring in [#502](https://github.com/shchilkin/PopChoice/issues/502) for `/api/health`, build metadata, and cheap smoke checks before deeper instrumentation. See [Uptime Kuma Monitoring](/docs/OBSERVABILITY-UPTIME).
- [x] Add Grafana Loki log aggregation in [#499](https://github.com/shchilkin/PopChoice/issues/499) so Coolify/Docker logs are searchable by service, level, request id, recommendation id, queue, job id, and stage. See [Observability Logs](/docs/OBSERVABILITY-LOGS).
- [x] Add Prometheus metrics and Grafana dashboards in [#501](https://github.com/shchilkin/PopChoice/issues/501) for container health, Postgres, Redis, BullMQ queues, recommendation latency, provider timeouts, and failed jobs. See [Observability Metrics](/docs/OBSERVABILITY-METRICS).
- [x] Add OpenTelemetry traces with Tempo in [#500](https://github.com/shchilkin/PopChoice/issues/500) once the low-noise uptime/logs/metrics foundation exists. See [Observability Traces](/docs/OBSERVABILITY-TRACES).
- [x] Add alert routing, retention, backups, and incident runbooks in [#503](https://github.com/shchilkin/PopChoice/issues/503) so the monitoring stack stays useful and recoverable. See [Observability Alerts](/docs/OBSERVABILITY-ALERTS) and [Observability Runbooks](/docs/OBSERVABILITY-RUNBOOKS).
- [x] Deploy the self-hosted observability stack to production in [#508](https://github.com/shchilkin/PopChoice/issues/508), including Coolify wiring, secrets, access control, alert contact points, backup coverage, and post-deploy verification.
- [x] Improve Telegram alert readability in [#525](https://github.com/shchilkin/PopChoice/issues/525) so mobile notifications show concise firing/resolved state, service, instance, severity, runbook, and silence links instead of raw Grafana expression payloads.
- [x] Tune deploy-sensitive metrics target alerts in [#526](https://github.com/shchilkin/PopChoice/issues/526) so scrape visibility gaps during ordinary redeploys are not treated like confirmed user-facing P1 outages.
- [x] Add deployment-aware alert silences and post-deploy verification in [#527](https://github.com/shchilkin/PopChoice/issues/527) so normal Coolify redeploys do not create avoidable alert noise while failed or unrecovered deploys still notify clearly.
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
- Validate required environment variables on application startup for web, workers, and root services so misconfigured deployments fail early. First slice: `apps/backoffice` and `apps/bull-board` now use process-specific plain Zod runtime configs from `@pop-choice/shared`; continue the same pattern for web, workers, and standalone catalog services.
- Clarify idempotency and retry behavior for recommendation creation, worker retries, more-picks jobs, and failed queue recovery.
- [x] Add a shared operator login model for operational apps in
      [#548](https://github.com/shchilkin/PopChoice/issues/548). `apps/bull-board`
      now supports shared Basic Auth with optional fail-closed behavior, and future
      backoffice routes should reuse the same operator-auth contract instead of
      embedding admin access in the user-facing web app.
- Add dependency/security scanning, static security checks, and periodic security review expectations to CI or maintenance workflows.

### Data Quality Track

- [x] [#471](https://github.com/shchilkin/PopChoice/issues/471): add a catalog metadata model for cast, directors, genres, and keywords before expanding search beyond title/year.
- [x] [#472](https://github.com/shchilkin/PopChoice/issues/472): extend TMDB backfill/discovery to populate people, genre, and keyword metadata, with catalog-health visibility for missing coverage.
- [x] Split the backoffice/catalog-health epic [#493](https://github.com/shchilkin/PopChoice/issues/493) into implementation-sized child issues before broad implementation starts.
- [x] Define the dedicated backoffice app boundaries, routing, deployment, and ownership model in [#547](https://github.com/shchilkin/PopChoice/issues/547). The backoffice is planned as `apps/backoffice`, deployed like `apps/bull-board`, not as UI inside `apps/web`.
- [x] Build the protected catalog-health overview in [#549](https://github.com/shchilkin/PopChoice/issues/549), covering duplicate movie identities, missing posters, missing localized names/overviews, missing runtimes, stale TMDB metadata, and missing cast/director/genre/keyword coverage.
- [x] Persist TMDB backfill review cases in `tmdb_match_reviews`, then expose a protected TMDB match review queue in [#550](https://github.com/shchilkin/PopChoice/issues/550) for ambiguous matches, missing metadata, and rejected runtime/year confidence cases. The backoffice now has status/reason filters, risk sorting, and local-vs-candidate detail pages.
- [x] Add safe review actions and audit/history rules in [#551](https://github.com/shchilkin/PopChoice/issues/551) before allowing operators to apply, reject, or defer catalog fixes. The first implemented slice supports audited TMDB candidate apply/reject/defer/reopen actions; richer metadata still flows through backfill/discovery.
- [x] Add audited catalog-health repair actions in [#559](https://github.com/shchilkin/PopChoice/issues/559), preferring queued/idempotent backfill repairs over broad direct row mutation. The first repair action queues a per-movie `catalog-maintenance` backfill job from backoffice and records actor, issue, movie snapshot, and job result in `catalog_repair_audit`.
- [x] Polish TMDB review queue decision UX in [#566](https://github.com/shchilkin/PopChoice/issues/566), including branded filter toolbar, status/reason badges, candidate confidence and warning signals, distinct apply/reject/defer/reopen hierarchy, and readable operator timestamps.
- [x] Document the backoffice visual QA checklist in [#567](https://github.com/shchilkin/PopChoice/issues/567), covering catalog health, TMDB review queue/detail states, desktop and narrow/mobile widths, focus/hover/action states, intentional table scrolling, and screenshot evidence expectations for future operator UI PRs.
- [x] Add responsive backoffice repair actions in [#592](https://github.com/shchilkin/PopChoice/issues/592), including pending/success/error states, duplicate-click protection, and live row updates after successful queued repair. The first slice keeps progressive-enhanced HTML with JSON responses for enhanced requests; a heavier client data layer is deferred until pagination, virtualization, or bulk repair flows need it.
- [x] Migrate the dedicated backoffice app to Next.js in [#596](https://github.com/shchilkin/PopChoice/issues/596) before adding larger interactive operator workflows. The `apps/backoffice` deployment boundary, routes, health check, and Coolify port stay the same, while catalog health, TMDB reviews, and repair actions now run through React/App Router pages and route handlers.
- [x] Add large backoffice table pagination in [#591](https://github.com/shchilkin/PopChoice/issues/591): TMDB review queue pagination landed in [#600](https://github.com/shchilkin/PopChoice/issues/600), and the follow-up slice adds catalog-health issue row browsing plus paginated catalog repair audit history.
- [x] Add safe bulk catalog repair enqueueing in [#593](https://github.com/shchilkin/PopChoice/issues/593), with bounded batches, deduped `catalog-maintenance` jobs, grouped audit summaries, and worker-side TMDB/OpenAI pacing preserved.
- [x] Add durable repair batch/item storage in [#572](https://github.com/shchilkin/PopChoice/issues/572), so bulk repairs write `catalog_repair_batches` and `catalog_repair_batch_items` before enqueueing BullMQ jobs, and workers persist basic processing/completed/skipped/final-failed status. Follow-up issue re-checking and operator views stay in [#574](https://github.com/shchilkin/PopChoice/issues/574)-[#575](https://github.com/shchilkin/PopChoice/issues/575).
- [x] Add the shared catalog movie detail query in [#576](https://github.com/shchilkin/PopChoice/issues/576), aggregating local movie fields, health flags, duplicate context, TMDB review context, normalized metadata, and repair audit rows for the upcoming backoffice detail page.
- [x] Expose the shared catalog movie detail query through the backoffice route in [#577](https://github.com/shchilkin/PopChoice/issues/577), showing identity, health flags, local/TMDB metadata, people/taxonomy coverage, duplicate context, related TMDB reviews, and repair audit history with a branded missing-movie 404.
- [x] Make full-issue backoffice `Queue all` repairs asynchronous and durable in [#630](https://github.com/shchilkin/PopChoice/issues/630), so large sweeps create orchestration work quickly and enqueue repair items from workers instead of long operator HTTP requests.
- [x] Add a native backoffice `catalog-maintenance` queue view in [#627](https://github.com/shchilkin/PopChoice/issues/627), keeping Bull Board as the deeper queue console while surfacing operator-friendly counts, job summaries, and links.
- [x] Add realtime backoffice `catalog-maintenance` queue updates in [#638](https://github.com/shchilkin/PopChoice/issues/638), using server-sent BullMQ `QueueEvents` to push current queue and catalog-health snapshots without waiting for manual refresh, with catalog-health copy focused on operator state instead of implementation details.
- [x] Improve repair batch triage for failed and unresolved items in [#628](https://github.com/shchilkin/PopChoice/issues/628), including filters for partial, stuck, failed, and `completed_unresolved` items plus recovery links.
- [x] Clarify queued vs resolved repair states across catalog health in [#629](https://github.com/shchilkin/PopChoice/issues/629), reserving success language and styling for actually resolved catalog issues.
- [x] Extend real-data recommendation eval operations from [#490](https://github.com/shchilkin/PopChoice/issues/490) into backoffice: operators can queue mock, real-data, and guarded live eval runs, inspect persisted summaries/results, and rely on the web worker `recommendation-evals` queue instead of ad hoc local script output.
- [x] Add duplicate merge dry-run and audit foundations in [#568](https://github.com/shchilkin/PopChoice/issues/568), including an idempotent `catalog_duplicate_merge_audit` schema and a shared read-only dry-run helper that returns canonical/loser snapshots, affected recommendation/metadata/review/user-memory counts, conflict samples, and safety warnings before any destructive merge UI exists.
- [x] Add the transactional duplicate movie merge helper in [#569](https://github.com/shchilkin/PopChoice/issues/569), rewiring recommendation rows, metadata join tables, TMDB reviews, catalog repair batch items, and user movie memory in one audited transaction before exposing operator merge UI.
- Periodically refresh TMDB-backed metadata for older records without destabilizing existing recommendation history.
- Make seed, discovery, and backfill responsibilities explicit enough that data-quality fixes do not duplicate or fight each other.
- Define migration/versioning expectations for schema changes in [#494](https://github.com/shchilkin/PopChoice/issues/494), including production migration safety, rollback notes, and seed/backfill coordination.

### Backoffice Operator Maturity Track

Continue post-MVP backoffice work under the follow-up epic
[#660](https://github.com/shchilkin/PopChoice/issues/660), linked back to the
original backoffice/catalog-health epic [#493](https://github.com/shchilkin/PopChoice/issues/493).
The original epic established the dedicated app, catalog-health review, safe
repair actions, durable repair batches, queue visibility, realtime updates, and
duplicate-merge foundations. The maturity track keeps the next operator-console
work implementation-sized:

- [#661](https://github.com/shchilkin/PopChoice/issues/661): add deterministic
  e2e coverage for core operator flows such as catalog-health repair enqueueing,
  repair-batch triage, realtime queue state, TMDB review actions, and duplicate
  merge preview/submit once the UI exists.
- [#662](https://github.com/shchilkin/PopChoice/issues/662): extract shared
  backoffice operator UI primitives for repeated page headers, toolbars, panels,
  status badges, data tables, empty states, error states, and action affordances.
- [#663](https://github.com/shchilkin/PopChoice/issues/663): standardize
  backoffice action route contracts for same-origin/auth failures, validation
  errors, progressive-enhanced redirects, JSON responses, and public operator
  error messages.
- [#664](https://github.com/shchilkin/PopChoice/issues/664): improve bulk repair
  recovery UX so operators can understand partial, failed, skipped,
  unavailable, and unresolved work, then retry only the failed or unavailable
  items.
- [#665](https://github.com/shchilkin/PopChoice/issues/665): harden realtime
  queue resilience with visible live/stale/reconnecting/unavailable states,
  last successful snapshot timestamps, and manual refresh or polling fallback.
- [#666](https://github.com/shchilkin/PopChoice/issues/666): complete TMDB
  review workflow follow-ups such as next-review navigation, clearer risk
  summaries, decision history, safe bulk affordances, and richer filters.
- [#667](https://github.com/shchilkin/PopChoice/issues/667): add backoffice
  observability and security guardrails for operator action logs, metrics,
  same-origin/CSRF coverage, and secret-safe public error responses.
- [#668](https://github.com/shchilkin/PopChoice/issues/668): improve backoffice
  developer experience with reusable fixtures, deterministic realtime/action
  test helpers, and clearer local validation docs.

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
- [x] Cover the current recommendation entry matrix in browser smoke tests: Normal Solo, Normal Duo, Normal Group, Fast Pick Solo, Fast Pick Duo, and Fast Pick Group.
- [x] [#476](https://github.com/shchilkin/PopChoice/issues/476): add an AI recommendation eval harness with deterministic fixtures by default and optional live model/provider runs.
- [x] [#490](https://github.com/shchilkin/PopChoice/issues/490): add a scheduled or manually triggered real-data recommendation eval workflow with seeded database data and real catalog retrieval.
- Add [#606](https://github.com/shchilkin/PopChoice/issues/606) deterministic recommendation scenarios that validate audience behavior, match-depth behavior, source-strategy behavior, and meaningful-pick quality, not only response shape.
- [x] [#618](https://github.com/shchilkin/PopChoice/issues/618): classify and refactor the current seeded `--real-data` checks so they are clearly catalog retrieval/candidate-availability evals and can be reused by worker jobs.
- [x] [#616](https://github.com/shchilkin/PopChoice/issues/616): persist recommendation eval run/result history for backoffice and worker reports.
- [x] [#617](https://github.com/shchilkin/PopChoice/issues/617): add bounded non-live BullMQ jobs for environment retrieval and source-strategy evals against the configured database.
- [x] [#619](https://github.com/shchilkin/PopChoice/issues/619): add a protected backoffice recommendation eval UI for safe runs, status, history, and report details.
- [x] [#620](https://github.com/shchilkin/PopChoice/issues/620): add guarded, audited live-provider evals only after safe backoffice evals exist.
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
- Plan [#607](https://github.com/shchilkin/PopChoice/issues/607) before switching defaults from local-vector-first plus TMDB fallback to TMDB-first broad candidate generation plus local cache, enrichment, memory, and reranking.
- Backfill TMDB ids for existing local movies using exact title/year matches first, then persist ambiguous or low-confidence matches for manual review.
- Add cast, director, genre, and keyword metadata as first-class catalog data before implementing actor/director/genre search.
- [x] Move TMDB discovery, backfill, and metadata refresh into shared rate-limited BullMQ catalog workers in [#492](https://github.com/shchilkin/PopChoice/issues/492) before growing catalog volume. The worker enforces one configurable TMDB request budget across catalog-maintenance jobs, honors `429` with backoff, dedupes jobs by stable `tmdbId`/`movieId` keys, and exposes queue depth/failures in Bull Board.
- [x] Add the metadata v1 quality contract for recommendations: hot movie columns for identity/language/quality/popularity, normalized watch providers for `US`, `FI`, and `RU`, bounded TMDB details enrichment for top direct TMDB candidates, and catalog-health/eval checks for low-quality metadata.
- Add a back-office review queue for ambiguous TMDB matches, missing posters, duplicate identities, and metadata conflicts in [#493](https://github.com/shchilkin/PopChoice/issues/493) before applying risky automatic merges.
- Prefer TMDB ids for all cross-feature identity checks. Fall back to normalized title plus year only when TMDB identity is unavailable.
- Design future discovery flows around dynamic TMDB candidate sets: "I have watched many films" deck mode, quiz-assisted mode, and later a preference/taste-training mode.

### Account Experience Track

- Add magic-link style login options, with rate limits and email delivery observability.
- Add social login/provider linking after the provider identity model is stable.
- Add profile editing for display name, avatar, and basic preferences.
- Add account achievements, taste progress, and gamified memory-building only after the underlying movie-memory signals are reliable.
- Add feedback loops that explain how recommendation feedback changes future recommendations.

### Recommendation Experience Track

- Define Recommendation V2 in [#610](https://github.com/shchilkin/PopChoice/issues/610) around three independent axes: audience context, match depth, and candidate source strategy.
- Treat quiz answers, swipe reactions, account memory, and result feedback as inputs into a shared taste-signal model.
- Rework the guided quiz around "what do you want tonight?" instead of relying on a favorite movie, broad genre labels, and optional actor input.
- Build [#609](https://github.com/shchilkin/PopChoice/issues/609) as the Fast Pick guided flow with minimal intent, hard avoids, and discovery appetite. The current flow separates audience selection from match depth, supports Solo/Duo/Group, and sends `experienceMode: fast-pick`.
- Build [#608](https://github.com/shchilkin/PopChoice/issues/608) as the Normal mode flow with richer positive/negative signals, optional reference movies, and first-class Duo compromise handling. The first slices add Normal-mode hard avoids, carry those negative signals through the existing recommendation payload, and expose Duo as a separate two-person entry/results path.
- Add an alternate taste-swipe mode for users who have watched many films and prefer to react to concrete movie cards instead of answering abstract questions.
- Start [#612](https://github.com/shchilkin/PopChoice/issues/612) by carrying candidate source provenance through recommendation results, persistence, logs, eval reports, a source-strategy policy, and route/job/pipeline metadata before changing retrieval defaults.
- Connect [#612](https://github.com/shchilkin/PopChoice/issues/612) to retrieval behavior in stages: bounded `hybrid-fast`/`compromise-hybrid` fallback first, then `tmdb-first` generation with hard-avoid/discovery-aware TMDB query shaping and source/metadata eval thresholds before making it the Normal quality default.
- Add `experienceMode` as the product-facing selector for this policy layer, defaulting existing traffic to `normal-match` while letting Fast Pick requests choose `fast-pick`.
- Move toward TMDB-first candidate generation: use TMDB for broad discovery and keep the local database as a cache/enrichment/reranking layer rather than the whole movie universe.
- Keep TMDB ids as the preferred movie identity and log ambiguous title/year matches for later admin/back-office review.
- See [RECOMMENDATION-ROADMAP.md](/docs/RECOMMENDATION-ROADMAP) for the staged plan.

### Group Recommendation Rooms Track

- Keep [#359](https://github.com/shchilkin/PopChoice/issues/359) as the umbrella for the group-room milestone instead of treating it as a single implementation PR.
- [#467](https://github.com/shchilkin/PopChoice/issues/467): build room persistence, TTL, cleanup, and participant storage first.
- [#468](https://github.com/shchilkin/PopChoice/issues/468): add share links, participant join flow, and readiness state.
- [#469](https://github.com/shchilkin/PopChoice/issues/469): run the recommendation pipeline from completed room answers and persist a stable shared result.
- [#470](https://github.com/shchilkin/PopChoice/issues/470): add QR invite and projector mode only after the core room flow works.
- Preserve the current same-device group mode until room-backed group mode is complete enough to replace it intentionally.

## Priority Items for the Next 30 Days

1. [x] Complete [#81](https://github.com/shchilkin/PopChoice/issues/81) with available-movies runtime, score, and age-rating filters on the existing catalog fields.
2. [x] Refactor the quiz submit/results handoff in [#484](https://github.com/shchilkin/PopChoice/issues/484) so navigation state is explicit and the quiz page does not need short-lived reset guards.
3. [x] Start [#474](https://github.com/shchilkin/PopChoice/issues/474) so full e2e work has a real isolated DB foundation before adding many browser scenarios.
4. [x] Add [#475](https://github.com/shchilkin/PopChoice/issues/475) auth, catalog, quiz, and recommendation smoke flows on top of the isolated e2e harness.
5. [x] Add [#476](https://github.com/shchilkin/PopChoice/issues/476) deterministic recommendation eval fixtures and scoring.
6. [x] Add [#490](https://github.com/shchilkin/PopChoice/issues/490) scheduled/manual real-data recommendation evals for seeded DB and catalog-retrieval changes.
7. [x] Decide the catalog metadata model in [#471](https://github.com/shchilkin/PopChoice/issues/471) before expanding #82 into actor/director/genre search.
8. [x] Populate the catalog metadata model in [#472](https://github.com/shchilkin/PopChoice/issues/472) from TMDB backfill/discovery before expanding #82 into actor/director/genre search.
9. [x] Expand available-movies search in [#473](https://github.com/shchilkin/PopChoice/issues/473) across title, actor/director, and genre metadata populated by #472.
10. [x] Move TMDB discovery/backfill/metadata refresh into shared rate-limited BullMQ catalog workers in [#492](https://github.com/shchilkin/PopChoice/issues/492) before increasing catalog expansion volume.
11. [x] Plan and split the [#493](https://github.com/shchilkin/PopChoice/issues/493) backoffice/catalog-health epic, including shared login protection for it and `apps/bull-board`.
12. [x] Clarify production migration/versioning expectations in [#494](https://github.com/shchilkin/PopChoice/issues/494) for schema changes, rollbacks, and preview volume recreation.
13. [x] Complete the first self-hosted observability track in [#498](https://github.com/shchilkin/PopChoice/issues/498) with uptime, logs, metrics, traces, alerts, retention, backups, and runbooks.
14. [x] Deploy the self-hosted observability stack to production in [#508](https://github.com/shchilkin/PopChoice/issues/508) and verify metrics, logs, traces, alerts, access control, and backups on the VPS.
15. [x] Improve Grafana Telegram alert formatting in [#525](https://github.com/shchilkin/PopChoice/issues/525) after the first production alert examples.
16. [x] Reclassify deploy-sensitive app metrics target alerts in [#526](https://github.com/shchilkin/PopChoice/issues/526) so P1 remains reserved for user-facing or core dependency outages.
17. [x] Plan deploy-aware alert silences and post-deploy verification in [#527](https://github.com/shchilkin/PopChoice/issues/527).
18. [x] Define the `local -> development -> production` deployment model in [#556](https://github.com/shchilkin/PopChoice/issues/556), including domain layout, GHCR image-tag policy, preview cleanup, certificate-rate-limit notes, and production promotion/rollback expectations.

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
