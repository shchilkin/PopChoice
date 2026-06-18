---
title: 'API Reference'
description: 'Canonical reference for PopChoice app API route families, authentication expectations, and operational endpoints.'
---

# API Reference

This page tracks the current Next.js API routes in `apps/web/src/app/api`.
It is a practical app-internal reference, not a public OpenAPI stability
contract. Prefer the persisted recommendation API for new product flows and
treat compatibility, poster, and operational routes as implementation details
unless a caller is explicitly documented here.

Related work: [#515](https://github.com/shchilkin/PopChoice/issues/515) and
[#520](https://github.com/shchilkin/PopChoice/issues/520). For setup details,
see [/docs/SETUP](/docs/SETUP), [/docs/SERVICES](/docs/SERVICES), and
[/docs/DEVELOPMENT](/docs/DEVELOPMENT).

## Authentication Model

Protected product APIs use `withAuth` and accept either:

- API key auth: `Authorization: Bearer <key>` or `X-API-Key: <key>`.
  Production validates scrypt-derived digests from `VALID_API_KEYS` using
  `API_KEY_HMAC_SECRET`.
- Same-origin browser auth: matching `__csrf` cookie plus `X-CSRF-Token`
  header. When a signed session cookie exists, handlers receive a user-scoped
  caller id; otherwise some `withAuth` routes accept a browser CSRF caller.

Account-only routes read the signed session cookie directly and do not accept
API keys. Mutating browser account routes require the same-origin CSRF pair.
`apps/web/src/proxy.ts` issues the readable `__csrf` cookie on non-API page
navigation.

In development, protected API key checks are relaxed when `VALID_API_KEYS` is
absent. Do not rely on that behavior in production.

## Recommendation APIs

| Route                                  | Methods       | Auth                                                                    | Notes                                                                                                                                                                                  |
| -------------------------------------- | ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/recommendations`                 | `POST`        | `withAuth`; API key or same-origin browser CSRF/session                 | Preferred async API. Validates quiz input, rate-limits, creates a persisted recommendation job, and returns `{ id }` with `201`. Signed-in users attach the job to their account.      |
| `/api/recommendations/[id]`            | `GET`         | `withAuth`; API key or same-origin browser CSRF/session                 | Polls or loads a persisted recommendation by slug. Session users only receive records they are allowed to view. Returns `404` when missing.                                            |
| `/api/recommendations/[id]/feedback`   | `POST`        | `withAuth`; API key or same-origin browser CSRF/session                 | Records feedback for a completed recommendation. Body accepts `kind`: `useful`, `already_watched`, `not_for_me`, `wrong_mood`, `too_obvious`, `too_obscure`, or `close`.               |
| `/api/recommendations/[id]/more-picks` | `POST`        | `withAuth`; API key or same-origin browser CSRF/session                 | Enqueues one additional TMDB more-picks job for a completed recommendation. Returns `202` when claimed and `409` when already requested or unavailable.                                |
| `/api/movie-recommendation`            | `GET`, `POST` | `POST` uses `withAuth`; `GET` is unauthenticated documentation metadata | Compatibility synchronous recommendation API. `POST` runs the legacy in-request AI pipeline and returns the full recommendation response. Prefer `/api/recommendations` for new flows. |
| `/api/more-tmdb-picks`                 | `POST`        | `withAuth`; API key or same-origin browser CSRF/session                 | Compatibility endpoint for non-persisted more-picks. Requires `TMDB_API_KEY`; accepts quiz data, page, and excluded TMDB ids. Prefer persisted `/api/recommendations/[id]/more-picks`. |

Recommendation routes are rate-limited and enforce bounded JSON bodies. They
may return validation errors (`400`/`422`), upstream timeout responses (`504`),
or generic server errors without exposing provider secrets.

## Account And Movie Memory

These routes are browser account APIs. They are not external service APIs.

| Route                       | Methods  | Auth                                             | Notes                                                                                                                                               |
| --------------------------- | -------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/account`              | `GET`    | Signed session cookie                            | Returns the current user's email, saved recommendation summaries, and a first movie-memory page. Uses `Cache-Control: no-store` and `Vary: Cookie`. |
| `/api/account/movie-memory` | `GET`    | Signed session cookie                            | Supports catalog search by `query`/`q`, `mode=list` pagination, and `mode=candidates` training candidates. Rate-limited and private.                |
| `/api/account/movie-memory` | `POST`   | Signed session cookie plus same-origin CSRF pair | Adds one memory item or a batch of memory items for the current user. Returns saved item data or validation errors.                                 |
| `/api/account/movie-memory` | `DELETE` | Signed session cookie plus same-origin CSRF pair | Deletes one memory item by `movieKey`.                                                                                                              |

Movie-memory writes tolerate incomplete catalog metadata but still depend on the
database schema and TMDB/catalog enrichment paths. See [/docs/SERVICES](/docs/SERVICES)
for catalog workers and backfill services.

## Auth, Session, And Password Reset

These routes are browser-facing auth endpoints. They use rate limiting on
expensive password operations and intentionally avoid user-enumeration details.

| Route                       | Methods | Auth                                                             | Notes                                                                                                                                                                                                 |
| --------------------------- | ------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/register`        | `POST`  | No existing session required; rate-limited browser JSON endpoint | Creates a user, signs a session cookie, and returns `{ ok: true }` with `201`. Validation errors return `422`.                                                                                        |
| `/api/auth/login`           | `POST`  | Same-origin CSRF pair; no existing session required              | Verifies credentials, signs a session cookie, and returns `{ ok: true }`. Invalid credentials return `401`.                                                                                           |
| `/api/auth/logout`          | `POST`  | `withAuth`; API key or same-origin browser CSRF/session          | Clears the session cookie and returns `{ ok: true }`. In normal UI use this is a browser session call.                                                                                                |
| `/api/auth/session`         | `GET`   | Optional signed session cookie                                   | Returns `{ authenticated: true, userId }` or `{ authenticated: false }`. Clears an invalid session cookie when present.                                                                               |
| `/api/auth/delete-account`  | `POST`  | Same-origin CSRF pair plus email/password verification           | Deletes the matching user account, clears the session cookie, and returns `{ ok: true }`.                                                                                                             |
| `/api/auth/forgot-password` | `POST`  | Same-origin CSRF pair; no existing session required              | Creates a reset token for known users, sends reset email when configured, and always returns an accepted-style `{ ok: true }` response. Development may expose `resetUrl` when explicitly configured. |
| `/api/auth/reset-password`  | `POST`  | Same-origin CSRF pair; valid reset token                         | Consumes a password reset token and updates the password. Invalid or expired tokens return `400`.                                                                                                     |

Do not log or expose session secrets, password reset tokens, API keys, or token
digests. See [/docs/SETUP](/docs/SETUP) for the required auth environment
variables.

## Catalog And Poster Helpers

These routes support UI catalog browsing and poster enrichment. The poster
helpers are app-internal and should not be treated as a stable public API.

| Route                | Methods | Auth                                                      | Notes                                                                                                                                                                           |
| -------------------- | ------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/movies`        | `GET`   | `withAuth`; API key or same-origin browser CSRF/session   | Returns a paginated catalog page. Query params include `page`, `pageSize`, `query`/`title`, `yearFrom`, `yearTo`, `duration`, `minScore`, and `ageRating`/`ageRatings`.         |
| `/api/movie-posters` | `POST`  | No API key/session auth; rate-limited app-internal helper | Accepts a bounded batch of movie ids/names/year/TMDB ids and returns poster/localized metadata fetched server-side with `TMDB_API_KEY`. The TMDB key never reaches the browser. |
| `/api/poster-proxy`  | `GET`   | No API key/session auth; rate-limited app-internal helper | Proxies allowed poster images and returns cacheable image bytes. Rejects invalid or disallowed URLs.                                                                            |
| `/api/poster-urls`   | `GET`   | No API key/session auth; app-internal helper              | Returns popular poster URLs for ambient UI. If `TMDB_API_KEY` is absent or TMDB fails, returns an empty poster list.                                                            |

## Operational Health, Build, And Metrics

Operational routes are for deployment, monitoring, and debugging. They are not
product APIs.

| Route          | Methods | Auth                                 | Notes                                                                                                                                                                                                                         |
| -------------- | ------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/health`  | `GET`   | No bearer auth                       | Checks PostgreSQL and Redis with short timeouts, records dependency health metrics, and returns `200` for healthy or `503` for degraded. Responses are briefly cached in-process and sent with `Cache-Control: no-store`.     |
| `/api/build`   | `GET`   | No bearer auth                       | Returns build metadata from `getBuildInfo()` with `Cache-Control: no-store`. Useful for deployment verification.                                                                                                              |
| `/api/metrics` | `GET`   | Metrics bearer token when configured | Returns Prometheus metrics when metrics are enabled. In production, set `METRICS_ENABLED=true` and require `Authorization: Bearer <METRICS_BEARER_TOKEN>`. When disabled it returns `404`; unauthorized scrapes return `401`. |

For Prometheus, worker metrics, Grafana, and Coolify target configuration, see
[/docs/OBSERVABILITY-METRICS](/docs/OBSERVABILITY-METRICS).
