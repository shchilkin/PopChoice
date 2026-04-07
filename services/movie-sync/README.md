# Movie Sync Service

A standalone Node.js/TypeScript cron service that syncs movies from `movies.txt` into the PopChoice PostgreSQL database with OpenAI embeddings.

## What It Does

1. **Reads** all movies from `movies.txt` (the curated source of truth)
2. **De-duplicates** against movies already in the database (by name + year)
3. **Creates embeddings** via OpenAI (`text-embedding-3-large`) for new movies only
4. **Inserts** new movie records into the `movies` table via PostgreSQL

## Modes

| Mode          | Trigger                             | Behavior                                             |
| ------------- | ----------------------------------- | ---------------------------------------------------- |
| **One-shot**  | `--once` flag or `CRON_SCHEDULE=""` | Runs a single sync, then exits                       |
| **Scheduled** | Default (`CRON_SCHEDULE` set)       | Runs on a cron schedule (default: daily at 3 AM UTC) |

## Environment Variables

| Variable           | Required | Default       | Description                                                                                                                                                                                                                                         |
| ------------------ | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`   | Yes      | —             | OpenAI API key for embeddings                                                                                                                                                                                                                       |
| `DATABASE_URL`     | Yes      | —             | PostgreSQL connection string                                                                                                                                                                                                                        |
| `MOVIES_FILE_PATH` | No       | auto-detected | Path to the movies text file. Defaults to `./movies.txt` relative to the working directory, with an automatic fallback to `./services/movie-sync/movies.txt` when running from the repo root. Set this explicitly if the file lives elsewhere. |
| `CRON_SCHEDULE`    | No       | `0 3 * * *`   | Cron expression for scheduled mode                                                                                                                                                                                                                  |
| `DRY_RUN`          | No       | `false`       | Set to `true` to skip embedding creation and DB inserts                                                                                                                                                                                             |
| `LOG_LEVEL`        | No       | `info`        | Set to `debug` for verbose logging                                                                                                                                                                                                                  |

## Local Development

```bash
# Install dependencies
npm install

# Run a one-shot sync (requires env vars)
npm run dev -- --once

# Run in scheduled mode
npm run dev
```

## Build & Run (Production)

```bash
npm install
npm run build
npm start           # scheduled mode (default)
npm start -- --once # one-shot mode
```

## Docker

Build from the repository root so that `services/movie-sync/movies.txt` is accessible in the build context:

```bash
# Build from the repository root
docker build -f services/movie-sync/Dockerfile -t movie-sync .

# Run (movies.txt is already baked into the image)
docker run --env-file .env movie-sync
```

Alternatively, mount `movies.txt` at runtime and set `MOVIES_FILE_PATH`:

```bash
docker run --env-file .env \
  -v /path/to/movies.txt:/data/movies.txt \
  -e MOVIES_FILE_PATH=/data/movies.txt \
  movie-sync
```

## Railway Deployment

Railway supports deploying services from subdirectories. Follow these steps to add the movie-sync service:

### 1. Add a New Service

- Open your Railway project dashboard
- Click **"+ New"** → **"GitHub Repo"**
- Select the **PopChoice** repository

### 2. Set the Root Directory and Dockerfile

- Go to the new service's **Settings** tab
- Under **Root Directory**, leave it as `.` (the repository root)
- Under **Dockerfile Path**, enter: `services/movie-sync/Dockerfile`

> **Note:** The Dockerfile copies `movies.txt` from `services/movie-sync/` into the image. Build from the repository root so all service files are within the build context.

### 3. Configure Environment Variables

In the service's **Variables** tab, add:

- `OPENAI_API_KEY` — your OpenAI API key
- `DATABASE_URL` — your PostgreSQL connection string
- `CRON_SCHEDULE` — e.g., `0 3 * * *` for daily at 3 AM UTC (or leave default)
- `DRY_RUN` — set to `true` for testing without DB writes

### 4. Deploy

Railway will automatically build and deploy the service using the Dockerfile. The service will start running on the configured cron schedule.

### Tips

- Use **Railway's log viewer** to monitor sync runs (all output is structured JSON)
- Set `DRY_RUN=true` initially to verify file parsing and duplicate detection without writing to the database
- Adjust `CRON_SCHEDULE` as needed — e.g., `0 */6 * * *` for every 6 hours
