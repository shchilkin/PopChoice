# Coolify VPS Deployment & Railway Migration

This guide covers migrating PopChoice from Railway to a **fully self-managed VPS** running Coolify, including self-hosted PostgreSQL (`pgvector`) and Redis.

> Keep the existing root `docker-compose.yml` for local development. Use [`docker-compose.coolify.yml`](../docker-compose.coolify.yml) for production-style deployment.

## Deployment model

### Long-running services

| Service           | Role                                                                   | Always on      |
| ----------------- | ---------------------------------------------------------------------- | -------------- |
| `web`             | Next.js application (`apps/web/Dockerfile`)                            | ✅             |
| `workers`         | BullMQ workers (`apps/web/workers.Dockerfile`)                         | ✅             |
| `postgres`        | PostgreSQL + pgvector (`pgvector/pgvector:pg16`)                       | ✅             |
| `redis`           | Redis for BullMQ + rate limiting (`redis:7-alpine`)                    | ✅             |
| `movie-discovery` | Continuous/scheduled TMDB sync (`services/movie-discovery/Dockerfile`) | Optional       |
| `bull-board`      | Queue admin UI (`apps/web/bull-board.Dockerfile`)                      | Optional/Admin |

### One-shot/admin jobs (do not run as always-on)

| Job              | Purpose                              | Runtime model                    |
| ---------------- | ------------------------------------ | -------------------------------- |
| `db-migrate`     | Apply `db/init/*.sql` migrations     | Run manually before/after deploy |
| `movie-seed`     | Initial curated dataset seed         | Run manually                     |
| `movie-backfill` | Backfill missing metadata/embeddings | Run manually, on demand          |

In `docker-compose.coolify.yml`, one-shot jobs are under the `admin-jobs` profile with `restart: "no"` so they only run when explicitly triggered.

## Environment variables by service

Use [`coolify.env.example`](../coolify.env.example) as a template.

### Shared app/runtime variables

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `TMDB_API_KEY`

### `web`

Required:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_TMDB_API_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `API_KEY_HMAC_SECRET`
- `VALID_API_KEYS`

Recommended:

- `AUTH_SESSION_SECRET` (stable cookie-signing secret)
- `LOG_LEVEL`

### `workers`

Required:

- `NODE_ENV`
- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `TMDB_API_KEY`

Recommended:

- `LOG_LEVEL`

### `bull-board` (optional/admin)

Required:

- `PORT` or `BULL_BOARD_PORT`
- `REDIS_URL`

### `movie-discovery` (optional long-running)

Required:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `TMDB_API_KEY`

Optional:

- `SYNC_SCHEDULE`
- `TMDB_SOURCES`
- `MAX_PAGES_PER_SOURCE`
- `MIN_VOTE_COUNT`
- `MIN_VOTE_AVERAGE`
- `MAX_MOVIES_PER_RUN`
- `TMDB_LANGUAGE`
- `DRY_RUN`

### One-shot jobs

- `db-migrate`: `DATABASE_URL`
- `movie-seed`: `DATABASE_URL`, `OPENAI_API_KEY` (+ optional `MOVIES_FILE_PATH`, `DRY_RUN`)
- `movie-backfill`: `DATABASE_URL`, `OPENAI_API_KEY`, `TMDB_API_KEY` (+ optional `DRY_RUN`, `BATCH_SIZE`, `MAX_MOVIES`)

## Railway ➜ Coolify migration (step-by-step)

1. **Freeze deployment changes on Railway**
   - Pause nonessential deploys.
   - Export all environment variables from Railway.

2. **Provision the VPS + base hardening**
   - Install Coolify and Docker.
   - Configure firewall (allow only `22`, `80`, `443`; restrict DB/Redis ports to private/internal only).
   - Enable automatic security updates.

3. **Prepare storage and backups**
   - Use persistent Docker volumes (`postgres_data`, `redis_data`).
   - Set automated PostgreSQL dumps (daily) + off-server backup copy.
   - Define backup retention and test restore before cutover.

4. **Create PostgreSQL + pgvector**
   - Start `postgres` from `docker-compose.coolify.yml`.
   - Ensure `CREATE EXTENSION IF NOT EXISTS vector;` succeeds (covered by `db/init/01_schema.sql`).

5. **Create Redis**
   - Start `redis` from `docker-compose.coolify.yml`.
   - Keep Redis internal/private; do not expose publicly.

6. **Configure app services in Coolify**
   - Deploy `web` + `workers` first.
   - Add `movie-discovery` and `bull-board` only when needed.
   - Ensure `NEXT_PUBLIC_BASE_URL` matches the final HTTPS URL exactly.

7. **Run one-shot jobs manually**
   - `docker compose -f docker-compose.coolify.yml --profile admin-jobs run --rm db-migrate`
   - `docker compose -f docker-compose.coolify.yml --profile admin-jobs run --rm movie-seed`
   - Run `movie-backfill` as a manual Coolify job when needed (not continuously).

8. **Migrate data from Railway PostgreSQL**
   - Dump Railway DB (`pg_dump`) and restore to VPS PostgreSQL (`pg_restore`/`psql`).
   - Verify row counts and sample recommendation queries.
   - Confirm vector indexes and `match_movies` function exist.

9. **Cutover traffic**
   - Point DNS to Coolify ingress.
   - Verify TLS certificates are active.
   - Monitor `web`, `workers`, Redis queue throughput, and DB connections.

10. **Rollback plan (required)**

- Keep Railway services available during validation window.
- Keep latest pre-cutover DB snapshot.
- If severe issues occur: revert DNS, redeploy Railway, and replay critical data if needed.

## Production-readiness checklist

- [ ] VPS firewall configured (`22/80/443` only; DB/Redis private)
- [ ] TLS enabled and certificates auto-renewing
- [ ] Persistent volumes configured for PostgreSQL and Redis
- [ ] PostgreSQL backups automated and restore-tested
- [ ] `pgvector` extension verified on target database
- [ ] `DATABASE_URL` and `REDIS_URL` point to self-hosted services
- [ ] `NEXT_PUBLIC_BASE_URL` matches final public HTTPS domain
- [ ] API auth secrets configured (`API_KEY_HMAC_SECRET`, `VALID_API_KEYS`)
- [ ] Session secret configured (`AUTH_SESSION_SECRET`)
- [ ] `db-migrate` job executed successfully
- [ ] `movie-seed` executed (for fresh installs) or DB restore completed
- [ ] Healthchecks passing for `web`, `postgres`, `redis`
- [ ] Optional services (`bull-board`, `movie-discovery`) explicitly enabled only if needed
- [ ] Rollback steps documented and tested

## Coolify notes for fully self-managed server

- **PostgreSQL**: keep data on persistent volume; schedule backups outside container lifecycle.
- **Redis**: configured with AOF persistence in compose; still treat as recoverable cache/queue state.
- **TLS**: terminate TLS at Coolify ingress/reverse proxy; only expose `web` publicly.
- **Firewall**: do not expose `5432`/`6379` to the internet.
- **Admin surfaces**: protect `bull-board` behind Coolify auth, VPN, IP allowlist, or private networking.
- **One-shot jobs**: run manually from Coolify jobs/task runner, not as permanent services.
- **Rollback**: retain Railway env exports + DB snapshot until VPS deployment is stable.
