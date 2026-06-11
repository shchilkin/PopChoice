# PopChoice Agent Guide

## Project Snapshot

PopChoice is a Next.js 16 / React 19 movie recommendation app built around OpenAI embeddings, PostgreSQL + pgvector, Redis-backed BullMQ workers, and TMDB metadata. The repository is an npm workspace monorepo:

- `apps/web` - user-facing Next.js app, API routes, feature modules, workers, and app-local scripts.
- `apps/bull-board` - local/production BullMQ queue dashboard.
- `packages/shared` - shared database, embedding, logging, and utility code used by root services.
- `services/movie-seed` - one-shot curated movie seeding from `movies.txt`.
- `services/movie-discovery` - scheduled or one-shot TMDB catalog expansion.
- `services/movie-backfill` - one-shot TMDB identity/runtime/age-rating backfill with manual-review records.
- `db/init` - idempotent SQL migrations used by Docker init and `apps/web/scripts/migrate-db.js`.

## Local Workflow

Use Node.js 24+ and npm 11+.

```bash
npm install
npm run setup:local-db
npm run copy:env
npm run populate-db
npm run dev
```

Run workers separately when testing the async recommendation flow:

```bash
cd apps/web
npm run start:workers
```

Useful checks from the repo root:

```bash
npm run lint:check
npm run type-check
npm run test
npm run test:services
npm run build
```

Storybook component tests require Playwright browsers:

```bash
npm run pretest:storybook --workspace=apps/web
npm run test:storybook
```

## E2E Workflow

Run browser e2e tests through the isolated Docker harness unless the user explicitly says the
e2e services are already running:

```bash
npm run test:e2e:setup
npm run test:e2e:run
npm run test:e2e:down
```

- `npm run test:e2e:setup` starts `docker-compose.e2e.yml`, waits for PostgreSQL on
  `127.0.0.1:55432` and Redis on `127.0.0.1:56379`, applies migrations, and seeds deterministic
  fixtures.
- `npm run test:e2e:run` alone assumes that setup already happened. If it fails with
  `ECONNREFUSED 127.0.0.1:56379`, the e2e Redis service is not running; run
  `npm run test:e2e:setup` and retry before treating it as an app regression.
- Always run `npm run test:e2e:down` after local e2e runs to remove the disposable containers,
  network, and volumes.

## Environment Notes

- The root `.env` is the source of truth for local development.
- Run `npm run copy:env` after editing `.env`; it syncs app, service, and shared package env files.
- `DATABASE_URL`, `OPENAI_API_KEY`, and `TMDB_API_KEY` are required for realistic recommendation/catalog behavior.
- `REDIS_URL` enables BullMQ queues, rate limiting, workers, and Bull Board. Without Redis, some flows use inline or disabled fallbacks.
- `AUTH_SESSION_SECRET`, `API_KEY_HMAC_SECRET`, and `VALID_API_KEYS` matter for production auth. Development can run with relaxed API-key auth when `VALID_API_KEYS` is absent.

## Architecture Boundaries

- Keep `apps/web/src/app` focused on route/page boundaries: parse input, validate, call feature/lib modules, and map responses.
- Put cross-route product behavior in `apps/web/src/features`, especially recommendation, auth, and catalog orchestration.
- Keep SDK/client setup in `apps/web/src/clients`.
- Keep app-local infrastructure helpers in `apps/web/src/lib`, including auth, queue adapters, DB repositories, logging, rate limiting, locale, and runtime helpers.
- Keep external API wrappers in `apps/web/src/integrations`.
- Keep pure or near-pure helpers in `apps/web/src/utils`.
- Keep independently runnable background/offline processes in root `services/*`.
- Prefer direct imports from owned modules over broad barrels when crossing important boundaries.

See `docs/BOUNDARIES.md` for the canonical boundary rules.

## UI Implementation

- Prefer existing shared UI components from `apps/web/src/components` and established route primitives before creating one-off buttons, inputs, chips, cards, or form controls.
- If a reusable component is missing a needed state or size, extend the shared component conservatively instead of duplicating styling in page-local code.

## Recommendation Flow

- Legacy synchronous API: `POST /api/movie-recommendation`.
- Async persisted API: `POST /api/recommendations`, result polling at `/api/recommendations/[id]`, feedback at `/api/recommendations/[id]/feedback`, and more picks at `/api/recommendations/[id]/more-picks`.
- Core recommendation orchestration lives in `apps/web/src/features/recommendation`.
- Route-local files under `apps/web/src/app/api/movie-recommendation` are mostly API entrypoints or compatibility re-exports; new shared recommendation behavior belongs in the feature layer.
- User movie memory is exposed through `/account/movie-memory` and `/api/account/movie-memory`.
- Movie identity should prefer TMDB ids and fall back to normalized title plus year via `apps/web/src/lib/movieIdentity.ts`.

## AI and Recommendation Evaluation

- Product e2e tests do not call live AI providers. `E2E_DETERMINISTIC_RECOMMENDATIONS=1` verifies the real browser/API/DB/results/feedback flow with deterministic recommendation fixtures, not model quality.
- `npm run eval:recommendations` is the default AI regression gate. It is deterministic, CI-blocking, and does not require OpenAI, TMDB, Redis, or PostgreSQL.
- If changes touch recommendation prompts, OpenAI/TMDB integration, embeddings, candidate filtering/ranking, movie-memory feedback, recommendation result shape, or eval fixtures, run `npm run eval:recommendations` and report the result. If you cannot run it, explain why.
- If changes affect real catalog retrieval, schema, seed/backfill data, or candidate availability, also consider whether a real-data eval is needed. Real-data evals should be scheduled/manual, may require a seeded DB, and should be documented as follow-up when not run.
- Live provider evals (`npm run eval:recommendations -- --live`) are manual because they can spend API credits and be flaky. Do not make them a default CI gate or run them unless the user explicitly wants live-provider validation and the required env is configured.

## Database and Migrations

- Keep `db/init/*.sql`, `db/createDB.sql`, and service/app schema helpers in sync when adding schema.
- Additive changes should be idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) because local, preview, and production databases can be long-lived.
- `npm run migrate:db` runs `apps/web/scripts/migrate-db.js`, which applies all `db/init/*.sql` files in order.
- Metadata-dependent UI needs both schema and data. For fields such as `poster_url`, `localized_name`, and `tmdb_id`, update seed/discovery/backfill code and make the UI tolerate incomplete rows.

## Documentation Expectations

When code changes affect setup, scripts, architecture, services, CI, or deployment:

- Update `README.md` for broad user-facing workflow changes.
- Update the relevant file in `docs/`.
- Update `docs/ROADMAP-ARCHITECTURE.md` when work completes or new known follow-ups appear.
- Keep service READMEs aligned with their actual scripts and environment variables.

When adding new roadmap work:

- Create a GitHub issue for each actionable new ticket before or alongside adding it to roadmap docs.
- If the work is broad, keep the original issue as an epic/umbrella and create focused implementation issues underneath it.
- Prefer roadmap entries that link to concrete issues; avoid long-lived untracked bullets unless they are intentionally exploratory notes.

## Pre-PR UI Critique

Before opening or marking ready any PR that changes user-facing or operator-facing UI, run
`$impeccable critique` against the affected page, component, or route. Address the actionable
issues before publishing the PR. If a finding is intentionally deferred, document why in the PR
description and add or link a follow-up issue.

Do not commit raw `.impeccable/critique/*` snapshots. They are local agent working notes and are
ignored by git. Promote durable decisions into `DESIGN.md`, `docs/UI-DEVELOPMENT.md`,
`docs/ROADMAP-ARCHITECTURE.md`, or the PR description instead.

## Gotchas

- Next.js uses `apps/web/src/proxy.ts` for the CSRF cookie path. Older docs or comments may still say middleware.
- CI skips heavy jobs for docs-only PRs but still reports `PR Validation`.
- Root `npm run test:services` runs `packages/shared` tests, then uses Turbo across `services/*` packages that define a `test` script. Use `npm run build:services` for a service compile pass.
- Coolify preview databases can preserve old volumes. New schema-dependent code may need migrations or preview recreation before it works.
