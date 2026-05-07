# Setup Guide

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Database – PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Local Docker PostgreSQL credentials (set automatically by npm run setup:local-db)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-generated-password
POSTGRES_DB=popchoice

# TMDB API (for movie data)
TMDB_API_KEY=your-tmdb-api-key

# API key authentication secret (used to derive scrypt key digests)
# Required when VALID_API_KEYS is set; must stay stable across restarts
API_KEY_HMAC_SECRET=your-stable-hmac-secret

# Session signing secret for login/logout cookies
# Optional in development (falls back to API_KEY_HMAC_SECRET, then an ephemeral dev secret)
# Required in production if users can log in; must stay stable across restarts
AUTH_SESSION_SECRET=your-stable-session-secret

# Redis (optional) – enables distributed rate limiting and BullMQ background workers
# When unset, rate limiting is skipped and background seeding is disabled
REDIS_URL=redis://user:password@host:6379

# API key authentication – comma-separated scrypt digests of valid API keys
# Required in production; when unset in development, auth is disabled with a warning
VALID_API_KEYS=<scrypt-digest-of-key1>,<scrypt-digest-of-key2>

# Public base URL of the app (required behind a reverse proxy such as Coolify, Railway, or Vercel)
# Used for same-origin CSRF validation; without this, browser API calls will return 401
NEXT_PUBLIC_BASE_URL=https://popchoice.example.com
```

For production migration and self-managed VPS deployment details, see [`docs/DEPLOYMENT-COOLIFY-VPS.md`](./DEPLOYMENT-COOLIFY-VPS.md).

The root `.env` is the source of truth for local development. After you update it, run `npm run copy:env` from the repo root to sync the workspace-level `.env` files used by `apps/web` and the local services.

## OpenAI Setup

This application uses the OpenAI API to generate embeddings and chat completions.

### OpenAI Setup Steps

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

### PostgreSQL Setup Steps

1. **Provision a PostgreSQL database**
   - Use any PostgreSQL provider, e.g. [Railway](https://railway.app), [Neon](https://neon.tech), or a self-hosted instance

2. **Enable the pgvector extension**
   Connect to your database and run:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Set up the database schema**
   - Run the SQL from [`db/createDB.sql`](../db/createDB.sql)

4. **Add the matching function**
   - Run the SQL from [`db/match_movies.sql`](../db/match_movies.sql)

5. **Configure environment variables**
   Add `DATABASE_URL` to your `.env` file:

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

## API Endpoint Protection

The `/api/movie-recommendation`, `/api/more-tmdb-picks`, and `/api/movies` endpoints are protected by the `withAuth` wrapper and accept either:

- API key authentication (`Authorization: Bearer <key>` or `X-API-Key`)
- Same-origin browser requests with a valid CSRF cookie/header pair

### 1. API key authentication (recommended for external/service callers)

External callers (mobile apps, partner integrations) can authenticate via one of these headers:

- `Authorization: Bearer <key>`
- `X-API-Key: <key>`

Keys are stored as **scrypt digests** in the `VALID_API_KEYS` environment variable (comma-separated). The derivation uses a server-side secret from `API_KEY_HMAC_SECRET`. Never store plaintext keys.

#### Generating and registering a key

1. **Generate a random key** (e.g. using `openssl rand -hex 32`)
2. **Set `API_KEY_HMAC_SECRET`** in your environment (e.g. `openssl rand -hex 32`). This secret must stay the same across restarts.
3. **Hash the key** using the utility exported from `src/lib/apiAuth.ts`:

   ```ts
   import { hashApiKey } from '@/lib/apiAuth';
   console.log(hashApiKey('your-plaintext-key'));
   ```

4. **Add the hash** to your environment:

   ```env
   API_KEY_HMAC_SECRET=<your-derivation-secret>
   VALID_API_KEYS=<scrypt-digest-of-key1>,<scrypt-digest-of-key2>
   ```

5. **Distribute the plaintext key** to your API consumers — they send it in the header; the server only ever sees the hash.

#### Development mode

When `VALID_API_KEYS` is not set, API key authentication is **disabled in development** (`NODE_ENV !== 'production'`) and a warning is logged. In production, all API requests are rejected when the variable is absent.

### 2. CSRF tokens (browser fallback path)

Next.js middleware (`src/middleware.ts`) issues a random `__csrf` cookie on page loads. Client-side code reads the cookie and echoes it in the `X-CSRF-Token` request header on API calls.

The frontend reads the `__csrf` cookie and echoes it in `X-CSRF-Token` for API calls. CSRF fallback is accepted only for same-origin browser requests and only when both cookie and header are present and identical.

## Redis Setup (Optional – Rate Limiting & Background Workers)

Redis is used for two features:

- **Rate limiting** – `/api/movie-recommendation` is limited to 10 requests per minute per IP. When `REDIS_URL` is absent, rate limiting is skipped and the API fails open.
- **BullMQ workers** – background TMDB seeding jobs are queued via BullMQ. When `REDIS_URL` is absent, background seeding is disabled.

> **Security note:** `REDIS_URL` may contain credentials (e.g. `redis://user:password@host:6379`). Store it as a secret in your deployment environment (e.g. Railway/Vercel secret, GitHub Actions secret) and never commit it to source control.

### Local Redis with Docker

A `redis` service is included in `docker-compose.yml`. Start it with:

```bash
docker compose up redis -d
```

Then add to your `.env`:

```env
REDIS_URL=redis://localhost:6379
```

If you are using the repo's local setup flow, run `npm run copy:env` after changing the root `.env` so `apps/web/.env` picks up the same `REDIS_URL`.

Run background workers in a separate terminal:

```bash
cd apps/web
npm run start:workers
```

Optional queue monitoring dashboard:

```bash
cd apps/web
npm run bull-board
```

### Production Redis

1. **Provision a Redis instance**
   - Use any Redis provider, e.g. [Redis Cloud](https://redis.io/cloud/), [Railway](https://railway.app), or a self-hosted instance

2. **Add to environment**
   - Add `REDIS_URL=redis://user:password@host:6379` to your `.env` file (or set it as an environment secret in production)

3. **Verify**
   - On the first request to `/api/movie-recommendation`, the app logs `Rate limiter initialized with Redis` when the connection succeeds
   - When `REDIS_URL` is not set, rate limiting logs `REDIS_URL not set. Rate limiting disabled.`
   - When `REDIS_URL` is not set, the worker logs `REDIS_URL not set. Movie seeding worker is disabled.`

## Local Docker PostgreSQL Setup

You can run a fully-configured local PostgreSQL instance with pgvector using Docker Compose — no external provider needed.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running

### Local Docker PostgreSQL Steps

1. **Run the setup script**

   ```bash
   npm run setup:local-db
   ```

   On first run, this generates a random `POSTGRES_PASSWORD`, writes all database credentials to your `.env` file, starts the Docker container, and waits until PostgreSQL passes its healthcheck. On subsequent runs it reuses the existing credentials from `.env` so the running database stays in sync.

   Docker automatically runs `db/init/01_schema.sql` and `db/init/02_match_movies.sql` on first start, enabling the `vector` extension, creating the `movies` table, and installing the `match_movies` function.

2. **Sync workspace `.env` files**

   ```bash
   npm run copy:env
   ```

   This copies the root `.env` into `apps/web/.env` and the local services so the web app, workers, and seed service all use the same credentials.

3. **Populate the database**

   ```bash
   npm run populate-db
   ```

4. **Run the app locally**

   ```bash
   # terminal 1, repo root
   npm run dev

   # terminal 2, apps/web
   cd apps/web
   npm run start:workers
   ```

   For the async recommendation flow, keep the workers running while you use the app.

> **Note:** The `pgdata` named volume persists data across container restarts. Init scripts only run once on first start.
> To reset the database from scratch, run `npm run cleanup:local-db` (stops containers and removes the volume) then `npm run setup:local-db` again.

## Railway PostgreSQL Setup (legacy / optional)

You can host your PostgreSQL database on [Railway](https://railway.app) (or any other PostgreSQL provider).

### Railway Setup Steps

1. **Create a Railway project**
   - Sign up at [Railway](https://railway.app)
   - Create a new project and add a **PostgreSQL** service

2. **Enable the pgvector extension**
   Connect to your database (e.g. via `psql` or the Railway SQL editor) and run:

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

### Railway schema note

Railway does not run the local Docker `db/init/*.sql` hooks automatically. The production web container now applies `db/init/*.sql` on startup before `next start`, so the `movies` and `users` tables and the `match_movies` function are created automatically as long as the service has a valid `DATABASE_URL`.

If you need to backfill an existing Railway database manually, run:

```bash
DATABASE_URL=<your-railway-postgres-url> npm run migrate:db --workspace=apps/web
```

## Development Container Setup

This project includes a development container configuration for consistent development environments.

### Using with VS Code

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

### Features Included

- Node.js 24 with npm
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
