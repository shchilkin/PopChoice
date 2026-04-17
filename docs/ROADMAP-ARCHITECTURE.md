# Architecture Roadmap (Future Monorepo Direction)

## Purpose

This roadmap exists to guide architectural refactoring in a practical, low-risk way so PopChoice stays maintainable as it grows. It focuses on improving boundaries and extractability now, while keeping future monorepo adoption straightforward when it becomes necessary.

## Current State

The repository is maintainable today and productive for ongoing work.  
The main risks are:

- boundary clarity across app/domain/infrastructure concerns
- extractability of logic into independently owned modules over time

## Target Direction for Future Monorepo Evolution

Directionally, PopChoice should evolve toward a shape that supports clear ownership and independent evolution of app, services, and shared packages, for example:

- `apps/web`
- `services/movie-discovery`
- `services/movie-seed`
- `services/movie-backfill`
- `packages/domain`
- `packages/config`
- `packages/clients`
- `packages/shared`
- optional: `packages/ui`

This is a **future direction**, not an immediate migration requirement. Current work should optimize for clean boundaries first.

## Guiding Principles

- Prefer explicit boundaries over convenience imports.
- Keep route handlers thin; move orchestration into reusable modules.
- Separate domain logic from infrastructure details (DB, API clients, queues).
- Minimize coupling and avoid hidden dependencies through broad utility barrels.
- Standardize shared tooling only after boundaries are stable.
- Refactor in small, reversible steps with existing tests and CI gates.

## Phased Plan

### Phase 1: Stabilize boundaries in the current repo

- Define and document ownership for app, domain, infrastructure, and shared helpers.
- Reduce cross-layer imports that bypass intended boundaries.
- Keep API routes focused on validation, orchestration calls, and response mapping.

### Phase 2: Refactor for extractability

- Move reusable domain logic into cohesive modules that can be lifted out later.
- Isolate external integrations behind stable client/service interfaces.
- Centralize configuration and constants to reduce manual synchronization.

### Phase 3: Introduce intentional monorepo layout

- Adopt an `apps/`, `services/`, and `packages/` structure when boundaries are proven.
- Move modules incrementally to preserve behavior and delivery speed.
- Keep migration steps explicit and reversible.

### Phase 4: Standardize shared tooling/config/testing

- Consolidate shared TypeScript, lint, formatting, and test conventions.
- Reuse config packages where duplication exists across app/services.
- Align CI checks to the new boundaries and ownership model.

## Priority Items for the Next 30 Days

1. Write a short boundary definition for `app`, `services`, `lib`, `utils`, and `clients`.
2. Identify and remove the highest-risk cross-layer imports.
3. Extract one end-to-end recommendation flow into a clearer domain-oriented module boundary.
4. Centralize recommendation-related constants/config to a single source of truth.
5. Document `src/services` vs root-level `services/*` responsibilities clearly.

## Non-Goals (For Now)

- No immediate full migration to a monorepo layout.
- No large-scale file moves that mix structural and behavioral change.
- No broad rewrite of working features.
- No premature package splitting before clear ownership boundaries exist.
