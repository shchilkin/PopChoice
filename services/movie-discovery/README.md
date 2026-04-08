# movie-discovery

TMDB-driven service that continuously discovers new movies, applies quality filters, generates OpenAI embeddings, and inserts them into the PopChoice PostgreSQL database.

## Purpose

This service fetches movies from multiple TMDB endpoints (`now_playing`, `upcoming`, `top_rated`, `popular`), applies vote count and rating filters, fetches real runtime and US age certification for each qualifying movie, generates embeddings, and upserts into the database. It can run as a scheduled cron job or as a one-shot command.

## Environment Variables

| Variable               | Required | Default     | Description                                                        |
| ---------------------- | -------- | ----------- | ------------------------------------------------------------------ |
| `TMDB_API_KEY`         | ✅       | —           | TMDB v4 Bearer read access token                                   |
| `OPENAI_API_KEY`       | ✅       | —           | OpenAI API key for generating embeddings                           |
| `DATABASE_URL`         | ✅       | —           | PostgreSQL connection string (with pgvector extension)             |
| `TMDB_SOURCES`         | ❌       | all four    | Comma-separated: `now_playing,upcoming,top_rated,popular`          |
| `MAX_PAGES_PER_SOURCE` | ❌       | `3`         | Number of TMDB pages to fetch per source endpoint                  |
| `MIN_VOTE_COUNT`       | ❌       | `500`       | Minimum number of votes a movie must have                          |
| `MIN_VOTE_AVERAGE`     | ❌       | `6.5`       | Minimum TMDB vote average                                          |
| `MAX_MOVIES_PER_RUN`   | ❌       | `50`        | Cap on new movies embedded and inserted per run                    |
| `SYNC_SCHEDULE`        | ❌       | `0 0 * * 0` | Cron expression for scheduled mode (UTC). Empty string = one-shot. |
| `DRY_RUN`              | ❌       | `false`     | Set to `"true"` to skip embeddings and database inserts            |

## Modes

### Scheduled (default)

Starts a cron scheduler and also runs an initial sync on startup.

```bash
npm start
# or with a custom schedule (every day at 3am UTC):
SYNC_SCHEDULE="0 3 * * *" npm start
```

### One-shot

Runs a single sync and exits. Useful for CI/CD pipelines or manual runs.

```bash
# Via flag
node dist/index.js --once

# Or by setting empty schedule
SYNC_SCHEDULE="" npm start
```

## Running

```bash
# Development
npm run dev

# Production (after build)
npm run build
npm start

# Dry run
DRY_RUN=true npm run dev -- --once

# Run tests
npm test
```

## Docker

```bash
docker build -t movie-discovery .
docker run --env-file .env movie-discovery
```

## Quality Filter

Movies are included only if they satisfy **all** of the following:

- `vote_count > MIN_VOTE_COUNT`
- `vote_average >= MIN_VOTE_AVERAGE`
- `overview.length > 50`
