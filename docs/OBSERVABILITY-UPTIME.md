---
title: 'Uptime Kuma Monitoring'
---

# Uptime Kuma Monitoring

Issue [#502](https://github.com/shchilkin/PopChoice/issues/502) starts the
self-hosted observability stack with an external view of PopChoice production
reachability. This page is intentionally limited to Uptime Kuma uptime and
cheap synthetic checks. Logs, metrics, traces, and dashboards are tracked in
separate observability issues.

## Stack

Run Uptime Kuma outside the PopChoice application Compose stack so app deploys,
database migrations, and worker restarts cannot take the monitor down with the
service it is watching.

```bash
docker compose -f docker-compose.observability.yml up -d
```

The local Compose file exposes Kuma on `http://127.0.0.1:3002` and stores all
monitor state in the named `uptime-kuma-data` volume. On a VPS, put this service
behind Coolify, Caddy, nginx, or a private network such as Tailscale. Do not
publish the Kuma UI directly without authentication and TLS.

Recommended VPS shape:

- One small Uptime Kuma service from `docker-compose.observability.yml`.
- A persistent volume mounted at `/app/data`.
- A private or protected public URL such as `https://uptime.example.com`.
- Backups enabled for the Kuma volume before monitors become the source of
  truth.

## Production Monitors

Create these monitors manually in Kuma. Keep names stable so alert history stays
readable.

| Name                          | Type            | Target                                              | Interval | Success criteria                   | Purpose                                                                                                                  |
| ----------------------------- | --------------- | --------------------------------------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `popchoice-prod-health`       | HTTP(s)         | `https://pop-choice.shchilkin.dev/api/health`       | 60s      | HTTP `200`                         | Catches app, PostgreSQL, or Redis outages because `/api/health` fails closed when required dependencies are unavailable. |
| `popchoice-prod-build`        | HTTP(s) Keyword | `https://pop-choice.shchilkin.dev/api/build`        | 5m       | HTTP `200` and keyword `version`   | Confirms the deployed app is serving build metadata for release/debug visibility.                                        |
| `popchoice-prod-homepage`     | HTTP(s) Keyword | `https://pop-choice.shchilkin.dev/`                 | 5m       | HTTP `200` and keyword `PopChoice` | Cheap browserless smoke check for the public app shell.                                                                  |
| `popchoice-prod-catalog-page` | HTTP(s)         | `https://pop-choice.shchilkin.dev/available-movies` | 10m      | HTTP `200`                         | Cheap smoke check for a catalog-backed page without invoking recommendations or external AI providers.                   |

Use retries before alerting to reduce noise from transient network blips. A good
starting point is 2 retries, 20s retry interval, and a 20s request timeout.

## Synthetic Smoke Strategy

The default synthetic checks must not spend OpenAI or TMDB credits. Keep the
always-on Kuma checks to read-only routes:

- `/api/health` for app, PostgreSQL, and Redis readiness.
- `/api/build` for deploy provenance.
- `/` for the public shell.
- `/available-movies` for a cheap catalog-backed page load.

Do not make an always-on production monitor POST to
`/api/movie-recommendation`, `/api/recommendations`, or
`/api/recommendations/[id]/more-picks`. Those paths can call embeddings,
chat completions, TMDB, Redis workers, or recommendation persistence depending
on environment and request shape.

For deeper recommendation smoke coverage, use one of these explicitly separated
paths:

- Run the existing Playwright e2e smoke suite in CI or after deploy with
  `E2E_DETERMINISTIC_RECOMMENDATIONS=1`. That validates the browser, API,
  database, results, feedback, and movie-memory flow without live AI calls.
- Add a staging-only deterministic endpoint or staging deployment later, then
  point a Kuma monitor at staging rather than production.
- Run live-provider recommendation checks manually when you intentionally want
  to spend API credits and inspect model/provider behavior.

If a future synthetic job posts to a PopChoice API, give it a dedicated API key,
rate-limit it tightly, and document whether it is deterministic, staging-only,
or allowed to call live providers.

## Notifications

Configure at least one low-friction notification channel in Kuma before relying
on the monitor:

- Telegram: bot token plus chat ID for fast personal alerts.
- Slack: incoming webhook URL for a project or ops channel.
- Email/SMTP: host, port, username, password, `from`, and recipient address.

Suggested alert behavior:

- Alert when `popchoice-prod-health` is down after retries. Treat this as
  production-impacting because it covers the app and required dependencies.
- Alert when `popchoice-prod-build` is down for deploy visibility loss, but use
  a lower urgency than `/api/health`.
- Alert on homepage or catalog-page failures after retries. These usually mean
  routing, certificate, rendering, or application availability problems.
- Send recovery notifications so incident timelines include both outage and
  restoration times.

Keep secrets only in Kuma's notification settings or the host secret manager.
Do not commit bot tokens, webhook URLs, SMTP passwords, or destination IDs.

## Backup and Restore

Kuma stores monitors, notification settings, status pages, and history under
`/app/data`. In this repository's Compose file, that path is backed by the
`uptime-kuma-data` Docker volume.

Back up before changing monitor definitions and on a regular VPS backup
schedule:

```bash
docker run --rm \
  -v popchoice-observability_uptime-kuma-data:/data:ro \
  -v "$PWD/backups":/backup \
  alpine \
  tar czf /backup/uptime-kuma-$(date +%Y%m%d-%H%M%S).tgz -C /data .
```

Restore into a stopped Kuma service:

```bash
docker compose -f docker-compose.observability.yml down
docker run --rm \
  -v popchoice-observability_uptime-kuma-data:/data \
  -v "$PWD/backups":/backup \
  alpine \
  sh -c 'rm -rf /data/* && tar xzf /backup/uptime-kuma-YYYYMMDD-HHMMSS.tgz -C /data'
docker compose -f docker-compose.observability.yml up -d
```

The exact volume name can vary by Compose project name. Check it with:

```bash
docker volume ls | grep uptime-kuma
```

Kuma also has an in-app export/import path for monitor definitions. Use it for
quick edits, but keep volume backups as the recovery source because notification
settings and history live in the data directory.

## Operational Checks

After the monitor stack starts:

1. Open the Kuma UI and create the admin account.
2. Add the production monitors from this document.
3. Configure at least one notification channel.
4. Use Kuma's test notification button.
5. Temporarily pause any monitor you are intentionally breaking during deploy
   work, and add a note to the incident timeline if an alert fires.
6. Export monitor definitions after the first working setup and after major
   changes.
