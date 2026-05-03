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

- Recommendation orchestration is reusable, but its current home under `src/app/api/...` still ties domain logic to route ownership.
- Some API handlers still coordinate DB writes, queueing, and orchestration directly.
- App-local external integrations and root `services/*` previously shared the same label, which made navigation and code review terminology ambiguous.
- Documentation has historically described a flatter root-level `src/` structure than the actual workspace layout.

## Decision Rules

When adding new code, use these rules:

1. If it parses HTTP input or returns HTTP output, it belongs in `src/app`.
2. If it configures an SDK or connection, it belongs in `src/clients`.
3. If it wraps infra concerns used across the app runtime, it belongs in `src/lib`.
4. If it is a narrow reusable helper with minimal side effects, it belongs in `src/utils`.
5. If it wraps an external API for the web app, it belongs in `src/integrations`.
6. If it is a background process that should run independently of the web app, it belongs in root `services/*`.
7. If a flow starts spanning multiple routes or runtimes, prefer extracting it toward a clearer domain-oriented module boundary instead of leaving it under a route folder.
