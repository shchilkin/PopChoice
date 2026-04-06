# Setup Guide

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Database – pick ONE of the following options:

# Option A: Direct PostgreSQL (e.g. Railway)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Option B: Supabase
SUPABASE_URL=your-supabase-project-url
SUPABASE_API_KEY=your-supabase-anon-key

# If DATABASE_URL is set it takes priority over Supabase credentials.

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

## Supabase Database Setup

This application uses a generic database client abstraction (`src/clients/dbClient.ts`) that defaults to Supabase (PostgreSQL) for storing movie embeddings. See [Swapping Database Backends](#swapping-database-backends) for how to use a different provider.

### Steps:

1. **Create a Supabase project**
   - Sign up at [Supabase](https://supabase.com)
   - Create a new project
   - Wait for the database to be provisioned

2. **Set up the database schema**
   - Go to the SQL Editor in your Supabase dashboard
   - Run the SQL from [`src/utils/db/createDB.sql`](../src/utils/db/createDB.sql)

3. **Add the matching function**
   - In the SQL Editor, run the SQL from [`src/utils/db/match_movies.sql`](../src/utils/db/match_movies.sql)

4. **Configure environment variables**
   - Get your project URL and anon key from Supabase dashboard
   - Add them to your `.env` file

5. **Test your setup**
   - Use the Supabase dashboard to verify tables were created
   - Test the connection using the provided utility scripts

## TMDB API Setup (Optional)

For additional movie metadata and images:

1. **Create TMDB account**
   - Sign up at [The Movie Database](https://www.themoviedb.org/signup)
   - Request an API key from your account settings

2. **Add to environment**
   - Add `TMDB_API_KEY=your-key` to your `.env` file

## Railway PostgreSQL Setup (Alternative to Supabase)

You can host your own PostgreSQL database on [Railway](https://railway.app) (or any other PostgreSQL provider) instead of using Supabase.

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
   - When `DATABASE_URL` is set it takes priority over Supabase credentials

5. **Populate the database**
   - Run `npm run populate-db` – the script auto-detects `DATABASE_URL` and uses the pg backend

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

PopChoice uses a generic `DbClient` interface (`src/clients/dbClient.ts`) that decouples all storage logic from any specific database provider. By default it delegates to Supabase, but you can replace it with any backend.

### Built-in backends

| Backend    | Module                    | Env var(s)                          | Auto-selected when              |
| ---------- | ------------------------- | ----------------------------------- | ------------------------------- |
| Supabase   | `src/clients/dbClient.ts` | `SUPABASE_URL` + `SUPABASE_API_KEY` | Default (no `DATABASE_URL` set) |
| PostgreSQL | `src/clients/pgClient.ts` | `DATABASE_URL`                      | `DATABASE_URL` is set           |

### Using the PostgreSQL backend

```ts
import { setDbClient } from '@/clients/dbClient';
import { createPgDbClient } from '@/clients/pgClient';

// Call once at startup (e.g. in your app bootstrap or script entry point)
setDbClient(createPgDbClient());
```

> **Note:** Ensure the target database has the `vector` extension enabled:
>
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```

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

| File                           | Purpose                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/clients/dbClient.ts`      | `DbClient` interface, Supabase implementation, `getDbClient` / `setDbClient` / `resetDbClient` helpers |
| `src/clients/pgClient.ts`      | PostgreSQL (`pg`) implementation of `DbClient` with pgvector support                                   |
| `src/clients/dbClient.test.ts` | Unit tests demonstrating mock injection                                                                |
| `src/clients/pgClient.test.ts` | Unit tests for the PostgreSQL backend                                                                  |
| `src/utils/database/`          | All database operations (use `getDbClient()` internally)                                               |
