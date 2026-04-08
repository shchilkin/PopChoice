# PopChoice Background Services

This document describes the background services that populate and maintain the movie database used by PopChoice.

---

## Services Overview

| Service           | Type      | Trigger         | Source       |
| ----------------- | --------- | --------------- | ------------ |
| `movie-seed`      | One-shot  | Manual / CI     | `movies.txt` |
| `movie-discovery` | Scheduled | Cron / One-shot | TMDB API     |

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
6. Fetches full movie details (runtime, US certification) from TMDB for each new movie.
7. Generates OpenAI embeddings.
8. Inserts records into the `movies` table.

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

## Shared Database Schema

Both services share the same PostgreSQL schema managed by `ensureSchema()` in `database.ts`:

- **Extension:** `pgvector` (vector similarity search)
- **Table:** `movies` — stores name, year, age_rating, description, duration, score_rating, and a 3072-dimension embedding vector
- **Function:** `match_movies(query_embedding, match_threshold, match_count)` — returns movies ordered by cosine similarity

The schema setup uses `CREATE IF NOT EXISTS` for the extension and table (additive/idempotent), and updates the `match_movies` function definition with `CREATE OR REPLACE FUNCTION` on startup to keep it current without dropping it first.
