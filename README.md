<div align="center">
  <img src="/apps/web/public/popcorn.svg" alt="Popcorn Mascot" width="200" />
</div>

# PopChoice

PopChoice is a **movie recommendation engine** that uses AI embeddings and vector databases to provide personalized movie suggestions based on user preferences.

This is a solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

## ✨ Features

- 🎬 **AI-Powered Recommendations** - Uses OpenAI embeddings for semantic movie matching
- 📊 **Interactive Questionnaire** - Collects user preferences through engaging questions
- 🔍 **Vector Search** - Lightning-fast similarity search with pgvector
- 🧠 **Account Movie Memory** - Signed-in users can mark watched/not-seen movies and improve future picks
- 🔄 **Async Recommendation Jobs** - Persisted recommendation requests run through BullMQ workers with progress polling
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🧪 **Component Library** - Built with Storybook for consistent UI components

## 🛠 Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **AI/ML:** OpenAI Embeddings API, LangChain Core
- **Database:** PostgreSQL with pgvector, Redis (rate limiting)
- **Background Jobs:** BullMQ, Bull Board (monitoring dashboard)
- **Animation:** Motion
- **Movie Data:** TMDB (The Movie Database) API
- **Validation:** Zod
- **Logging:** Pino
- **Testing:** Vitest, Storybook 10, Playwright, MSW (Mock Service Worker)
- **Code Quality:** ESLint, Prettier, Fallow, CodeQL, dependency review
- **Development:** ESLint, Prettier, Husky, lint-staged

## 🚀 Quick Start

```bash
git clone https://github.com/shchilkin/PopChoice.git
cd PopChoice
npm install
cp .env.example .env        # add OPENAI_API_KEY (and optionally TMDB_API_KEY)
npm run setup:local-db      # spin up local PostgreSQL + Redis via Docker
npm run copy:env            # copy root .env into apps/services workspaces
npm run dev                 # start the dev server at http://localhost:3000
# in a second terminal:
npm run start:workers --workspace=apps/web
# in a third terminal:
npm run dev:backoffice      # open Catalog seed and trigger the curated seed
```

For a step-by-step walkthrough, see **[💻 Local Development Setup](#-local-development-setup)** below.

## 💻 Local Development Setup

This section walks you through setting up a fully working local development environment, including a local PostgreSQL instance with pgvector support via Docker.

### Prerequisites

- **Node.js** 24 or later
- **Docker** — required to run local PostgreSQL and Redis containers
- **OpenAI API key** — required to generate movie embeddings

### Step 1 — Clone and install

```bash
git clone https://github.com/shchilkin/PopChoice.git
cd PopChoice
npm install
```

### Step 2 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in at least:

```env
OPENAI_API_KEY=your-openai-api-key-here
TMDB_API_KEY=your-tmdb-api-key          # optional – enables live poster images
```

> The database credentials (`DATABASE_URL`, `POSTGRES_*`) are generated automatically in the next step.
>
> The root `.env` is the source of truth. After changing it, run `npm run copy:env` so `apps/web/.env` and the service-level `.env` files stay in sync.

### Step 3 — Start local PostgreSQL and Redis

```bash
npm run setup:local-db
```

This script:

- Generates a random `POSTGRES_PASSWORD` on first run
- Writes `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`, and `REDIS_URL` into `.env`
- Starts PostgreSQL (`pgvector/pgvector:pg16`) and Redis (`redis:7-alpine`) containers via `docker compose up -d`
- The database schema and the `pgvector` extension are applied automatically on first start via `db/init/`

On subsequent runs the script reuses the existing credentials and just ensures the containers are running.

### Step 4 — Sync workspace `.env` files

```bash
npm run copy:env
```

This copies the root `.env` into the workspaces that run locally, including:

- `apps/web/.env`
- `services/movie-discovery/.env`
- `services/movie-backfill/.env`

### Step 5 — Seed the database

Run the web app, workers, and Backoffice in separate terminals, then open the
Backoffice `Catalog seed` page and click `Trigger movie seed`.

Backoffice enqueues a BullMQ job, and the `apps/web` workers read the curated
movie list from `apps/web/data/movies.txt`, generate OpenAI embeddings, and
insert missing rows into PostgreSQL.

> **Note:** Each run deduplicates by title + year, so it is safe to re-run.

### Step 6 — Start the local app

Run the web app and the BullMQ workers in separate terminals:

```bash
# terminal 1, repo root
npm run dev

# terminal 2, repo root
npm run start:workers --workspace=apps/web

# terminal 3, repo root
npm run dev:backoffice
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

The workers terminal is required for the async recommendation flow when Redis is enabled locally.
It also runs the `catalog-maintenance` queue, which paces TMDB discovery, per-movie catalog seeding, and metadata backfill jobs.

To enqueue catalog maintenance work for the workers:

```bash
npm run catalog:discovery:enqueue
npm run catalog:backfill:enqueue
```

### E2E smoke tests

The e2e suite uses its own Docker compose file, ports, and disposable database so it never writes to the local development database.

```bash
npm run test:e2e
```

This command resets `docker-compose.e2e.yml`, applies `db/init` migrations, seeds deterministic real-movie fixtures, starts the Next.js app on `http://127.0.0.1:3100`, and runs Playwright. The smoke suite covers health checks, catalog filtering and empty states, registration/login/logout/session behavior, quiz submission, deterministic result rendering, feedback, and movie-memory persistence. Stop and remove the e2e services with:

```bash
npm run test:e2e:down
```

The default e2e database is intentionally curated instead of restored from a dev dump. Use dev or production-like dumps only for manual local investigations after removing users, sessions, recommendation history, feedback, API keys, and other operational data; CI should stay on the deterministic fixture seed.

### Accessibility smoke tests

The accessibility suite reuses the deterministic e2e fixtures and runs axe checks against public pages, catalog browsing, and the authenticated recommendation result flow:

```bash
npm run test:a11y
```

In CI, `Accessibility Tests` runs as a separate PR job inside the pinned official Playwright Docker image, so Chromium and browser system dependencies come from the image instead of a mutable Playwright browser cache.

### Recommendation evals

Recommendation evals are separate from browser e2e smoke tests. The default command uses deterministic fixtures and mocked model outputs, so it does not spend OpenAI/TMDB credits:

```bash
npm run eval:recommendations
```

The command writes a JSON report to `apps/web/test-results/recommendation-evals/report.json` and checks output shape, candidate validity, safety constraints, repeat avoidance, and explanation quality.

Real-data evals use the isolated e2e database and real catalog retrieval while keeping model output controlled. They do not call OpenAI:

```bash
npm run test:e2e:setup
DATABASE_URL=postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e npm run eval:recommendations:real-data
npm run test:e2e:down
```

Operators can also start deterministic mock and real-data eval runs from the backoffice `Recommendation evals` page when `DATABASE_URL`, `REDIS_URL`, and the web workers are configured. Backoffice live OpenAI evals are guarded by an explicit cost acknowledgement and confirmation phrase, and persist the provider response in the run report for inspection.

```bash
npm run eval:recommendations -- --live
```

Live runs require configured provider/database environment variables and are intended for manual checks before larger recommendation changes.

### Static code quality

Fallow provides unused-code, duplication, complexity, and PR audit checks. The PR audit runs as a required new-only CI gate:

```bash
npm run quality:fallow:audit -- --changed-since origin/development
npm run quality:fallow:health -- --workspace @pop-choice/web --summary
```

See [Code Quality Checks](docs/QUALITY.md) for adoption notes and current baseline context.

### Optional — Bull Board queue dashboard

```bash
npm run bull-board
```

Open [http://localhost:4000](http://localhost:4000) to inspect BullMQ queues locally.
Set `OPERATOR_AUTH_USERNAME` and `OPERATOR_AUTH_PASSWORD` before exposing Bull
Board outside localhost.

### Optional — Storybook component workshop

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006) to browse and develop UI components in isolation.
The static Storybook build is also published as a GHCR image and can be deployed
as a separate Coolify service for design review.

### Troubleshooting

| Problem                             | Solution                                                |
| ----------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL is not set`           | Run `npm run setup:local-db`, then `npm run copy:env`   |
| Recommendations stay pending        | Run `npm run start:workers --workspace=apps/web`        |
| App or workers use stale env values | Re-run `npm run copy:env` after editing the root `.env` |
| Docker container not starting       | Ensure Docker Desktop is running                        |
| OpenAI errors when seeding          | Verify `OPENAI_API_KEY` is correct in `.env`            |
| Missing movie posters               | Add a valid `TMDB_API_KEY` to `.env`                    |

## 📖 Documentation

The Git-backed documentation source lives in [`docs/`](./docs). A Fumadocs site
renders the same files from `apps/docs`:

```bash
npm run dev:docs     # http://localhost:3003
npm run build:docs   # production docs build
npm run dev:backoffice # catalog-health and TMDB-review operator UI
npm run dev:backoffice:fixtures # backoffice against deterministic local fixtures
```

- **[Setup Guide](./docs/SETUP.md)** — Complete setup instructions
- **[Development Guide](./docs/DEVELOPMENT.md)** — Development workflows, scripts, and project structure
- **[Agent Guide](./AGENTS.md)** — Repo-specific guidance for AI/code agents working in this workspace
- **[Architecture Boundaries](./docs/BOUNDARIES.md)** — Ownership rules for app, domain, infrastructure, and shared modules
- **[Services Guide](./docs/SERVICES.md)** — Background services documentation
- **[Maintainability Checklist](./docs/MAINTAINABILITY-CHECKLIST.md)** — Periodic checklist for keeping the codebase maintainable
- **[CI/CD Documentation](./docs/CI-CD.md)** — GitHub Actions workflow and deployment
- **[Coolify Deployment](./docs/COOLIFY.md#service-links)** — Runtime service links for the app, docs, Bull Board, Storybook, Backoffice, and Grafana
- **[Architecture Roadmap](./docs/ROADMAP-ARCHITECTURE.md)** — Practical phased direction for cleaner boundaries and future monorepo evolution
- **[Recommendation Roadmap](./docs/RECOMMENDATION-ROADMAP.md)** — Staged plan for improving quiz accuracy, adding taste swipe mode, and moving toward TMDB-first discovery
- **[Design Guidelines](./docs/design-guidelines.md)** — UI/UX design guidelines

## 🗂 Project Structure

```text
apps/
├── docs/               # Fumadocs documentation site rendering docs/
├── backoffice/         # Operator catalog-health, TMDB review, and repair UI
├── web/
│   └── src/
│       ├── app/           # Next.js app routes, pages, and HTTP boundaries
│       ├── clients/       # Infrastructure client wrappers (DB, OpenAI, pg)
│       ├── components/    # Reusable React components
│       ├── features/      # Feature-owned orchestration (auth, movies, recommendation)
│       ├── hooks/         # Custom React hooks
│       ├── i18n/          # Internationalisation support
│       ├── integrations/  # App-local external API wrappers such as TMDB
│       ├── lib/           # Shared app-local infra helpers and adapters
│       ├── mocks/         # MSW mock handlers
│       ├── styles/        # Global styles
│       └── utils/         # Reusable utilities and data helpers
├── bull-board/            # Queue monitoring app
packages/
├── shared/                # Shared database, embedding, logging, and utility code
└── ui/                    # Shared shadcn-derived UI primitives
services/
├── movie-discovery/       # Continuous TMDB movie discovery service
├── movie-backfill/        # Manual TMDB metadata maintenance CLI / fallback
└── db-migrate/            # Containerized database migration runtime
db/                        # Database migrations / schema
```

For ownership rules inside `apps/web/src`, see [docs/BOUNDARIES.md](./docs/BOUNDARIES.md).

## 🗃 Background Services

- **curated catalog seed** — Backoffice queues a `seed-movies` job on the
  BullMQ `movie-seed` queue. The `apps/web` workers read
  `apps/web/data/movies.txt`, generate OpenAI embeddings, insert missing rows,
  and optionally queue bounded catalog repair work for TMDB ids/posters.
- **movie-discovery** (`services/movie-discovery/`) — Continuous TMDB-driven service that discovers new movies, applies quality filters (vote count, rating, overview length), generates embeddings, and inserts them into the database. Supports scheduled and one-shot modes. See [`services/movie-discovery/README.md`](./services/movie-discovery/README.md).
- **movie-backfill** (`services/movie-backfill/`) — Manual maintenance CLI for inspecting catalog gaps, backfilling missing TMDB metadata, and exporting fallback SQL patches. The primary day-to-day repair path is Backoffice plus the BullMQ `catalog-maintenance` queue. See [`services/movie-backfill/README.md`](./services/movie-backfill/README.md).

## 🧪 Development Scripts

```bash
# Development
npm run dev                         # Start development server (repo root)
npm run dev:docs                    # Start documentation site at http://localhost:3003
npm run dev:backoffice              # Start catalog-health and TMDB-review operator UI
npm run setup:backoffice:fixtures   # Prepare deterministic PostgreSQL/Redis fixtures
npm run dev:backoffice:fixtures     # Start backoffice against local fixtures
npm run setup:backoffice:local-data # Prepare seeded local DB/env/catalog for backoffice
npm run build                       # Build for production (repo root)
npm run build:bull-board            # Build Bull Board runtime entrypoint
npm run build:docs                  # Build the documentation site
npm run build:backoffice            # Build the backoffice app
npm run build:storybook             # Build static Storybook
npm run check:backoffice            # Shared build + backoffice structure/type/test checks
npm run start --workspace=apps/web  # Start production server (apps/web)
npm run start:workers --workspace=apps/web # Start BullMQ workers
npm run bull-board                  # Launch BullMQ dashboard (apps/bull-board)

# Testing
npm run test            # Run all tests
npm run test:server     # Run utility function tests
npm run test:storybook  # Component tests (browser environment)
npm run storybook       # Start component workshop
npm run start:storybook # Serve built Storybook

# Code Quality
npm run lint:check      # Check code quality
npm run format:check    # Check formatting
npm run type-check      # TypeScript validation
npm run fix             # Fix all issues automatically

# Database & Data
npm run setup:local-db       # Generate credentials, start Docker PostgreSQL
npm run copy:env             # Sync root .env into apps/services workspaces
npm run migrate:db           # Apply idempotent SQL migrations
npm run setup:backoffice:local-data # Run setup:local-db and copy:env
npm run catalog:health       # Report catalog metadata coverage and likely duplicates
npm run analyze-movies --workspace=apps/web       # Analyze movie data for embeddings
npm run calibrate-similarity --workspace=apps/web # Calibrate vector similarity thresholds
npm run test:services        # Run shared package and service test scripts
```

For detailed development workflows and project structure, see the **[Development Guide](./docs/DEVELOPMENT.md)**.

## 🔗 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - Understanding embeddings for recommendations
- [pgvector Documentation](https://github.com/pgvector/pgvector) - Vector database setup
- [TMDB API Documentation](https://developer.themoviedb.org/docs/getting-started) - The Movie Database API integration
- [The AI Engineer Path](https://scrimba.com/the-ai-engineer-path-c02v) - Complete AI engineering course

## 🚀 Deploy on Coolify

Production is designed to run on a VPS with [Coolify](https://coolify.io) using [`coolify.compose.yml`](./coolify.compose.yml). GitHub Actions builds PopChoice runtime images in GHCR, and Coolify pulls those prebuilt images with one shared `IMAGE_TAG` instead of compiling the monorepo on the VPS. Use separate Coolify resources for `development` staging and `production`: staging follows the moving `development` image tag, while production is promoted through the GitHub `production` Environment and the moving `production` tag or an explicit `sha-<commit>` rollback tag. See the [Coolify deployment guide](./docs/COOLIFY.md) for the stack layout, required secrets, image tags, auto-deploy webhook, and first-deploy checklist.

---

<div align="center">
  Built with ❤️ for learning AI engineering
</div>
