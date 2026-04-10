# Setup Guide

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Database – PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname

# TMDB API (for movie data)
TMDB_API_KEY=your-tmdb-api-key
```

## OpenAI Setup

This application uses the OpenAI API to generate embeddings and chat completions.

### Steps:

1. **Get your OpenAI API key**
   - Sign up or log in at [OpenAI Platform](https://platform.openai.com/docs/overview)
   - Go to your account settings and create an API key

2. **Add your API key to the `.env` file**
   - Add the line: `OPENAI_API_KEY=your-openai-api-key-here`

3. **Verify setup**
   - Your application will automatically load the API key from `.env`
   - See [`src/clients/openaiClient.ts`](../src/clients/openaiClient.ts) for usage example

## PostgreSQL Database Setup

This application uses a generic database client abstraction (`src/clients/dbClient.ts`) backed by PostgreSQL via `pgClient.ts` for storing movie embeddings.

### Steps:

1. **Provision a PostgreSQL database**
   - Use any PostgreSQL provider, e.g. [Railway](https://railway.app), [Neon](https://neon.tech), or a self-hosted instance

2. **Enable the pgvector extension**
   - Connect to your database and run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. **Set up the database schema**
   - Run the SQL from [`db/createDB.sql`](../db/createDB.sql)

4. **Add the matching function**
   - Run the SQL from [`db/match_movies.sql`](../db/match_movies.sql)

5. **Configure environment variables**
   - Add `DATABASE_URL` to your `.env` file:
     ```env
     DATABASE_URL=postgresql://user:password@host:5432/dbname
     ```

6. **Populate the database**
   - Run `npm run populate-db`

## TMDB API Setup (Optional)

1. **Create TMDB account**
   - Sign up at [The Movie Database](https://www.themoviedb.org/signup)
   - Request an API key from your account settings

2. **Add to environment**
   - Add `TMDB_API_KEY=your-key` to your `.env` file

## Local Docker PostgreSQL Setup

You can run a fully-configured local PostgreSQL instance with pgvector using Docker Compose — no external provider needed.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running

### Steps:

1. **Start the container**
   ```bash
   docker compose up -d
   ```
   Docker automatically runs `db/init/01_schema.sql` and `db/init/02_match_movies.sql` on first start, enabling the `vector` extension, creating the `movies` table, and installing the `match_movies` function.

2. **Configure environment variables**
   - Add `DATABASE_URL` to your `.env` file:
     ```env
     DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>
     ```
   - Default values (if not overridden): user `postgres`, password `postgres`, db `popchoice`
   - To use custom database credentials, set `POSTGRES_USER`, `POSTGRES_PASSWORD`, and/or `POSTGRES_DB` in your `.env` file before running `docker compose up`. Update `DATABASE_URL` accordingly.

3. **Populate the database**
   - Run `npm run populate-db`

> **Note:** The `pgdata` named volume persists data across container restarts. Init scripts only run once on first start.
> To reset the database from scratch, run `docker compose down -v` (removes the volume) then `docker compose up -d` again.

## Railway PostgreSQL Setup

You can host your PostgreSQL database on [Railway](https://railway.app) (or any other PostgreSQL provider).

### Steps:

1. **Create a Railway project**
   - Sign up at [Railway](https://railway.app)
   - Create a new project and add a **PostgreSQL** service

2. **Enable the pgvector extension**
   - Connect to your database (e.g. via `psql` or the Railway SQL editor) and run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. **Set up the database schema**
   - Run the SQL from [`db/createDB.sql`](../db/createDB.sql)
   - Run the SQL from [`db/match_movies.sql`](../db/match_movies.sql)

4. **Configure environment variables**
   - Copy the `DATABASE_URL` from your Railway dashboard
   - Add it to your `.env` file:
     ```env
     DATABASE_URL=postgresql://user:password@host:5432/railway
     ```

5. **Populate the database**
   - Run `npm run populate-db`

## Development Container Setup

This project includes a development container configuration for consistent development environments.

### Using with VS Code:

1. **Install prerequisites**
   - Install [Docker](https://www.docker.com/products/docker-desktop)
   - Install [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. **Set environment variables**
   - Set environment variables in your shell before launching VS Code
   - The dev container will forward these automatically

3. **Open in container**
   - Open the project in VS Code
   - Click "Reopen in Container" when prompted
   - Wait for the container to build and dependencies to install

### Features included:

- Node.js 22 with npm
- Git and GitHub CLI pre-installed
- All VS Code extensions pre-configured
- Port forwarding for development servers (3000, 6006)
- Automatic npm install on container creation

## Swapping Database Backends

PopChoice uses a generic `DbClient` interface (`src/clients/dbClient.ts`) that decouples all storage logic from any specific database provider. By default it uses the PostgreSQL backend via `pgClient.ts`.

### Built-in backend

| Backend    | Module                    | Env var        | Notes   |
| ---------- | ------------------------- | -------------- | ------- |
| PostgreSQL | `src/clients/pgClient.ts` | `DATABASE_URL` | Default |

### How it works

All database operations go through `getDbClient()`, which returns the active `DbClient` instance. You can swap the implementation at any time with `setDbClient()`:

```ts
import { setDbClient, type DbClient } from '@/clients/dbClient';

const myClient: DbClient = {
  isConfigured: () => true,
  from: (table) => {
    /* return a TableRef that talks to your database */
  },
  rpc: (fn, params) => {
    /* call a stored procedure */
  },
};

setDbClient(myClient);
```

### Using a mock in tests

```ts
import { setDbClient, resetDbClient, type DbClient } from '@/clients/dbClient';
import { afterEach, beforeEach } from 'vitest';

const mockDb: DbClient = {
  isConfigured: () => true,
  from: () => ({
    select: () => Promise.resolve({ data: [{ id: 1, name: 'Mock Movie' }], error: null }),
    insert: (rows) => {
      const result = { data: Array.isArray(rows) ? rows : [rows], error: null };
      return {
        select: () => Promise.resolve(result),
        then: (onfulfilled?, onrejected?) => Promise.resolve(result).then(onfulfilled, onrejected),
      };
    },
    delete: () => ({ neq: () => Promise.resolve({ data: [], error: null }) }),
  }),
  rpc: () => Promise.resolve({ data: [], error: null }),
};

beforeEach(() => setDbClient(mockDb));
afterEach(() => resetDbClient());
```

### Key files

| File                           | Purpose                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `src/clients/dbClient.ts`      | `DbClient` interface, `getDbClient` / `setDbClient` / `resetDbClient` helpers |
| `src/clients/pgClient.ts`      | PostgreSQL (`pg`) implementation of `DbClient` with pgvector support          |
| `src/clients/dbClient.test.ts` | Unit tests demonstrating mock injection                                       |
| `src/clients/pgClient.test.ts` | Unit tests for the PostgreSQL backend                                         |
| `src/utils/database/`          | All database operations (use `getDbClient()` internally)                      |
