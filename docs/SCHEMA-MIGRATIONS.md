---
title: 'Schema And Migrations'
description: 'Canonical workflow for PopChoice database schema changes, migrations, previews, production rollout, and data backfills.'
---

# Schema And Migrations

This page is the source of truth for PopChoice schema work. It closes the
documentation scope for [#518](https://github.com/shchilkin/PopChoice/issues/518)
under the docs epic [#515](https://github.com/shchilkin/PopChoice/issues/515)
and satisfies the documentation parts of
[#494](https://github.com/shchilkin/PopChoice/issues/494). Any automation beyond
this workflow is future work and should be tracked in a focused follow-up issue.

Related docs: [Setup](/docs/SETUP), [Development](/docs/DEVELOPMENT),
[Services](/docs/SERVICES), [Coolify](/docs/COOLIFY),
[CI/CD](/docs/CI-CD), and [Environment](/docs/ENVIRONMENT).

## Current Contract

PopChoice does not use versioned down migrations today. Schema changes are
authored as idempotent SQL and applied repeatedly to local, e2e, preview, and
production databases.

| Area                         | Current owner                                   | Notes                                                                       |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| Docker first-run schema      | `db/init/*.sql`                                 | PostgreSQL applies these only when a new data volume is initialized.        |
| Existing database migrations | `apps/web/scripts/migrate-db.js`                | Applies every sorted SQL file in `db/init/` inside one transaction.         |
| Production app startup       | `apps/web` `start:with-migrations`              | Runs `npm run migrate:db` before starting Next.js.                          |
| One-shot migration image     | `services/db-migrate`                           | Existing deployment utility that applies `db/init/` against `DATABASE_URL`. |
| Local setup snapshot         | `db/createDB.sql`                               | Kept in sync for manual SQL setup and reference.                            |
| Service safety helpers       | `packages/shared/src/db.ts` and service exports | Seed/discovery/backfill services call shared `ensureSchema()` helpers.      |

## Authoring Rules

Prefer additive, idempotent changes:

- Use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
  `CREATE EXTENSION IF NOT EXISTS`, and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- For constraints that may already exist, explicitly `DROP CONSTRAINT IF EXISTS`
  before re-adding the intended definition.
- Keep functions replaceable with `CREATE OR REPLACE FUNCTION` when possible.
- Avoid destructive statements in normal feature PRs: `DROP TABLE`, `DROP COLUMN`,
  type narrowing, data rewrites without a backfill plan, and enum/constraint
  tightening that can reject existing rows.
- For required fields on populated tables, use expand/backfill/contract:
  add nullable or defaulted storage first, backfill data, switch reads/writes,
  then tighten constraints only after verification.
- Keep web code and workers tolerant of partially backfilled data. UI should
  degrade gracefully while new metadata is incomplete.

If a change cannot be safely expressed as additive/idempotent SQL, document the
forward-fix plan in the PR and create a follow-up issue before merging.

## Files To Keep In Sync

When schema changes touch shared tables, update every relevant owner in the same
PR unless there is a deliberate staged rollout.

| Change type                 | Required files                                                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core movie/catalog tables   | `db/init/01_schema.sql`, `db/createDB.sql`, `packages/shared/src/db.ts`                                                                                                                    |
| Vector search function      | `db/init/02_match_movies.sql`, `db/match_movies.sql`, `packages/shared/src/db.ts`                                                                                                          |
| Recommendation persistence  | `db/init/03_recommendations.sql`, `db/recommendations.sql`, app repositories/tests                                                                                                         |
| Password reset/auth storage | `db/init/04_password_reset_tokens.sql`, `db/createDB.sql`, auth repositories/tests                                                                                                         |
| Backoffice repair batches   | `db/init/01_schema.sql`, `db/createDB.sql`, `packages/shared/src/db.ts`, `packages/shared/src/catalogRepairActions.ts`, `services/movie-backfill/src/database.ts`, backoffice/shared tests |
| Service-written metadata    | Shared schema helper plus the owning service tests and docs                                                                                                                                |

Do not rely only on service `ensureSchema()` for production. The canonical
migration path is still `db/init/*.sql`; helpers are a compatibility layer for
standalone service execution.

## Migration Paths

| Environment             | How schema is applied                                                                                      | What to verify                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Fresh local database    | `npm run setup:local-db` initializes Docker PostgreSQL from `db/init/*.sql`.                               | App starts, `/api/health` is healthy, seed can insert data.            |
| Existing local database | `npm run migrate:db` from the repo root.                                                                   | Migration logs list every SQL file and finish successfully.            |
| E2E database            | `npm run test:e2e:setup` runs `apps/web/scripts/migrate-db.js`, then seeds deterministic fixtures.         | E2E fixtures insert without schema errors.                             |
| Coolify preview         | Web container runs `start:with-migrations` before Next.js starts.                                          | Preview `/api/health`, quiz flow, and affected metadata UI work.       |
| Production              | Same `start:with-migrations` path, or the existing one-shot `db-migrate` image if the deploy flow uses it. | Health, build metadata, worker logs, and affected feature smoke tests. |

`apps/web/scripts/migrate-db.js` reads `DATABASE_URL` from the environment, then
falls back to `.env` in the current directory or repo root. It retries transient
connection errors using `DB_MIGRATION_CONNECT_ATTEMPTS` and
`DB_MIGRATION_CONNECT_DELAY_MS`.

## Coolify Preview Volumes

Coolify preserves PostgreSQL volumes across preview redeploys. That is useful
for testing stateful flows, but it means new code can run against a database
that was initialized before the schema change.

If a preview shows errors such as `column "poster_url" does not exist`:

1. Confirm the deployed image contains the new `db/init/*.sql` changes.
2. Confirm the web container ran `start:with-migrations` successfully.
3. Check that `DATABASE_URL` resolves through the preview-specific
   `SERVICE_NAME_DB` value, not a stale hard-coded `db` host.
4. If the preview volume was created before the fix and migrations cannot repair
   it, delete/recreate that preview deployment.

Recreating a preview volume is acceptable. Recreating production data is not a
rollback strategy.

## Rollback And Forward Fixes

Because there are no down migrations, the default recovery path is a forward
fix:

- Add missing nullable/defaulted columns or indexes in a new PR.
- Restore compatibility for old rows instead of deleting data.
- Keep reads tolerant of both old and new shapes during rollout.
- If a bad migration partially applied, inspect whether the transaction rolled
  back; `migrate-db.js` runs all `db/init/*.sql` files inside one transaction.
- If production data was modified incorrectly, plan a targeted repair script and
  backup/restore decision explicitly.

Deployment rollback to an older image is safe only when the older code can read
the newer schema. Do not remove columns or change meanings until old images and
queued worker jobs no longer need them.

## Seed, Discovery, And Backfill Coordination

Metadata-dependent features need both schema and data.

| Producer                   | What it writes                                                                                     | Schema/data expectation                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| BullMQ `movie-seed`        | Curated movie rows and embeddings                                                                  | Runs in `apps/web` workers, calls shared `ensureSchema()`, and dedupes by `name + year`. |
| `movie-discovery`          | New TMDB movies, embeddings, cast/director/genre/keyword metadata                                  | Requires catalog metadata tables and rate-limited TMDB/OpenAI access.                    |
| `movie-backfill`           | Missing TMDB ids, runtime, age ratings, posters, localized names, catalog metadata, review records | Existing rows may stay incomplete until backfill runs.                                   |
| BullMQ catalog maintenance | Discovery/backfill jobs paced through workers                                                      | Queue payloads must remain compatible across releases.                                   |

When adding a new field used by product UI or recommendations:

1. Add schema support and tolerant reads.
2. Update seed/discovery/backfill writers so new and existing rows can receive
   the field.
3. Decide whether existing production data needs a manual backfill, queued
   catalog maintenance, or only best-effort future refresh.
4. Document incomplete-data behavior in the PR.
5. Run or schedule `npm run catalog:health` when the change affects catalog
   completeness.

## Schema PR Checklist

Use this checklist for any PR that changes database shape, catalog data, or
metadata-dependent behavior.

- [ ] SQL in `db/init/*.sql` is additive and idempotent.
- [ ] `db/createDB.sql` and companion SQL snapshots are updated when relevant.
- [ ] Shared/service `ensureSchema()` helpers are updated when standalone
      services depend on the change.
- [ ] App repositories, workers, and API routes tolerate missing or partially
      backfilled values.
- [ ] Seed/discovery/backfill writers are updated, or the PR explains why no
      writer change is needed.
- [ ] Local or e2e migrations were exercised with `npm run migrate:db` or
      `npm run test:e2e:setup`.
- [ ] Preview-volume behavior is documented when old previews may need
      recreation.
- [ ] Rollback/forward-fix notes are included for any non-trivial data change.
- [ ] Relevant docs are updated, especially `/docs/ENVIRONMENT`,
      `/docs/SERVICES`, `/docs/COOLIFY`, or this page.

## Future Tooling

Useful follow-ups, not current tooling:

- A schema drift check that compares `db/init/`, `db/createDB.sql`, and shared
  `ensureSchema()` helpers.
- A lightweight schema version/status command for deployed environments.
- A migration dry-run job against a copied production backup before risky
  changes.
- Broader backoffice workflows for applying catalog-health repairs beyond the
  audited TMDB match-review actions.
