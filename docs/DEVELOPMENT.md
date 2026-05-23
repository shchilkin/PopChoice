# Development Guide

For ongoing code health reviews, use the **[Maintainability Checklist](./MAINTAINABILITY-CHECKLIST.md)**.
For ownership rules across the current workspace layout, use **[Architecture Boundaries](./BOUNDARIES.md)**.

## Prerequisites

- Node.js 24+ and npm (match the version required by the `package.json` `engines` field)
- Git
- VS Code (recommended)

## Development Scripts

### Testing

- `npm run test` - Run all tests using Vitest
- `npm run test:server` - Run utility function tests (Node.js environment)
- `npm run test:storybook` - Run Storybook component tests (browser environment)

### Code Quality

- `npm run lint` or `npm run lint:check` - Run ESLint for code linting
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format:check` - Check code formatting with Prettier
- `npm run format:write` - Fix code formatting with Prettier
- `npm run format:package` - Sort and format package.json
- `npm run type-check` - Run TypeScript type checking
- `npm run fix` - Run all fixes (lint, format, package.json)

### Development

- `npm run dev` - Start development server
- `npm run build` - Build production application
- `npm run start --workspace=apps/web` - Start production server
- `npm run copy:env` - Copy the root `.env` into `apps/*`, `services/*`, and `packages/shared`
- `npm run migrate:db` - Apply all idempotent SQL migrations from `db/init`
- `npm run storybook` - Start Storybook development server
- `npm run build-storybook` - Build Storybook for production

Workspace-local scripts used during app development:

- `cd apps/web && npm run start:workers` - Start BullMQ workers for async recommendations
- `cd apps/web && npm run bull-board` - Open the BullMQ dashboard locally

### Database & Data Management

- `npm run setup:local-db` - Start local PostgreSQL + Redis via Docker and write credentials to `.env`
- `npm run populate-db` - Seed the database with movie embeddings via the `movie-seed` service
- `npm run cleanup:local-db` - Stop containers and remove the database volume (full reset)
- `npm run analyze-movies` - Analyze movie data chunks for embedding optimization
- `npm run calibrate-similarity` - Recalibrate recommendation similarity thresholds against the live DB

## Database Setup Workflow

The project includes scripts to help you set up and manage your movie recommendation database. All commands run from the **repo root**:

1. **Start the DB** - Run `npm run setup:local-db` to spin up PostgreSQL + Redis and initialize credentials
2. **Sync env files** - Run `npm run copy:env` so the web app and services use the updated root `.env`
3. **Seed the DB** - Run `npm run populate-db` to import movies (via `services/movie-seed`) into PostgreSQL
4. **Run the app** - Start `npm run dev` from the repo root and `cd apps/web && npm run start:workers` in a second terminal
5. **Reset** - Run `npm run cleanup:local-db` to wipe everything, then repeat from step 1

The `movie-seed` service reads its movie list from `services/movie-seed/movies.txt`.

## Schema and Metadata Notes

Features that depend on movie metadata need both schema and data to be present.
For example, movie-memory cards use poster URLs, localized names, TMDB ids, and
movie identity keys. When adding fields like these:

- add the column to the schema initialization path
- add an idempotent migration or `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  path for existing local, preview, and production databases
- update seed/backfill code so existing rows eventually receive the new data
- make the UI degrade gracefully while the backfill is incomplete
- document whether an existing Coolify preview volume needs to be recreated

If a preview deployment has a long-lived PostgreSQL volume, new code may run
against an older schema until migrations run or the preview is recreated.

## Local Runbook

For a full local environment that matches the async recommendation flow, use this sequence from the repo root:

```bash
cp .env.example .env
npm install
npm run setup:local-db
npm run copy:env
npm run populate-db
```

Then run the app in separate terminals:

```bash
# terminal 1
npm run dev

# terminal 2
cd apps/web
npm run start:workers

# optional terminal 3
cd apps/web
npm run bull-board
```

If you change the root `.env`, re-run `npm run copy:env` before restarting the app or workers.

## Mock Data Fallback

When `DATABASE_URL` is not set (or the database client is not configured), the `/api/movies` route automatically returns generated mock data instead of querying PostgreSQL. This means the **Available Movies** page works out of the box in local development without any database setup — you will see placeholder movies with realistic fields (name, age rating, duration, score, year).

To switch to real data, add `DATABASE_URL` to your `.env` file and seed the database as described above.

## Code Style and Conventions

- **TypeScript** - All new code should be TypeScript
- **ESLint** - Follows Next.js and Prettier configurations
- **Prettier** - Code formatting is enforced
- **Import organization** - Auto-sorted with eslint-plugin-import

## Testing Strategy

- **Unit tests** - Vitest for utility functions and business logic
- **Component tests** - Storybook with Vitest integration
- **Browser tests** - Playwright for end-to-end scenarios

### End-to-End Database Harness

Run the deterministic e2e smoke suite from the repo root:

```bash
npm run test:e2e
```

The command prepares an isolated environment:

- `docker-compose.e2e.yml` starts PostgreSQL with pgvector on `127.0.0.1:55432` and Redis on `127.0.0.1:56379`.
- `scripts/e2e/setup-db.mjs` resets the e2e compose project, applies every `db/init/*.sql` migration through `apps/web/scripts/migrate-db.js`, and seeds deterministic movie fixtures.
- `apps/web/playwright.e2e.config.ts` starts the app on `http://127.0.0.1:3100` with `DATABASE_URL` and `REDIS_URL` pointed at the isolated services.
- `E2E_DETERMINISTIC_RECOMMENDATIONS=1` makes quiz submissions complete from seeded fixtures instead of calling live OpenAI/TMDB services or requiring a worker process.

Stop and remove the e2e services with:

```bash
npm run test:e2e:down
```

The smoke coverage proves `/api/health`, Available Movies filtering and empty states, auth/session flows, solo quiz submission, result rendering, recommendation feedback, and movie-memory persistence. AI-response evals remain separate so they can add fixture scoring and optional live-model runs without slowing normal e2e.

### Recommendation Eval Harness

Run the deterministic recommendation eval suite from the repo root:

```bash
npm run eval:recommendations
```

The default eval path uses fixture prompts, fixture user-memory constraints, and mocked recommendation outputs. It does not call OpenAI, TMDB, Redis, or PostgreSQL. The runner writes `apps/web/test-results/recommendation-evals/report.json` and prints a concise pass/fail summary. Current scoring checks:

- response shape against the `ApiResponse` schema
- main pick and alternates stay inside the fixture candidate set
- forbidden safety terms are absent
- watched, rejected, and explicitly forbidden titles are not repeated
- explanation text is specific enough for the fixture expectations

Run live-provider evals only when intentionally checking model/provider behavior:

```bash
npm run eval:recommendations -- --live
```

Live evals require configured provider and database environment variables such as `OPENAI_API_KEY`, `DATABASE_URL`, and usually `TMDB_API_KEY`. CI blocks on the deterministic eval job; live evals are manual so normal PR checks stay cheap and predictable.

Use three eval levels when changing AI-related code:

1. `npm run eval:recommendations` for every PR that changes recommendation prompts, embeddings, candidate filters, ranking, feedback signals, response shape, or eval fixtures.
2. A real-data eval for changes that affect catalog retrieval, schema, seeding/backfill, or candidate availability. This should be scheduled or manually triggered against a seeded database; it should not be a default per-PR hard gate until it is proven cheap and stable.
3. `npm run eval:recommendations -- --live` only when intentionally checking live model/provider behavior before larger recommendation changes. Live runs can spend API credits and depend on provider availability, so agents should call out whether they ran it or why they did not.

## Project Structure

```text
apps/
├── web/
│   └── src/
│       ├── app/           # Next.js route and page boundaries
│       ├── clients/       # Low-level infrastructure clients
│       ├── components/    # Reusable React components
│       ├── features/      # Feature-owned orchestration and domain-facing modules
│       ├── hooks/         # React hooks
│       ├── i18n/          # Locale support
│       ├── integrations/  # App-local third-party API wrappers
│       ├── lib/           # App-local infra helpers and adapters
│       ├── mocks/         # Mock handlers and test support
│       ├── styles/        # Styling and theme assets
│       └── utils/         # Reusable utility helpers
├── bull-board/            # Queue monitoring app
packages/
└── shared/                # Shared helpers reused by root services
services/
├── movie-discovery/       # Scheduled or one-shot TMDB discovery process
├── movie-seed/            # Database seeding process
└── movie-backfill/        # Metadata backfill process
db/                        # SQL scripts and DB initialization assets
```

## Boundary Notes

- `apps/web/src/app` should stay focused on route/page boundaries.
- `apps/web/src/features` should own cross-route product behavior such as recommendation, auth, and catalog workflows.
- `apps/web/src/clients` should own low-level client setup.
- `apps/web/src/integrations` should own app-local wrappers around third-party APIs.
- `apps/web/src/lib` should hold app-local infrastructure helpers, not become a catch-all business layer.
- `apps/web/src/utils` should stay narrow and reusable, not absorb end-to-end orchestration.
- Root `services/*` are standalone background or offline runtimes.

See [BOUNDARIES.md](./BOUNDARIES.md) for the full ownership definitions.
