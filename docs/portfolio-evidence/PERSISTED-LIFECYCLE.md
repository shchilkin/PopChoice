---
title: 'Persisted Recommendation Lifecycle'
description: 'Source-backed persistence, queue, polling, failure, and recovery behavior.'
---

# Persisted recommendation lifecycle

Evidence snapshot from `development` at `3ef0417`. This note distinguishes code- and
test-backed behavior from production evidence; no live environment was inspected.

## Lifecycle

1. **Shipped in development** — `POST /api/recommendations` rate-limits, parses and
   validates the body, and runs the input-block check before creating work. A valid
   request delegates to `createAndStartRecommendation()` and returns the public slug
   as `{ "id": "<slug>" }` with `201`. The route test covers the `201` contract and
   verifies that rejected oversized input never reaches job creation.
   ([route](../../apps/web/src/app/api/recommendations/route.ts#L32-L50),
   [route test](../../apps/web/src/app/api/recommendations/route.test.ts#L68-L103))

2. **Shipped in development** — the database row is created before BullMQ enqueue or
   the recommendation pipeline starts. The insert assigns an internal UUID plus a
   12-character public slug and begins at `status=pending`, `stage=queued`; the schema
   persists quiz input, terminal error/completion data, and result metadata. This is
   "before expensive recommendation work," not before every provider call: the route's
   input-block check can call OpenAI moderation/judging first.
   ([job orchestration](../../apps/web/src/features/recommendation/jobs.ts#L37-L84),
   [pre-persistence screening](../../apps/web/src/features/recommendation/input.ts#L53-L126),
   [insert](../../apps/web/src/lib/db/recommendations.ts#L295-L324),
   [schema](../../db/init/03_recommendations.sql#L7-L23))

3. **Shipped in development** — with Redis configured, the app enqueues the internal
   recommendation UUID, quiz data, locale, experience/source strategy, optional user,
   and trace context. The worker changes the persisted status to `processing`, runs the
   pipeline, and stores stage changes. Observable stages are `queued`, `preparing`,
   `embedding`, `local-search`, optional `tmdb-search`, `ai-ranking`, `posters`,
   `descriptions`, then `complete` or `failed`.
   ([enqueue](../../apps/web/src/features/recommendation/jobs.ts#L84-L117),
   [worker](../../apps/web/src/lib/workers/recommendationWorker.ts#L116-L157),
   [stage model](../../apps/web/src/features/recommendation/stages.ts#L1-L29),
   [pipeline stage emission](../../apps/web/src/features/recommendation/pipeline.ts#L237-L255))

4. **Shipped in development** — successful completion inserts recommendation movies in
   a database transaction, then changes the record to `completed`; terminal status
   updates also set `stage=complete` and `completed_at`. A processing or failed request
   returns the persisted status/stage/error with no movies; a completed request loads
   the ordered movie rows.
   ([completion](../../apps/web/src/features/recommendation/persistence.ts#L48-L70),
   [movie transaction](../../apps/web/src/lib/db/recommendations.ts#L1020-L1050),
   [terminal status update](../../apps/web/src/lib/db/recommendations.ts#L988-L1018),
   [read model](../../apps/web/src/lib/db/recommendations.ts#L1142-L1245),
   [status tests](../../apps/web/src/lib/db/recommendations.test.ts#L1020-L1064))

## API, polling, and stable result URL

- **Shipped in development** — `GET /api/recommendations/[id]` treats `id` as the
  public slug, returns the persisted read model, and returns `404` when it does not
  exist. The documented preferred contract is `POST /api/recommendations` followed by
  `GET /api/recommendations/[id]`.
  ([GET route](../../apps/web/src/app/api/recommendations/%5Bid%5D/route.ts#L9-L44),
  [API reference](../API-REFERENCE.md#recommendation-apis))

- **Shipped in development** — after the POST succeeds, the quiz replaces the browser
  URL with `/results/<slug>`. The result page derives the slug from the route and fetches
  its persisted record, so the URL can be loaded again without quiz state. While the
  record is missing, `pending`, or `processing`, the client polls every two seconds; it
  stops on `failed`, a fetch error, or completed main results. Transient GET failures are
  retried up to three times, while `401`, `403`, and `404` are not retried.
  ([quiz transition](../../apps/web/src/app/quiz/page.tsx#L276-L304),
  [result route](../../apps/web/src/app/results/%5Bid%5D/ResultsIdClient.tsx#L21-L49),
  [polling](../../apps/web/src/hooks/useRecommendation.ts#L24-L85),
  [retry test](../../apps/web/src/hooks/useRecommendation.test.ts#L5-L18))

- **Shipped in development** — the result view shares `window.location.href` through
  the Web Share API, falling back to copying the URL. Loading an account-owned slug as
  another or anonymous same-origin browser marks it as shared and disables rating;
  tests cover the ownership-derived flags. The current e2e suite proves quiz submission,
  navigation to a slugged result, rendering, and feedback, but does not explicitly reload
  or open the shared URL in a second browser context.
  ([share implementation](../../apps/web/src/app/results/%5Bid%5D/RecommendationResultsView.tsx#L226-L261),
  [shared read model](../../apps/web/src/lib/db/recommendations.ts#L1162-L1192),
  [shared-result test](../../apps/web/src/lib/db/recommendations.test.ts#L1364-L1415),
  [browser e2e](../../apps/web/e2e/recommendation.spec.ts#L85-L123))

## Retry, failure, and fallback boundaries

- **Shipped in development** — recommendation jobs use two BullMQ attempts with
  exponential backoff starting at three seconds. Each failed attempt writes the
  recommendation as `failed` and rethrows so BullMQ can retry. Final versus retryable
  failures are distinguished in queue metrics/logging.
  ([job options](../../apps/web/src/lib/jobQueue.ts#L162-L167),
  [failure path](../../apps/web/src/lib/workers/recommendationWorker.ts#L116-L174),
  [attempt logging](../../apps/web/src/lib/workers/recommendationWorker.ts#L205-L248))

- **Shipped in development** — the current recovery contract has a visibility gap. The
  browser stops polling as soon as it observes `status=failed`, even though BullMQ may
  still run its next attempt. That worker retry marks the same persisted record as
  `processing` and can later complete it successfully. Because the browser has already
  stopped polling, it sees the recovered result only after a reload or explicit refetch.
  The failed-state action starts a fresh quiz; it does not retry the existing record or
  BullMQ job.
  ([poll stop condition](../../apps/web/src/hooks/useRecommendation.ts#L67-L85),
  [worker retry transition](../../apps/web/src/lib/workers/recommendationWorker.ts#L116-L150),
  [failed-result action](../../apps/web/src/app/results/%5Bid%5D/ResultsIdClient.tsx#L31-L44))

- **Shipped in development, controlled capture** — the portfolio evidence path runs a
  real deterministic Duo quiz to completion, then moves the disposable persisted record
  through `processing/ai-ranking`, `failed/failed`, and back to
  `completed/complete`. Reloading the same slug after restoration renders the same Duo
  result. This verifies the read model and browser states, not BullMQ retry execution or
  production recovery timing.
  ([capture path](../../apps/web/e2e/recommendation.spec.ts),
  [progress](./assets/05-deterministic-progress.png),
  [failure](./assets/07-deterministic-failure.png),
  [result after reload](./assets/08-deterministic-duo-reload.png))

- **Shipped in development** — if Redis is absent or `queue.add()` fails, recommendation
  creation falls back to detached inline processing against the already-created persisted
  record. The inline path writes the same processing, stage, completion, and failure state
  used by the polling contract, so the UI keeps polling the same result URL and API. It
  does not receive BullMQ retry behavior. The
  [service documentation](/docs/SERVICES#graceful-degradation) is aligned with this
  fallback.
  ([fallback dispatch](../../apps/web/src/features/recommendation/jobs.ts#L118-L139),
  [inline processor](../../apps/web/src/features/recommendation/jobs.ts#L242-L306))

- **Shipped in development** — provider calls have scoped timeouts, including OpenAI
  request budgets and TMDB fetch aborts, but the main recommendation BullMQ job has no
  whole-job timeout. The two job-level timeouts in `jobQueue.ts` belong to recommendation
  evals and more-picks, not the primary recommendation job.
  ([OpenAI budgets](../../apps/web/src/lib/openaiTimeout.ts#L1-L16),
  [queue options](../../apps/web/src/lib/jobQueue.ts#L162-L181),
  [more-picks timeout](../../apps/web/src/lib/jobQueue.ts#L221-L228))

- **Planned** — an explicit idempotency/retry contract for recommendation creation,
  worker retries, and failed queue recovery is still a roadmap item. Current POST creates
  a fresh slug for every accepted call, and movie completion uses plain inserts without a
  recommendation/position uniqueness constraint or upsert; do not claim exactly-once
  creation or idempotent completion.
  ([roadmap](../ROADMAP-ARCHITECTURE.md#security-and-reliability-track),
  [fresh slug insert](../../apps/web/src/lib/db/recommendations.ts#L299-L324),
  [plain movie inserts](../../apps/web/src/lib/db/recommendations.ts#L1068-L1110),
  [movie schema](../../db/init/03_recommendations.sql#L66-L85))

## Evidence classification

- **Production verified** — none in this research pass; no live endpoint, database,
  worker, queue, or deployed browser flow was inspected.
- **Anecdotal / unverified** — permanent availability of a result URL. Persistence and
  reload are code-backed, but this pass established no retention/expiry contract or live
  durability evidence. Release-note wording was not promoted above code and test behavior.
