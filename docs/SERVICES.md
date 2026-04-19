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

## API Route: Hybrid Search (`/api/movie-recommendation`)

The recommendation route combines local vector search with a TMDB fallback.

### How it works

1. **Embed** — user quiz answers are concatenated and embedded with `text-embedding-3-large`.
2. **Local search** — `match_movies()` returns up to 6 DB rows ordered by cosine similarity (threshold ≥ 0.1).
3. **Quality gate** — results are split by `SIMILARITY_THRESHOLD` (0.40) into _high-quality_ and _weak_ matches.
4. **TMDB fallback** — if fewer than `MIN_HIGH_QUALITY_LOCAL` (3) high-quality results exist, `GET /discover/movie` is called with quiz-derived params and its results fill the remaining slots.
5. **JIT seeding** — TMDB movies returned to the user are embedded and inserted into the DB in the background so future queries find them locally.

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

3. Update the constant in `src/app/api/movie-recommendation/route.ts` and the calibration tables above.

4. Run the unit tests — `shouldFallBackToTMDB` tests will catch threshold regressions:
   ```bash
   npx vitest --project=server run src/app/api/movie-recommendation/route.test.ts
   ```

To add or edit calibration queries, modify the `QUERIES` array in `scripts/calibrate-similarity.ts`.

### Constants (`src/app/api/movie-recommendation/route.ts`)

| Constant                 | Value  | Purpose                                                               |
| ------------------------ | ------ | --------------------------------------------------------------------- |
| `SIMILARITY_THRESHOLD`   | `0.40` | Minimum cosine similarity to count as a high-quality local result     |
| `MIN_HIGH_QUALITY_LOCAL` | `3`    | Trigger TMDB fallback when fewer than this many local results qualify |
| `MAX_TOTAL_MOVIES`       | `6`    | Maximum movies in the final merged result set                         |
| `MAX_JIT_SEED_MOVIES`    | `5`    | Maximum TMDB movies to JIT-seed per request                           |

---

## Shared Database Schema

Both services share the same PostgreSQL schema managed by `ensureSchema()` in `database.ts`:

- **Extension:** `pgvector` (vector similarity search)
- **Table:** `movies` — stores name, year, age_rating, description, duration, score_rating, and a 3072-dimension embedding vector
- **Function:** `match_movies(query_embedding, match_threshold, match_count)` — returns movies ordered by cosine similarity

The schema setup uses `CREATE IF NOT EXISTS` for the extension and table (additive/idempotent), and updates the `match_movies` function definition with `CREATE OR REPLACE FUNCTION` on startup to keep it current without dropping it first.
