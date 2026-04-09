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

# Redis (optional) – enables distributed rate limiting on /api/movie-recommendation
# When unset, rate limiting is disabled and the API fails open
REDIS_URL=redis://user:password@host:6379
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

## Redis Setup (Optional – Rate Limiting)

The `/api/movie-recommendation` endpoint supports Redis-backed rate limiting (10 requests per minute per IP). This requires a Redis instance and the `REDIS_URL` environment variable to be set. When `REDIS_URL` is absent the endpoint continues to work without rate limiting.

> **Security note:** `REDIS_URL` may contain credentials (e.g. `redis://user:password@host:6379`). Store it as a secret in your deployment environment (e.g. Railway/Vercel secret, GitHub Actions secret) and never commit it to source control.

1. **Provision a Redis instance**
   - Use any Redis provider, e.g. [Redis Cloud](https://redis.io/cloud/), [Railway](https://railway.app), or a self-hosted instance

2. **Add to environment**
   - Add `REDIS_URL=redis://user:password@host:6379` to your `.env` file (or set it as an environment secret in production)

3. **Verify**
   - On the first request to `/api/movie-recommendation`, the app logs `Rate limiter initialized with Redis` when the connection succeeds
   - On the first request to `/api/movie-recommendation`, when `REDIS_URL` is not set, it logs `REDIS_URL not set. Rate limiting disabled.`

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
