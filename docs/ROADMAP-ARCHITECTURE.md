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

### Issues Still Present

- The quiz-to-results handoff still relies on route-local state and a short-lived browser handoff marker to avoid visual flashes. A follow-up PR should simplify this architecture so the quiz route never needs to reset itself while it is still responsible for rendering the submit handoff.

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

### Phase 3: Extract intentional packages from the existing layout

- Use the existing `apps/`, `services/`, and `packages/` layout more intentionally as boundaries become clearer.
- Move modules incrementally to preserve behavior and delivery speed.
- Keep migration steps explicit and reversible.

### Phase 4: Standardize shared tooling/config/testing

- Consolidate shared TypeScript, lint, formatting, and test conventions.
- Reuse config packages where duplication exists across app/services.
- Align CI checks to the new boundaries and ownership model.

## Priority Items for the Next 30 Days

1. [x] Write a short boundary definition for `src/app`, `src/integrations`, `src/lib`, `src/utils`, and `src/clients`.
2. [x] Identify and remove the highest-risk cross-layer imports in the recommendation flows.
3. [x] Move one end-to-end recommendation flow behind a clearer domain-oriented module boundary outside `src/app/api`.
4. [x] Centralize recommendation-related constants and calibration guidance to a single source of truth.
5. [x] Separate app-local integrations from root-level `services/*` with explicit naming and documentation.
6. [x] Update README and development docs so the documented structure matches the current workspace layout.

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

### Documentation Alignment

- [x] README reflects the current `apps/web/src` structure.
- [x] Development docs reflect the current `apps/`, `packages/`, and `services/` layout.
- [x] Service docs and architecture docs use the same terminology for boundaries and ownership.

## Non-Goals (For Now)

- No large-scale restructuring just to make the repo look more "monorepo-like".
- No large-scale file moves that mix structural and behavioral change.
- No broad rewrite of working features.
- No premature package splitting before clear ownership boundaries exist.
