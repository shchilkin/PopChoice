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

### API key variables

`VALID_API_KEYS` is not a plaintext key. It must contain one or more
comma-separated scrypt digests generated with `API_KEY_HMAC_SECRET`.

Generate a production API key and digest locally:

```bash
API_KEY_HMAC_SECRET="$(openssl rand -hex 32)" node -e "const {randomBytes,scryptSync}=require('crypto'); const secret=process.env.API_KEY_HMAC_SECRET; const key=randomBytes(32).toString('hex'); const hash=scryptSync(key, secret, 32, {N:16384,r:8,p:1}).toString('hex'); console.log('API_KEY_HMAC_SECRET='+secret); console.log('PLAINTEXT_API_KEY='+key); console.log('VALID_API_KEYS='+hash)"
```

Store only these values in Coolify:

```env
API_KEY_HMAC_SECRET=<API_KEY_HMAC_SECRET output>
VALID_API_KEYS=<VALID_API_KEYS output>
```

Keep `PLAINTEXT_API_KEY` outside Coolify in a password manager or secret store.
External callers send that plaintext value as `Authorization: Bearer <key>` or
`X-API-Key: <key>`.

If you store these as project shared variables, reference them from the Docker
Compose resource environment:

```env
API_KEY_HMAC_SECRET={{ project.API_KEY_HMAC_SECRET }}
VALID_API_KEYS={{ project.VALID_API_KEYS }}
```

## First deploy

Deploy the stack from Coolify. The startup order is:

1. PostgreSQL and Redis start and pass health checks.
2. `web` applies every SQL file in `db/init/` with `start:with-migrations`, then
   starts Next.js.
3. `workers` and `bull-board` start against the same internal Redis and
   PostgreSQL services.

After deployment, set the Coolify health check path for the `web` service to:

```txt
/api/health
```

The endpoint returns `200` only when the Next.js app can reach both PostgreSQL
and Redis. It returns a sanitized `503` response when either dependency is not
available.

## Post-deploy smoke checklist

Run this checklist after production deploys and after any infrastructure change:

- `https://pop-choice.shchilkin.dev` loads with a trusted certificate.
- `https://pop-choice.shchilkin.dev/api/health` returns `200`.
- A quiz submission creates and completes a recommendation.
- Worker logs show Redis readiness and recommendation job completion.
- The latest PostgreSQL backup exists in the configured backup destination.

## Pull request previews

Use Coolify's GitHub App integration for PR previews so deployments can be
created from pull requests and reported back to GitHub.

1. Add a wildcard DNS record pointing at the VPS:

   ```txt
   *.preview.pop-choice.shchilkin.dev A 178.105.60.238
   ```

2. Enable preview deployments for repository members, collaborators, and
   contributors only. Keep public PR preview deployments disabled.
3. Use this preview URL template:

   ```txt
   https://{{pr_id}}.preview.pop-choice.shchilkin.dev:3000
   ```

4. Keep previews as full isolated stacks. Each PR should get its own `web`,
   `workers`, `db`, `redis`, and named volumes.
5. Configure preview environment variables separately from production. Use
   limited-quota `OPENAI_API_KEY` and `TMDB_API_KEY` values when possible, and
   generate preview-only values for `POSTGRES_PASSWORD`,
   `AUTH_SESSION_SECRET`, `API_KEY_HMAC_SECRET`, and `VALID_API_KEYS`.
6. Set preview `NEXT_PUBLIC_BASE_URL` from Coolify's generated web service URL
   for port `3000`.
7. Leave `bull-board` without a preview domain unless temporarily debugging a
   PR.

Before relying on previews, verify that opening a PR creates a preview
deployment and GitHub comment, the preview URL loads over HTTPS, quiz submission
completes without touching production data, and closing or merging the PR
removes the preview deployment.

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

Store backups in S3-compatible storage rather than only on the VPS. Enable
Coolify notifications for failed deploys, failed backups, and server disk or
resource warnings. On the Hetzner firewall, expose only the public ports needed
by this setup: `22`, `80`, and `443`; do not expose PostgreSQL or Redis.
