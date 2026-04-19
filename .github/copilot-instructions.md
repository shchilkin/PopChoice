# Copilot Instructions for PopChoice

## Project Overview

PopChoice is a Next.js application focused on movie recommendations, leveraging OpenAI for embeddings and PostgreSQL (via pgvector) for vector storage. The architecture is modular, with clear separation between UI components, API routes, services, and utility functions.

## Key Directories & Files

- `src/app/` – Next.js app directory, including API routes (`api/`) and pages.
- `src/components/` – Reusable React components (e.g., `QuestionsForm`, `Button`, `SuggestionCard`).
- `src/services/` – Service classes for external APIs (e.g., `MovieService` for TMDB integration).
- `src/utils/` – Utility functions for data processing and AI operations.
- `src/clients/` – Client configurations for external services (OpenAI, pg).
- `db/` – SQL scripts for database setup.
- `public/` – Static assets and images.
- `.github/workflows/pr.yml` – GitHub Actions workflow for CI.
- `README.md` – Project setup, environment, and workflow documentation.

## Developer Workflows

- **Start Dev Server:** `npm run dev` (Next.js)
- **Run Tests:**
  - All: `npm run test` (Vitest)
  - Server only: `npm run test:server`
  - Storybook: `npm run test:storybook`
- **Lint & Format:**
  - Lint: `npm run lint:check`
  - Format: `npm run format:check` / `npm run format:write`
  - Type-check: `npm run type-check`
  - Fix all: `npm run fix` (runs lint:fix + format:write + format:package)
- **Build:** `npm run build`
- **Storybook:** `npm run storybook` (dev), `npm run build-storybook` (prod)
- **Database:** `npm run populate-db` (populate database with movie data)
- **Analysis:** `npm run analyze-movies` (analyze movie data)

## Environment Variables

- Managed via `.env` and/or devcontainer (`.devcontainer/devcontainer.json`).
- Key variables: `OPENAI_API_KEY`, `DATABASE_URL`, `TMDB_API_KEY`.
- For dev containers, variables are forwarded from local shell if set before VS Code launch.

## Patterns & Conventions

- **Service Layer:** API integrations (e.g., TMDB) are encapsulated in classes under `src/services/`. Always use environment variables for secrets.
- **Component Design:** Components are functional, use hooks, and are organized by feature. Storybook stories are provided for most components.
- **API Routes:** Next.js API routes (e.g., `src/app/api/movie-recommendation/route.ts`) handle business logic and external service calls.
- **Testing:** Vitest is used for both unit and browser-based tests. Utility tests are in `src/utils/`, component tests use Storybook integration.
- **Database:** SQL scripts are in `db/`. Use provided scripts for table creation and matching logic. All database access goes through the `DbClient` abstraction (`src/clients/dbClient.ts`), backed by PostgreSQL via `src/clients/pgClient.ts`.
- **React/ESLint:** Always escape special characters in JSX text content to prevent `react/no-unescaped-entities` errors. Use `&apos;` for apostrophes, `&quot;` for quotes, `&amp;` for ampersands, `&lt;` for less than, and `&gt;` for greater than symbols.

## Integration Points

- **OpenAI:** Used for embeddings and chat completions. See `src/clients/openaiClient.ts`.
- **PostgreSQL:** Used for vector database storage via pgvector. See `src/clients/pgClient.ts`.
- **TMDB:** Movie data fetched via `src/services/MovieService/MovieService.ts`.

## CI/CD

- PR workflow runs lint, format, type-check, server tests, Storybook tests (conditional on Playwright), and build on pull requests targeting the `development` branch. See `.github/workflows/pr.yml`.
- Build may fail in CI due to network issues with external fonts but works locally and in production.

## Example: Adding a New Movie API Integration

1. Create a service class in `src/services/`.
2. Use environment variables for API keys.
3. Add API route in `src/app/api/` if needed.
4. Update components to use new service.
5. Add tests in `src/services/` and/or Storybook stories.
6. Update client configurations in `src/clients/` if needed.

---

If any conventions or workflows are unclear, please ask for clarification or examples from the codebase.
