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

For Docker Compose resources, these must exist in the resource's
**Environment Variables** page. If you keep the real values as Coolify shared
variables, add resource variables that reference them:

```env
OPENAI_API_KEY={{ environment.OPENAI_API_KEY }}
POSTGRES_PASSWORD={{ environment.POSTGRES_PASSWORD }}
AUTH_SESSION_SECRET={{ environment.AUTH_SESSION_SECRET }}
NEXT_PUBLIC_BASE_URL=https://your-domain.example
```

Use `{{ project.NAME }}` instead of `{{ environment.NAME }}` if the shared
variable is stored at project scope. A shared variable existing on the project
or environment is not enough by itself; it must be referenced by the Compose
resource so Coolify writes it into the generated `.env` file. The PostgreSQL
password is required by Compose and by PostgreSQL on first database
initialization, so a missing value now fails before containers are created.

Recommended optional variables:

```env
POSTGRES_USER=popchoice
POSTGRES_DB=popchoice
TMDB_API_KEY=...
LOG_LEVEL=info
API_KEY_HMAC_SECRET=...
VALID_API_KEYS=...
RESEND_API_KEY=...
EMAIL_FROM=PopChoice <noreply@mail.your-domain.example>
EMAIL_REPLY_TO=support@your-domain.example
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

### Password reset email

Password reset requests use Resend in production. Create a Resend API key and
verify a sending domain such as `mail.your-domain.example`, then set these
variables on the Coolify Compose resource:

```env
RESEND_API_KEY={{ project.RESEND_API_KEY }}
EMAIL_FROM=PopChoice <noreply@mail.your-domain.example>
EMAIL_REPLY_TO=support@your-domain.example
```

`EMAIL_REPLY_TO` is optional. In local development and previews, the app exposes
the reset URL after a successful forgot-password request so the flow can be
tested without sending real mail. In production, the URL is sent only by email.

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

The Compose file injects Coolify's `SERVICE_NAME_DB` and `SERVICE_NAME_REDIS`
variables into the application containers, with local fallbacks to build
internal connection URLs. This matters for preview deployments because Coolify
can vary service names per preview stack; plain Docker Compose still falls back
to `db` and `redis`.

## Post-deploy smoke checklist

Run this checklist after production deploys and after any infrastructure change:

- `https://your-domain.example` loads with a trusted certificate.
- `https://your-domain.example/api/health` returns `200`.
- A quiz submission creates and completes a recommendation.
- Worker logs show Redis readiness and recommendation job completion.
- The latest PostgreSQL backup exists in the configured backup destination.

## Pull request previews

Use Coolify's GitHub App integration for PR previews so deployments can be
created from pull requests and reported back to GitHub.

1. Add a wildcard DNS record pointing at the VPS:

   ```txt
   *.preview.your-domain.example A <VPS_PUBLIC_IP>
   ```

2. Enable preview deployments for repository members, collaborators, and
   contributors only. Keep public PR preview deployments disabled.
3. Use this preview URL template:

   ```txt
   https://{{pr_id}}.preview.your-domain.example:3000
   ```

4. Keep previews as full isolated stacks. Each PR should get its own `web`,
   `workers`, `db`, `redis`, and named volumes.
5. Configure preview environment variables separately from production if your
   Coolify version exposes preview overrides. Use limited-quota `OPENAI_API_KEY`
   and `TMDB_API_KEY` values when possible, and generate preview-only values for
   `POSTGRES_PASSWORD`, `AUTH_SESSION_SECRET`, `API_KEY_HMAC_SECRET`, and
   `VALID_API_KEYS`.
   If your Coolify version uses the same environment variable list for
   production and previews, make sure the production-safe shared-variable
   references above resolve for previews too.
6. Set preview `NEXT_PUBLIC_BASE_URL` from Coolify's generated web service URL
   for port `3000`.
7. Leave `bull-board` without a preview domain unless temporarily debugging a
   PR.
8. Do not set `COMPOSE_PROFILES=tools` globally. It enables the profiled
   `movie-seed` service during every production and preview deploy. Run seeding
   manually or as a Coolify scheduled task instead.

Before relying on previews, verify that opening a PR creates a preview
deployment and GitHub comment, the preview URL loads over HTTPS, quiz submission
completes without touching production data, and closing or merging the PR
removes the preview deployment.

If a preview database fails with:

```txt
Database is uninitialized and superuser password is not specified
```

then `POSTGRES_PASSWORD` did not reach the preview stack. Check the Compose
resource's environment variables, not only shared variables, and delete the
failed preview stack before redeploying so PostgreSQL initializes from a clean
volume with the password present.

If `web` repeatedly logs `getaddrinfo EAI_AGAIN db` while the preview
PostgreSQL container is healthy, the app is trying to resolve the plain Compose
service name instead of Coolify's preview-specific service name. Verify the
preview has picked up the latest compose file and that `DATABASE_URL` resolves
through `SERVICE_NAME_DB`. Inside the preview container, `SERVICE_NAME_DB`
should be set to a value like `db-pr-400`, and `SERVICE_NAME_REDIS` should be
set to a value like `redis-pr-400`.

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
