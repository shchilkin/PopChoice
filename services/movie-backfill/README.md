# movie-backfill

A one-shot script that backfills missing `duration`, `age_rating`, TMDB identity, and poster metadata for movies already in the database. It also includes a read-only catalog health report for metadata coverage checks.

## What it does

1. Queries the database for movies where `tmdb_id IS NULL`, `duration = 0`, or `poster_url IS NULL`.
2. For each movie, searches TMDB by title + year to find a conservative TMDB movie ID match.
3. Writes ambiguous matches or runtime mismatches to `tmdb_match_reviews` for later manual review.
4. Fetches full movie details (runtime + US certification/age_rating) from TMDB.
5. Re-generates the embedding for each movie (since the embedding text includes duration and age_rating).
6. Updates the database row with the new `tmdb_id`, `duration`, `age_rating`, match confidence, and `embedding`.

Movies for which TMDB returns no runtime are skipped (logged as warnings) so the script never replaces a `0` with another `0`.

Ambiguous TMDB matches are intentionally not auto-applied. They are recorded in `tmdb_match_reviews` with candidate IDs, confidence scores, and a reason (`ambiguous_match` or `runtime_mismatch`) so a future admin/back-office view can resolve them safely.

## Environment Variables

| Variable         | Required | Default | Description                                        |
| ---------------- | -------- | ------- | -------------------------------------------------- |
| `TMDB_API_KEY`   | ✅       | —       | TMDB v4 read access token (Bearer auth)            |
| `OPENAI_API_KEY` | ✅       | —       | OpenAI API key for generating embeddings           |
| `DATABASE_URL`   | ✅       | —       | PostgreSQL connection string (with pgvector)       |
| `DRY_RUN`        | ❌       | `false` | Set to `true` to log changes without writing to DB |
| `BATCH_SIZE`     | ❌       | `5`     | Number of parallel TMDB detail requests per batch  |
| `MAX_MOVIES`     | ❌       | `0`     | Max movies to process; `0` means all               |

> **Note:** `TMDB_API_KEY` must be a **TMDB v4 read access token** (not a v3 API key). It is sent as `Authorization: Bearer <token>`. You can generate one in the TMDB dashboard under **Settings → API → Read Access Token**.

## How to run locally

```bash
cd services/movie-backfill
npm install

# Required env vars
export TMDB_API_KEY=your_tmdb_read_access_token
export OPENAI_API_KEY=your_openai_key
export DATABASE_URL=postgresql://user:pass@localhost:5432/popchoice

npx tsx src/index.ts
```

## Dry-run mode

Use dry-run mode to see which movies would be updated without making any changes:

```bash
DRY_RUN=true npx tsx src/index.ts
```

## Options

Process only the first 10 incomplete movies:

```bash
MAX_MOVIES=10 npx tsx src/index.ts
```

Increase batch size for faster processing (may hit TMDB rate limits):

```bash
BATCH_SIZE=10 npx tsx src/index.ts
```

## Catalog health report

Run a read-only report for catalog/data-health issues:

```bash
npm run catalog:health
```

The workspace script loads `DATABASE_URL` from the repository root `.env`.

The report counts missing `poster_url`, missing `localized_name`, missing `tmdb_id`, missing runtime, missing age rating, TMDB-backed rows without `tmdb_matched_at`, stale TMDB metadata, duplicate TMDB ids, and likely duplicate normalized title/year identities. It includes sample rows for each issue.

Options:

| Variable                      | Default | Description                                          |
| ----------------------------- | ------- | ---------------------------------------------------- |
| `CATALOG_HEALTH_FORMAT`       | `text`  | Use `json` for machine-readable output               |
| `CATALOG_HEALTH_SAMPLE_LIMIT` | `5`     | Sample rows or duplicate groups to include per issue |
| `CATALOG_HEALTH_STALE_DAYS`   | `180`   | Stale threshold for `tmdb_matched_at`                |

Example:

```bash
CATALOG_HEALTH_FORMAT=json CATALOG_HEALTH_SAMPLE_LIMIT=3 npm run catalog:health
```
