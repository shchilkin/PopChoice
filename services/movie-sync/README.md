# Movie Sync Service

A standalone Node.js/TypeScript cron service that syncs popular movies from TMDB into the PopChoice Supabase database with OpenAI embeddings.

## What It Does

1. **Fetches** popular/trending movies from the TMDB `/discover/movie` endpoint
2. **De-duplicates** against movies already in the Supabase database (by name + year)
3. **Creates embeddings** via OpenAI (`text-embedding-3-large`) for new movies only
4. **Inserts** new movie records into the `movies` table in Supabase

## Modes

| Mode          | Trigger                             | Behavior                                             |
| ------------- | ----------------------------------- | ---------------------------------------------------- |
| **One-shot**  | `--once` flag or `CRON_SCHEDULE=""` | Runs a single sync, then exits                       |
| **Scheduled** | Default (`CRON_SCHEDULE` set)       | Runs on a cron schedule (default: daily at 3 AM UTC) |

## Environment Variables

| Variable           | Required | Default     | Description                                             |
| ------------------ | -------- | ----------- | ------------------------------------------------------- |
| `TMDB_API_KEY`     | Yes      | —           | TMDB v4 read access token (used as Bearer auth)         |
| `OPENAI_API_KEY`   | Yes      | —           | OpenAI API key for embeddings                           |
| `SUPABASE_URL`     | Yes      | —           | Supabase project URL                                    |
| `SUPABASE_API_KEY` | Yes      | —           | Supabase anon or service-role key                       |
| `CRON_SCHEDULE`    | No       | `0 3 * * *` | Cron expression for scheduled mode                      |
| `DRY_RUN`          | No       | `false`     | Set to `true` to skip embedding creation and DB inserts |
| `LOG_LEVEL`        | No       | `info`      | Set to `debug` for verbose logging                      |

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

```bash
docker build -t movie-sync .
docker run --env-file .env movie-sync
```

## Railway Deployment

Railway supports deploying services from subdirectories. Follow these steps to add the movie-sync service:

### 1. Add a New Service

- Open your Railway project dashboard
- Click **"+ New"** → **"GitHub Repo"**
- Select the **PopChoice** repository

### 2. Set the Root Directory

- Go to the new service's **Settings** tab
- Under **Root Directory**, enter: `services/movie-sync`
- Railway will use the `Dockerfile` in that directory automatically

### 3. Configure Environment Variables

In the service's **Variables** tab, add:

- `TMDB_API_KEY` — your TMDB v4 read access token
- `OPENAI_API_KEY` — your OpenAI API key
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_API_KEY` — your Supabase API key
- `CRON_SCHEDULE` — e.g., `0 3 * * *` for daily at 3 AM UTC (or leave default)
- `DRY_RUN` — set to `true` for testing without DB writes

### 4. Deploy

Railway will automatically build and deploy the service using the Dockerfile. The service will start running on the configured cron schedule.

### Tips

- Use **Railway's log viewer** to monitor sync runs (all output is structured JSON)
- Set `DRY_RUN=true` initially to verify TMDB fetching and duplicate detection without writing to the database
- Adjust `CRON_SCHEDULE` as needed — e.g., `0 */6 * * *` for every 6 hours
