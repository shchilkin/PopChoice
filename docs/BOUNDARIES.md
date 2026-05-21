# Architecture Boundaries

This document defines the intended ownership boundaries for PopChoice in its current workspace layout. The goal is to keep the current structure understandable now and easier to extract into dedicated packages later.

## Workspace-Level Ownership

- `apps/web` owns the user-facing Next.js app, API routes, page composition, and app-specific runtime wiring.
- `apps/bull-board` owns queue monitoring UI and operational tooling for BullMQ.
- `services/*` own background and offline processes that can run independently from the web app.
- `packages/shared` owns low-level shared helpers already reused across root services.

## apps/web/src Boundaries

### `src/app`

Owns route and page boundaries.

- Responsibilities:
  - parse requests and route params
  - validate input at the boundary
  - call orchestration modules
  - map domain/infrastructure results into HTTP responses or page props
- Should not own:
  - core recommendation decision logic
  - direct infrastructure workflows mixed with request handling
  - route-local modules that become the de facto home of domain logic

### `src/features`

Owns feature-level orchestration and domain-facing workflows that are reused by
routes, workers, or pages.

- Responsibilities:
  - coordinate recommendation, auth, catalog, and similar product workflows
  - hold feature constants, schemas, adapters, and workflow-specific tests
  - expose stable functions for route handlers and workers to call
- Should not own:
  - low-level SDK/client construction
  - generic cross-cutting infrastructure that belongs in `src/lib`
  - standalone background process entrypoints that belong in root `services/*`

### `src/integrations`

Owns app-local third-party integrations and external API access patterns used by the web app.

- Responsibilities:
  - wrap third-party APIs behind stable interfaces
  - encapsulate request shaping, retries, and response normalization for app use
- Should not own:
  - database persistence concerns
  - route wiring
  - broad domain orchestration spanning multiple subsystems unless intentionally promoted into a domain module later

### `src/clients`

Owns low-level infrastructure client setup.

- Responsibilities:
  - create/configure client instances
  - expose typed low-level access to DB or external SDKs
- Should not own:
  - business rules
  - route behavior
  - cross-system orchestration

### `src/lib`

Owns app-local infrastructure helpers, adapters, and cross-cutting runtime utilities.

- Responsibilities:
  - logging
  - auth helpers
  - queue adapters
  - DB helpers/repositories where higher-level abstractions do not yet exist
  - locale, request, and rate-limit infrastructure utilities
- Should not become:
  - a catch-all domain layer
  - the default home for unrelated business logic

### `src/utils`

Owns reusable pure or near-pure helpers.

- Responsibilities:
  - schema helpers
  - data processing helpers
  - AI utility helpers with narrow responsibilities
  - UI-only transformation helpers
- Should not own:
  - end-to-end orchestration flows
  - request/response lifecycle logic
  - hidden infrastructure dependencies unless clearly intentional

## Current Friction Points

- Compatibility re-export files still exist under `src/app/api/movie-recommendation`, so reviewers need to check whether new logic belongs in `src/features/recommendation` instead.
- Some API handlers still coordinate DB writes, queueing, and orchestration directly where no feature-owned boundary has been extracted yet.
- User movie memory currently uses `src/lib/db/recommendations.ts` directly from the route; future growth may justify a feature-owned account/movie-memory module.
- Production and preview databases can be long-lived, so schema changes must stay additive and migration-aware.

## Decision Rules

When adding new code, use these rules:

1. If it parses HTTP input or returns HTTP output, it belongs in `src/app`.
2. If it coordinates product behavior across routes, workers, or pages, it belongs in `src/features`.
3. If it configures an SDK or connection, it belongs in `src/clients`.
4. If it wraps infra concerns used across the app runtime, it belongs in `src/lib`.
5. If it is a narrow reusable helper with minimal side effects, it belongs in `src/utils`.
6. If it wraps an external API for the web app, it belongs in `src/integrations`.
7. If it is a background process that should run independently of the web app, it belongs in root `services/*`.
8. If a flow starts spanning multiple routes or runtimes, prefer extracting it toward a clearer feature/domain module boundary instead of leaving it under a route folder.
