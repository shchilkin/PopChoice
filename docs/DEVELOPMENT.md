# Development Guide

For ongoing code health reviews, use the **[Maintainability Checklist](./MAINTAINABILITY-CHECKLIST.md)**.

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
- `npm run start` - Start production server
- `npm run copy:env` - Copy the root `.env` into `apps/*`, `services/*`, and `packages/shared`
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

## Database Setup Workflow

The project includes scripts to help you set up and manage your movie recommendation database. All commands run from the **repo root**:

1. **Start the DB** - Run `npm run setup:local-db` to spin up PostgreSQL + Redis and initialize credentials
2. **Sync env files** - Run `npm run copy:env` so the web app and services use the updated root `.env`
3. **Seed the DB** - Run `npm run populate-db` to import movies (via `services/movie-seed`) into PostgreSQL
4. **Run the app** - Start `npm run dev` from the repo root and `cd apps/web && npm run start:workers` in a second terminal
5. **Reset** - Run `npm run cleanup:local-db` to wipe everything, then repeat from step 1

The `movie-seed` service reads its movie list from `services/movie-seed/movies.txt`.

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

## Project Structure

```text
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── pages/             # App pages
├── components/            # Reusable React components
├── services/              # External API integrations
└── utils/                 # Utility functions and helpers
    ├── db/               # Database scripts
    └── movies/           # Movie data processing
```
