# Deploying PopChoice with Coolify

This project is ready to run on a VPS with Coolify using `coolify.compose.yml`.
The stack runs PostgreSQL with pgvector, Redis, the Next.js web app, BullMQ
workers, and Bull Board.

## Recommended VPS shape

Start with at least:

- 2 vCPU
- 4 GB RAM
- 40 GB disk

The app will run on smaller boxes, but builds for the Node monorepo are much
less pleasant on 2 GB RAM.

## Coolify resource

1. Create a new Coolify project on the VPS.
2. Add a new resource from this Git repository.
3. Choose Docker Compose.
4. Set the compose file path to `coolify.compose.yml`.
5. Assign a domain to the `web` service. Because the container listens on port
   `3000`, set the service domain as `https://your-domain.example:3000`.
6. Optional: assign a private/admin domain to `bull-board`, also with port
   `3000`.

Coolify treats Docker Compose as the source of truth for services, environment
variables, and storage. The compose file declares named volumes for PostgreSQL
and Redis so data survives redeploys.

## Required variables

Set these in Coolify before the first deploy:

```env
OPENAI_API_KEY=...
POSTGRES_PASSWORD=...
AUTH_SESSION_SECRET=...
NEXT_PUBLIC_BASE_URL=https://your-domain.example
```

Recommended optional variables:

```env
POSTGRES_USER=popchoice
POSTGRES_DB=popchoice
TMDB_API_KEY=...
LOG_LEVEL=info
API_KEY_HMAC_SECRET=...
VALID_API_KEYS=...
```

Set `NEXT_PUBLIC_BASE_URL` to the URL users see in their browser, without a
trailing slash. Even though the Coolify domain field includes `:3000` for proxy
routing, the app's public URL is usually just `https://your-domain.example`.

## First deploy

Deploy the stack from Coolify. The startup order is:

1. PostgreSQL and Redis start and pass health checks.
2. `web` applies every SQL file in `db/init/` with `start:with-migrations`, then
   starts Next.js.
3. `workers` and `bull-board` start against the same internal Redis and
   PostgreSQL services.

## Seeding movie data

The database schema is created automatically by the web service, but movie rows
still need to be seeded. After the first successful web deploy, run this from a
Coolify terminal or an SSH shell on the VPS:

```bash
docker compose --profile tools -f coolify.compose.yml run --rm movie-seed
```

If you prefer doing this from your laptop against the production database, use
the public PostgreSQL connection string and run:

```bash
DATABASE_URL=<production-database-url> npm run populate-db
```

## Optional movie discovery service

The compose file includes a profiled `movie-discovery` service for scheduled
TMDB discovery syncs. Enable the `discovery` profile only if you want automatic
catalog growth. It requires:

```env
TMDB_API_KEY=...
OPENAI_API_KEY=...
DATABASE_URL=...
SYNC_SCHEDULE=0 0 * * 0
```

The service runs once immediately on startup and then follows `SYNC_SCHEDULE`,
so enable it deliberately to avoid surprise API usage.

## Backups

Configure Coolify backups for the PostgreSQL volume before relying on this in
production. The application state lives primarily in PostgreSQL; Redis is used
for queues and rate limiting.
