# movie-seed

One-shot service that reads movies from a `movies.txt` file, generates OpenAI embeddings, and seeds the PostgreSQL database used by PopChoice.

## Purpose

This service is designed to be run once (or on-demand) to populate the database from the curated `movies.txt` file. It skips movies that already exist (deduplicates by name + year), so it is safe to re-run.

## Environment Variables

| Variable           | Required | Default            | Description                                    |
| ------------------ | -------- | ------------------ | ---------------------------------------------- |
| `OPENAI_API_KEY`   | ✅       | —                  | OpenAI API key used to generate embeddings     |
| `DATABASE_URL`     | ✅       | —                  | PostgreSQL connection string (with pgvector)   |
| `MOVIES_FILE_PATH` | ❌       | `<cwd>/movies.txt` | Path to the movies.txt file to parse           |
| `DRY_RUN`          | ❌       | `false`            | Set to `"true"` to skip embeddings and inserts |

## movies.txt Format

Each movie entry spans two lines, separated by a blank line:

```
Movie Name: YEAR | AGE_RATING | DURATION | SCORE rating
Description of the movie.
```

Example:

```
Casablanca: 1942 | PG | 1h 42m | 8.5 rating
A cynical expatriate American café owner struggles to decide whether to help his former lover and her fugitive husband escape the Nazis in French Morocco.
```

## Running

```bash
# Development
npm run dev

# Production (after build)
npm run build
npm start

# Dry run (no DB writes)
DRY_RUN=true npm run dev
```

## Docker

```bash
docker build -t movie-seed .
docker run --env-file .env movie-seed
```
