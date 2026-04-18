<div align="center">
  <img src="/public/popcorn.svg" alt="Popcorn Mascot" width="200" />
</div>

# PopChoice

PopChoice is a **movie recommendation engine** that uses AI embeddings and vector databases to provide personalized movie suggestions based on user preferences.

This is a solo project for the **Embeddings and Vector Databases** chapter from "The AI Engineer Path" on Scrimba.

## ✨ Features

- 🎬 **AI-Powered Recommendations** - Uses OpenAI embeddings for semantic movie matching
- 📊 **Interactive Questionnaire** - Collects user preferences through engaging questions
- 🔍 **Vector Search** - Lightning-fast similarity search with pgvector
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🧪 **Component Library** - Built with Storybook for consistent UI components

## 🛠 Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **AI/ML:** OpenAI Embeddings API, LangChain Core
- **Database:** PostgreSQL with pgvector, Redis (rate limiting)
- **Animation:** Motion
- **Movie Data:** TMDB (The Movie Database) API
- **Analytics:** Vercel Analytics
- **Testing:** Vitest, Storybook 10, Playwright, MSW (Mock Service Worker)
- **Development:** ESLint, Prettier, Husky, lint-staged

## 🚀 Quick Start

```bash
git clone https://github.com/shchilkin/PopChoice.git
cd PopChoice
npm install
cp .env.example .env        # add OPENAI_API_KEY (and optionally TMDB_API_KEY)
npm run setup:local-db      # spin up local PostgreSQL via Docker
npm run populate-db         # seed the database with movie embeddings
npm run dev                 # start the dev server at http://localhost:3000
```

For a step-by-step walkthrough, see **[💻 Local Development Setup](#-local-development-setup)** below.

## 💻 Local Development Setup

This section walks you through setting up a fully working local development environment, including a local PostgreSQL instance with pgvector support via Docker.

### Prerequisites

- **Node.js** 20 or later
- **Docker** — required to run the local PostgreSQL container
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

### Step 3 — Start local PostgreSQL

```bash
npm run setup:local-db
```

This script:
- Generates a random `POSTGRES_PASSWORD` on first run
- Writes `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL` into `.env`
- Starts a `pgvector/pgvector:pg16` Docker container (via `docker compose up -d`)
- The database schema and the `pgvector` extension are applied automatically on first start via `db/init/`

On subsequent runs the script reuses the existing credentials and just ensures the container is running.

### Step 4 — Seed the database

```bash
npm run populate-db
```

This reads the curated movie list, calls the OpenAI Embeddings API to generate vectors for each movie, and inserts the results into your local PostgreSQL database.

> **Note:** Each run deduplicates by title + year, so it is safe to re-run.

### Step 5 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Optional — Storybook component workshop

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006) to browse and develop UI components in isolation.

### Troubleshooting

| Problem | Solution |
|---|---|
| `DATABASE_URL is not set` | Run `npm run setup:local-db` to generate credentials |
| Docker container not starting | Ensure Docker Desktop is running |
| OpenAI errors when seeding | Verify `OPENAI_API_KEY` is correct in `.env` |
| Missing movie posters | Add a valid `TMDB_API_KEY` to `.env` |

## 📖 Documentation

- **[Setup Guide](./docs/SETUP.md)** — Complete setup instructions
- **[Development Guide](./docs/DEVELOPMENT.md)** — Development workflows, scripts, and project structure
- **[Services Guide](./docs/SERVICES.md)** — Background services documentation
- **[Maintainability Checklist](./docs/MAINTAINABILITY-CHECKLIST.md)** — Periodic checklist for keeping the codebase maintainable
- **[CI/CD Documentation](./docs/CI-CD.md)** — GitHub Actions workflow and deployment
- **[Architecture Roadmap](./docs/ROADMAP-ARCHITECTURE.md)** — Practical phased direction for cleaner boundaries and future monorepo evolution
- **[Design Guidelines](./docs/design-guidelines.md)** — UI/UX design guidelines

## 🗂 Project Structure

```text
src/
├── app/                    # Next.js app directory (API routes, pages)
├── clients/               # External API client wrappers
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalisation (i18n) support
├── lib/                   # Shared library utilities
├── mocks/                 # MSW mock handlers
├── services/              # Business logic / service layer
├── styles/                # Global styles
└── utils/                 # Utility functions
services/
├── movie-discovery/       # Continuous TMDB movie discovery service
├── movie-seed/            # One-shot database seeding service
└── movie-backfill/        # One-shot service to backfill missing movie metadata
db/                        # Database migrations / schema
```

## 🗃 Background Services

- **movie-seed** (`services/movie-seed/`) — One-shot service that reads movies from a `movies.txt` file, generates OpenAI embeddings, and seeds the PostgreSQL database. Safe to re-run (deduplicates by name + year). See [`services/movie-seed/README.md`](./services/movie-seed/README.md).
- **movie-discovery** (`services/movie-discovery/`) — Continuous TMDB-driven service that discovers new movies, applies quality filters (vote count, rating, overview length), generates embeddings, and inserts them into the database. Supports scheduled and one-shot modes. See [`services/movie-discovery/README.md`](./services/movie-discovery/README.md).
- **movie-backfill** (`services/movie-backfill/`) — One-shot script that backfills missing `duration` and `age_rating` data for movies already in the database, re-generating their embeddings. Supports dry-run mode. See [`services/movie-backfill/README.md`](./services/movie-backfill/README.md).

## 🧪 Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run start:workers   # Start BullMQ background workers (requires REDIS_URL)
npm run bull-board      # Launch BullMQ monitoring dashboard (requires REDIS_URL)

# Testing
npm run test            # Run all tests
npm run test:server     # Run utility function tests
npm run test:storybook  # Component tests (browser environment)
npm run storybook       # Start component workshop
npm run build-storybook # Build static Storybook
npm run start:storybook # Serve built Storybook

# Code Quality
npm run lint:check      # Check code quality
npm run format:check    # Check formatting
npm run type-check      # TypeScript validation
npm run fix             # Fix all issues automatically

# Database & Data
npm run setup:local-db       # Generate credentials, start Docker PostgreSQL
npm run populate-db          # Populate database with movie data
npm run analyze-movies       # Analyze movie data for embeddings
npm run calibrate-similarity # Calibrate vector similarity thresholds
```

For detailed development workflows and project structure, see the **[Development Guide](./docs/DEVELOPMENT.md)**.

## 🔗 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - Understanding embeddings for recommendations
- [pgvector Documentation](https://github.com/pgvector/pgvector) - Vector database setup
- [TMDB API Documentation](https://developer.themoviedb.org/docs/getting-started) - The Movie Database API integration
- [The AI Engineer Path](https://scrimba.com/the-ai-engineer-path-c02v) - Complete AI engineering course

## 🚀 Deploy on Railway

All production services (web app, Storybook, background workers) are deployed on [Railway](https://railway.app). See [`railway.toml`](./railway.toml) for the service configuration.

---

<div align="center">
  Built with ❤️ for learning AI engineering
</div>
