---
title: 'PopChoice Background Services'
---

# PopChoice Background Services

This document describes the background services that populate and maintain the movie database used by PopChoice.

---

## Services Overview

| Service / Tool               | Type                  | Trigger                                                 | Source        |
| ---------------------------- | --------------------- | ------------------------------------------------------- | ------------- |
| `movie-seed`                 | One-shot              | Manual / CI                                             | `movies.txt`  |
| `movie-discovery`            | Scheduled             | Cron / One-shot                                         | TMDB API      |
| `movie-backfill`             | One-shot              | Manual                                                  | TMDB API      |
| `catalog:health`             | Read-only report      | Manual / CI                                             | PostgreSQL    |
| BullMQ `recommendation`      | Per-request           | HTTP POST to /api/recommendations                       | TMDB + OpenAI |
| BullMQ `more-picks`          | On demand             | HTTP POST to /api/recommendations/[id]/more-picks       | TMDB + OpenAI |
| BullMQ `movie-seed`          | Triggered by pipeline | Internal recommendation/more-picks JIT seeding          | TMDB          |
| BullMQ `catalog-maintenance` | Maintenance jobs      | Recommendation JIT, discovery enqueue, backfill enqueue | TMDB + OpenAI |

---

## BullMQ Workers (`apps/web`)

PopChoice uses [BullMQ](https://docs.bullmq.io/) backed by Redis for async job processing. Workers run in a separate Node.js process alongside the Next.js server.

### Architecture

```
Browser → POST /api/recommendations/[id]/more-picks
             ↓
        claimMorePicksRequest()    [features/recommendation/morePicksPersistence.ts]
             ↓
        startMorePicksRequest()    [features/recommendation/morePicksJobs.ts]
             ↓
        morePicksQueue.add(job) or inline fallback
             ↓
        morePicksWorker
             ↓
        processMorePicksRecommendation()
             ↓
        runMorePicksPipeline()     [TMDB discover → embeddings → AI descriptions]
             ↓
        storeMorePicks() / markMorePicksStatus()
             ↓
        Browser poll detects completion (TanStack Query, 2s interval)
```

### Queue names

| Queue                 | Worker file                                            | Job data                                                         |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `recommendation`      | `apps/web/src/lib/workers/recommendationWorker.ts`     | `recommendationId`, `quizData`, `locale`                         |
| `more-picks`          | `apps/web/src/lib/workers/morePicksWorker.ts`          | `recommendationId`, `slug`, `locale`                             |
| `movie-seed`          | `apps/web/src/lib/workers/movieSeedWorker.ts`          | `tmdbMovies`, `localKeys`                                        |
| `catalog-maintenance` | `apps/web/src/lib/workers/catalogMaintenanceWorker.ts` | `discover-tmdb-source-page`, `seed-tmdb-movie`, `backfill-movie` |

### Graceful degradation

When `REDIS_URL` is not set (e.g., local dev without Redis), `startMorePicksRequest()` falls back to **inline** processing and the route still returns `202 Accepted` so the UI polls the same way. Queue-backed recommendation creation requires Redis; the worker process and BullMQ queues are disabled without it.

### Starting workers

```bash
# From apps/web
npm run start:workers
```

Or via Docker Compose (workers.Dockerfile).

### Environment variables

| Variable                            | Required       | Description                                                                        |
| ----------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `REDIS_URL`                         | ✅ (for async) | Redis connection string (e.g. `redis://localhost:6379`)                            |
| `DATABASE_URL`                      | ✅             | PostgreSQL connection string                                                       |
| `TMDB_API_KEY`                      | ✅             | TMDB v4 read access token                                                          |
| `OPENAI_API_KEY`                    | ✅             | OpenAI API key (embeddings + chat)                                                 |
| `CATALOG_MAINTENANCE_CONCURRENCY`   | ❌             | Catalog worker concurrency. Defaults to `1`.                                       |
| `CATALOG_TMDB_REQUESTS_PER_WINDOW`  | ❌             | Shared catalog-maintenance job budget. Defaults to `10`.                           |
| `CATALOG_TMDB_RATE_LIMIT_WINDOW_MS` | ❌             | Shared catalog-maintenance budget window. Defaults to `10000`.                     |
| `CATALOG_TMDB_429_BACKOFF_MS`       | ❌             | Fallback pause when TMDB returns `429` without `Retry-After`. Defaults to `30000`. |

### Catalog maintenance queue

`catalog-maintenance` is the shared BullMQ pacing layer for TMDB catalog work. It owns:

- `discover-tmdb-source-page` jobs that fetch one TMDB source page and enqueue per-movie seed jobs.
- `seed-tmdb-movie` jobs that fetch details, generate or reuse embeddings, insert new cached catalog rows, and upsert normalized cast/director/genre/keyword metadata.
- `backfill-movie` jobs that refresh an existing movie row by TMDB id or conservative title/year match.

Jobs use deterministic ids such as `tmdb-discover:popular:1:en-US`, `tmdb-seed:550:en-US`, and `backfill:123`, so repeated triggers dedupe at the queue layer. The worker also applies one BullMQ limiter to the queue and pauses when TMDB returns `429`.

Maintenance entrypoints enqueue work and let workers own pacing/retries:

```bash
npm run catalog:discovery:enqueue
npm run catalog:backfill:enqueue
```

`discovery` reads `TMDB_SOURCES`, `MAX_PAGES_PER_SOURCE`, `MIN_VOTE_COUNT`, `MIN_VOTE_AVERAGE`, `MAX_MOVIES_PER_PAGE`, and `TMDB_LANGUAGE`. `backfill` reads `MAX_MOVIES` and `TMDB_LANGUAGE`.

### Bull Board (monitoring dashboard)

A separate monitoring UI is available in `apps/bull-board/`. It provides a web interface to inspect queues, retry failed jobs, and view job history.

```bash
# From repo root
npx --prefix apps/bull-board tsx --env-file=.env apps/bull-board/src/index.ts
```

Bull Board is an operator surface. Local development can run without operator
credentials, but production deployments require shared Basic Auth before public
exposure:

```ini
OPERATOR_AUTH_USERNAME=...
OPERATOR_AUTH_PASSWORD=...
OPERATOR_AUTH_REALM=PopChoice Operators
```

The Coolify service uses `/healthz` for unauthenticated container health checks;
all Bull Board UI routes are behind the operator login when credentials are set.

### Backoffice (planned operator app)

Backoffice/catalog-health UI is planned as a dedicated `apps/backoffice/`
workspace app, deployed as a separate Coolify service like `apps/bull-board`.
It should expose catalog-health reports, TMDB match review queues, and later
manual repair actions without putting admin UI inside `apps/web`.

See [Backoffice Plan](/docs/BACKOFFICE) and
[#493](https://github.com/shchilkin/PopChoice/issues/493).

---

## `services/movie-seed`

**Purpose:** Seeds the database from the curated `movies.txt` file. Designed to be run once during initial setup (or on-demand to re-seed).

**Location:** `services/movie-seed/`

### How it works

1. Reads and parses `movies.txt` (one movie per entry, blank-line separated).
2. Checks which movies already exist in the database (deduplicates by name + year).
3. Generates OpenAI embeddings for new movies.
4. Inserts records into the `movies` table.

### movies.txt Format

```
Movie Name: YEAR | AGE_RATING | DURATION | SCORE rating
Description of the movie.
```

Example:

```
Casablanca: 1942 | PG | 1h 42m | 8.5 rating
A cynical expatriate American café owner struggles to decide whether to help his former lover...
```

### Environment Variables

| Variable           | Required | Default            | Description                         |
| ------------------ | -------- | ------------------ | ----------------------------------- |
| `OPENAI_API_KEY`   | ✅       | —                  | OpenAI API key for embeddings       |
| `DATABASE_URL`     | ✅       | —                  | PostgreSQL connection string        |
| `MOVIES_FILE_PATH` | ❌       | `<cwd>/movies.txt` | Path to the movies.txt file         |
| `DRY_RUN`          | ❌       | `false`            | `"true"` to skip embeddings/inserts |

### Running

```bash
cd services/movie-seed
npm install
npm run dev          # development
npm run build && npm start  # production
DRY_RUN=true npm run dev    # dry run
```

---

## `services/movie-discovery`

**Purpose:** Continuously discovers new movies from TMDB, applies quality filters, generates embeddings, and inserts them into the database. Supports both one-shot and scheduled (cron) modes.

**Location:** `services/movie-discovery/`

### How it works

1. Fetches movies from up to four TMDB endpoints: `now_playing`, `upcoming`, `top_rated`, `popular`.
2. Deduplicates across sources by TMDB movie ID.
3. Applies quality filter (vote count, vote average, overview length).
4. Checks which movies already exist in the database.
5. Caps new movies at `MAX_MOVIES_PER_RUN`.
6. Fetches full movie details (runtime, US certification), credits, genres, and keywords from TMDB for each new movie.
7. Generates OpenAI embeddings.
8. Inserts records into the `movies` table.
9. Upserts normalized cast, director, genre, and keyword metadata for the inserted records.

### Quality Filter

A movie passes if **all** conditions are met:

- `vote_count > MIN_VOTE_COUNT` (default: 500)
- `vote_average >= MIN_VOTE_AVERAGE` (default: 6.5)
- `overview.length > 50`

### Environment Variables

| Variable               | Required | Default     | Description                                               |
| ---------------------- | -------- | ----------- | --------------------------------------------------------- |
| `TMDB_API_KEY`         | ✅       | —           | TMDB API key                                              |
| `OPENAI_API_KEY`       | ✅       | —           | OpenAI API key for embeddings                             |
| `DATABASE_URL`         | ✅       | —           | PostgreSQL connection string                              |
| `TMDB_SOURCES`         | ❌       | all four    | Comma-separated: `now_playing,upcoming,top_rated,popular` |
| `MAX_PAGES_PER_SOURCE` | ❌       | `3`         | TMDB pages to fetch per source                            |
| `MIN_VOTE_COUNT`       | ❌       | `500`       | Minimum vote count                                        |
| `MIN_VOTE_AVERAGE`     | ❌       | `6.5`       | Minimum TMDB vote average                                 |
| `MAX_MOVIES_PER_RUN`   | ❌       | `50`        | Cap on movies embedded per run                            |
| `TMDB_LANGUAGE`        | ❌       | `en-US`     | TMDB API language/locale tag (e.g. `fi-FI`, `ru-RU`)      |
| `SYNC_SCHEDULE`        | ❌       | `0 0 * * 0` | Cron expression (UTC). Set to `""` for one-shot mode.     |
| `DRY_RUN`              | ❌       | `false`     | `"true"` to skip embeddings/inserts                       |

### Running

```bash
cd services/movie-discovery
npm install
npm run dev -- --once    # one-shot, development
npm run build && npm start       # scheduled, production
DRY_RUN=true npm run dev -- --once  # dry run
npm test                 # run vitest tests
```

---

## `services/movie-backfill`

**Purpose:** Backfills missing TMDB identity, `duration`, and `age_rating` data for movies already in the database, records ambiguous matches for manual review, then re-generates embeddings for safely matched rows.

**Location:** `services/movie-backfill/`

### How it works

1. Queries the database for movies where `tmdb_id IS NULL`, `duration = 0`, `poster_url IS NULL`, or TMDB catalog metadata has not been refreshed.
2. Searches TMDB by title + year to find a conservative TMDB identity match.
3. Records ambiguous matches and runtime mismatches in `tmdb_match_reviews`.
4. Fetches full movie details (runtime + US certification/age_rating), credits, genres, and keywords from TMDB.
5. Re-generates the embedding because the embedding text includes runtime and age rating.
6. Updates the database row with `tmdb_id`, `duration`, `age_rating`, match confidence, and `embedding`.
7. Upserts normalized cast, director, genre, and keyword rows plus a lightweight `movies.tmdb_metadata` snapshot.

Movies for which TMDB returns no runtime are skipped so the script never replaces a `0` with another `0`. Ambiguous matches are not auto-applied; they stay in `tmdb_match_reviews` for a future admin/back-office review flow.

### Environment Variables

| Variable         | Required | Default | Description                                        |
| ---------------- | -------- | ------- | -------------------------------------------------- |
| `TMDB_API_KEY`   | ✅       | —       | TMDB v4 read access token (Bearer auth)            |
| `OPENAI_API_KEY` | ✅       | —       | OpenAI API key for generating embeddings           |
| `DATABASE_URL`   | ✅       | —       | PostgreSQL connection string (with pgvector)       |
| `DRY_RUN`        | ❌       | `false` | Set to `true` to log changes without writing to DB |
| `BATCH_SIZE`     | ❌       | `5`     | Number of parallel TMDB detail requests per batch  |
| `MAX_MOVIES`     | ❌       | `0`     | Max movies to process; `0` means all               |

> **Note:** `TMDB_API_KEY` must be a **TMDB v4 read access token** (not a v3 API key).

### Running

```bash
cd services/movie-backfill
npm install
npm run dev              # run backfill
DRY_RUN=true npm run dev # dry run
```

### Catalog health report

`movie-backfill` also owns a read-only catalog health report for metadata visibility. It only runs `SELECT` queries and reports:

- Missing `poster_url`, `localized_name`, `tmdb_id`, runtime, age rating, and TMDB match timestamps.
- TMDB-backed rows whose `tmdb_matched_at` is older than the stale threshold.
- Missing cast, director, genre, and keyword coverage for TMDB-backed rows.
- Likely duplicate identities by repeated `tmdb_id` and normalized title/year groups.
- Sample movie rows for each issue so local or CI logs point at concrete records.

Run it from the repo root:

```bash
npm run catalog:health
```

The current report is CLI-only. A future dedicated backoffice app should expose
the same data in a browser without putting admin or operational UI inside the
user-facing `apps/web` application.

Useful options:

| Variable                      | Default | Description                                             |
| ----------------------------- | ------- | ------------------------------------------------------- |
| `DATABASE_URL`                | —       | PostgreSQL connection string; loaded from root `.env`   |
| `CATALOG_HEALTH_FORMAT`       | `text`  | `text` for readable logs, `json` for machine parsing    |
| `CATALOG_HEALTH_SAMPLE_LIMIT` | `5`     | Sample rows or duplicate groups to show per issue       |
| `CATALOG_HEALTH_STALE_DAYS`   | `180`   | Age threshold for stale TMDB metadata, in calendar days |

Example:

```bash
CATALOG_HEALTH_FORMAT=json CATALOG_HEALTH_SAMPLE_LIMIT=3 npm run catalog:health
```

---

## Recommendation Feature (`/api/movie-recommendation`, `/api/recommendations`)

The recommendation feature combines local vector search with a TMDB fallback. The HTTP routes are now thin entrypoints over feature-owned modules in `apps/web/src/features/recommendation`.

> Product direction: the current implementation is local-vector-first with TMDB fallback because that was enough for the original course-sized catalog. The next recommendation roadmap moves toward TMDB-first candidate generation, with the local database acting as cache, enrichment, identity, embeddings, history, and user-memory storage. See [RECOMMENDATION-ROADMAP.md](/docs/RECOMMENDATION-ROADMAP).

### Current ownership

- `input.ts` owns shared normalization and moderation / prompt-injection screening.
- `pipeline.ts` owns the synchronous recommendation flow used by `/api/movie-recommendation`.
- `jobs.ts` owns async recommendation creation / queue startup for `/api/recommendations`.
- `persistence.ts` owns recommendation reads, writes, and status transitions.
- `candidateFilters.ts` owns exclusion/down-ranking from quiz-mentioned titles and signed-in feedback memory.
- `morePicksPersistence.ts` owns more-picks claim, exclusion lookup, and result persistence.
- `morePicksJobs.ts` owns shared more-picks enqueue / inline fallback / worker processing orchestration.
- `morePicksPipeline.ts` owns TMDB discover, embeddings, ranking, and description generation for extra picks.
- `config.ts`, `limits.ts`, and `stages.ts` own recommendation thresholds, request limits, and user-facing progress stages.

### How it works

1. **Embed** — user quiz answers are concatenated and embedded with `text-embedding-3-large`.
2. **Local search** — `match_movies()` returns up to 6 DB rows ordered by cosine similarity (threshold ≥ 0.1).
3. **Quality gate** — results are split by `SIMILARITY_THRESHOLD` (0.40) into _high-quality_ and _weak_ matches.
4. **TMDB fallback** — if fewer than `MIN_HIGH_QUALITY_LOCAL` (3) high-quality results exist, `GET /discover/movie` is called with quiz-derived params and its results fill the remaining slots.
5. **Memory filtering** — signed-in feedback excludes watched/not-interested/recently recommended movies and down-ranks wrong-mood movies.
6. **JIT seeding** — TMDB movies returned to the user are embedded and inserted into the DB in the background so future queries find them locally.

---

## Account Movie Memory

Signed-in users can train their movie memory at `/account/movie-memory`.

### HTTP API

| Route                       | Method   | Purpose                                                                      |
| --------------------------- | -------- | ---------------------------------------------------------------------------- |
| `/api/account/movie-memory` | `GET`    | Search catalog by `query`/`q`, or load candidate deck with `mode=candidates` |
| `/api/account/movie-memory` | `POST`   | Save a catalog movie as `watched` or `not_seen`                              |
| `/api/account/movie-memory` | `DELETE` | Delete a stored movie-memory item by `movieKey`                              |

The route requires an authenticated session. Mutating requests require a same-origin CSRF cookie/header pair.

### Data model

Movie memory is stored in `user_movie_interactions` with a stable `movie_key`.
Kinds currently include `watched`, `liked`, `not_interested`, `wrong_mood`, and `not_seen`.
Feedback from recommendation result pages can create or update the same durable memory rows.

### Similarity threshold calibration

#### Why cosine similarity is bounded here

`text-embedding-3-large` produces 3072-dimension unit vectors. When the _query_ (a short quiz answer) and the _document_ (a movie description paragraph) are embedded, they live in very different parts of the vector space — so cosine similarity never approaches 1.0. The practical ceiling for this workload is around **0.60–0.62**, which represents the best possible match: the exact movie title used in the query is present in the DB.

**Score interpretation (movie recommendation workload, 316-movie DB, April 2026):**

| Score range | Meaning                                     | UI match % shown                                                                   |
| ----------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0.58–0.62   | Perfect — query names the exact movie       | ~100% effective match                                                              |
| 0.50–0.57   | Excellent — same genre, director, era, tone | very strong recommendation                                                         |
| 0.44–0.49   | Good — thematically close                   | solid recommendation                                                               |
| 0.40–0.43   | Acceptable — shares genre or mood           | passes quality gate                                                                |
| 0.35–0.39   | Weak — loose connection                     | TMDB fills these slots                                                             |
| < 0.35      | Noise — effectively unrelated               | excluded by `match_threshold = 0.1` in the DB query unless no better results exist |

> The UI uses `scaleSimilarity()` (`src/utils/ui/index.ts`) which divides the raw score by the empirical ceiling (0.62) before multiplying by 100. This maps the realistic range onto a full 0–100 scale: a raw score of 0.62 (perfect match) displays as **100%**, and the lowest passing score (0.40) displays as ~65%. Users never see a cap at 62%.

#### Empirical measurements (April 2026, `text-embedding-3-large`, 316 movies)

```
Query: "Favorite movie: The Matrix. Era: new. Tone: exciting. Mood: Action"
  0.5551  The Matrix (1999)          ← best possible for this query
  0.4251  Terminator 2 (1991)
  0.4152  Crouching Tiger (2000)
  0.4046  Inception (2010)

Query: "Favorite movie: Interstellar. Era: new. Tone: serious. Mood: Sci-Fi"
  0.6182  Interstellar (2014)        ← best possible for this query
  0.4638  Inception (2010)
  0.4605  Arrival (2016)
  0.4405  Solaris (1972)

Query: "Favorite movie: The Dark Knight. Era: new. Tone: dark. Mood: Thriller"
  0.6140  The Dark Knight (2008)     ← best possible for this query
  0.5243  Batman Begins (2005)
  0.4550  Joker (2019)
  0.4281  The Departed (2006)
```

No query produced a score ≥ 0.70. Setting `SIMILARITY_THRESHOLD` at or above 0.70 causes `highQualityLocal` to always be empty, so **every** request falls through to TMDB and local DB results are silently dropped.

#### Threshold value rationale

**`SIMILARITY_THRESHOLD = 0.40`** was chosen to:

- Stay below the realistic best-case score (~0.55–0.62), so 3+ local results qualify for mainstream genres without TMDB.
- Stay high enough to exclude movies scoring below ~0.38, which have no meaningful thematic connection to the query.
- Keep the UI match percentage in a readable range (40–62% shown) that sets appropriate expectations.

#### How to recalibrate

If the DB grows substantially, a new embedding model is adopted, or scores shift unexpectedly:

1. Run the built-in calibration tool (requires `OPENAI_API_KEY` and `DATABASE_URL` in `.env`):

   ```bash
   npm run calibrate-similarity
   ```

   The script embeds 5 representative queries, queries the live DB, and prints ranked results with cosine scores. It also prints the highest observed score and a suggested threshold (~2/3 of ceiling).

2. Note the **ceiling** value (the highest score across all queries). Set `SIMILARITY_THRESHOLD` to roughly **two-thirds of that ceiling** (e.g. ceiling 0.60 → threshold 0.40).

3. Update the constants in `apps/web/src/features/recommendation/config.ts`, then update the calibration tables above.

4. Run the unit tests — the recommendation route tests will catch threshold regressions:
   ```bash
   npx vitest --project=server run src/app/api/movie-recommendation/route.test.ts
   ```

To add or edit calibration queries, modify the `QUERIES` array in `scripts/calibrate-similarity.ts`.

### Constants (`apps/web/src/features/recommendation/config.ts`)

| Constant                 | Value  | Purpose                                                               |
| ------------------------ | ------ | --------------------------------------------------------------------- |
| `SIMILARITY_THRESHOLD`   | `0.40` | Minimum cosine similarity to count as a high-quality local result     |
| `MIN_HIGH_QUALITY_LOCAL` | `3`    | Trigger TMDB fallback when fewer than this many local results qualify |
| `MAX_TOTAL_MOVIES`       | `6`    | Maximum movies in the final merged result set                         |
| `MAX_JIT_SEED_MOVIES`    | `5`    | Maximum TMDB movies to JIT-seed per request                           |

---

## Shared Database Schema

The app and root services share the same PostgreSQL schema through `db/init/*.sql` and service-level `ensureSchema()` helpers:

- **Extension:** `pgvector` (vector similarity search)
- **Table:** `movies` — stores name, year, age_rating, description, duration, score_rating, TMDB identity, lightweight TMDB metadata snapshots, poster/localized fields, and a 3072-dimension embedding vector
- **Tables:** `catalog_people`, `catalog_genres`, `catalog_keywords`, `movie_people`, `movie_genres`, and `movie_keywords` — store normalized cast, director, genre, and keyword metadata populated by TMDB discovery/backfill and used by future search. These tables can still be partially populated while older catalog rows wait for a backfill run.
- **Table:** `tmdb_match_reviews` — stores ambiguous TMDB/local match cases for later manual review
- **Table:** `users` and `password_reset_tokens` — support email/password auth and reset flow
- **Tables:** `recommendations`, `recommendation_movies`, `recommendation_feedback`, and `user_movie_interactions` — support persisted async recommendations, feedback, sharing, account history, and movie memory
- **Function:** `match_movies(query_embedding, match_threshold, match_count)` — returns movies ordered by cosine similarity

Schema setup is additive/idempotent. Docker init applies `db/init/*.sql` on first database creation, and `npm run migrate:db` applies the same files to existing local, preview, and production databases. Keep service-level `ensureSchema()` helpers in sync with those SQL files when shared services need new columns.
