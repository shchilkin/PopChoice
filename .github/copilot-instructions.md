# Copilot Instructions for PopChoice

## Project Overview

PopChoice is a Next.js application focused on movie recommendations, leveraging OpenAI for embeddings and Supabase (PostgreSQL) for vector storage. The architecture is modular, with clear separation between UI components, API routes, services, and utility functions.

## Key Directories & Files

- `src/app/` – Next.js app directory, including API routes (`api/`) and pages.
- `src/components/` – Reusable React components (e.g., `QuestionsForm`, `Button`, `SuggestionCard`).
- `src/services/` – Service classes for external APIs (e.g., `MovieService` for TMDB integration).
- `src/utils/` – Utility functions and database scripts (`db/` contains SQL for Supabase setup).
- `public/` – Static assets and images.
- `.github/workflows/pr.yml` – GitHub Actions workflow for CI.
- `README.md` – Project setup, environment, and workflow documentation.

## Developer Workflows

- **Start Dev Server:** `npm run dev` (Next.js)
- **Run Tests:**
  - All: `npm run test` (Vitest)
  - Utils only: `npm run test:utils`
  - Storybook: `npm run test:storybook`
- **Lint & Format:**
  - Lint: `npm run lint:check`
  - Format: `npm run format:check` / `npm run format:write`
  - Type-check: `npm run type-check`
- **Build:** `npm run build`
- **Storybook:** `npm run storybook` (dev), `npm run build-storybook` (prod)

## Environment Variables

- Managed via `.env` and/or devcontainer (`.devcontainer/devcontainer.json`).
- Key variables: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_API_KEY`, `TMDB_API_KEY`.
- For dev containers, variables are forwarded from local shell if set before VS Code launch.

## Patterns & Conventions

- **Service Layer:** API integrations (e.g., TMDB) are encapsulated in classes under `src/services/`. Always use environment variables for secrets.
- **Component Design:** Components are functional, use hooks, and are organized by feature. Storybook stories are provided for most components.
- **API Routes:** Next.js API routes (e.g., `src/app/api/movie-recommendation/route.ts`) handle business logic and external service calls.
- **Testing:** Vitest is used for both unit and browser-based tests. Utility tests are in `src/utils/`, component tests use Storybook integration.
- **Database:** Supabase setup SQL is in `src/utils/db/`. Use provided scripts for table creation and matching logic.

## Integration Points

- **OpenAI:** Used for embeddings and chat completions. See `src/utils/openaiClient.ts`.
- **Supabase:** Used for vector database storage. See `src/utils/supabaseClient.ts`.
- **TMDB:** Movie data fetched via `src/services/MovieService/MovieService.ts`.

## CI/CD

- PR workflow runs lint, format, type-check, tests, and build on every pull request. See `.github/workflows/pr.yml`.
- Storybook tests are conditional on Playwright browser install.

## Example: Adding a New Movie API Integration

1. Create a service class in `src/services/`.
2. Use environment variables for API keys.
3. Add API route in `src/app/api/` if needed.
4. Update components to use new service.
5. Add tests in `src/services/` and/or Storybook stories.

---

If any conventions or workflows are unclear, please ask for clarification or examples from the codebase.
