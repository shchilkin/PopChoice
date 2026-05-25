---
title: 'Observability Metrics'
---

# Observability Metrics

PopChoice can run a small self-hosted Prometheus stack for application and VPS
health. It is intentionally separate from the app stack: if Prometheus,
exporters, or Grafana are down, recommendations keep running.

## Files

- `docker-compose.observability.yml` starts Prometheus, cAdvisor, node exporter,
  Postgres exporter, Redis exporter, Grafana, Loki, Alloy, and Uptime Kuma.
- `observability/images/*/Dockerfile` builds small config images so Coolify can
  deploy the stack without runtime bind mounts for repo-owned YAML/JSON files.
- `observability/prometheus/prometheus.yml` configures scrape targets.
- `observability/prometheus/rules/popchoice.yml` adds starter recording rules.
- `observability/grafana/provisioning/datasources/prometheus.yaml` provisions
  the Prometheus data source.
- `observability/grafana/provisioning/dashboards/popchoice.yaml` loads
  dashboards from `observability/grafana/dashboards`.
- `observability/grafana/provisioning/alerting/popchoice-alerts.yaml`
  provisions conservative Grafana alert rules.
- `observability/grafana/dashboards/popchoice-overview.json` is the initial
  PopChoice overview dashboard.

## App Metrics

The web app exposes metrics at:

```txt
/api/metrics
```

The worker process exposes metrics at:

```txt
:9464/metrics
```

Production metrics are disabled by default. Enable them on the app stack with:

```ini
METRICS_ENABLED=true
METRICS_BEARER_TOKEN=<long-random-token>
WORKER_METRICS_PORT=9464
```

Prometheus must use the same `METRICS_BEARER_TOKEN`. In development, metrics are
enabled without a token unless `METRICS_ENABLED=false` is set.

## Scrape Targets

Prometheus scrapes:

- `popchoice-web` via `${POPCHOICE_WEB_METRICS_TARGET:-web:3000}/api/metrics`
- `popchoice-workers` via
  `${POPCHOICE_WORKERS_METRICS_TARGET:-workers:9464}/metrics`
- `postgres` via `observability-postgres-exporter:9187`
- `redis` via `observability-redis-exporter:9121`
- `cadvisor` via `observability-cadvisor:8080`
- `node` via `observability-node-exporter:9100`
- `prometheus` itself

The observability compose file joins an external app network named
`${POPCHOICE_APP_NETWORK:-popchoice_default}`. If Coolify gives the app resource
a different Docker network name, set `POPCHOICE_APP_NETWORK` on the
observability resource.

For the Postgres exporter, configure:

```ini
POSTGRES_EXPORTER_DATA_SOURCE_URI=db:5432/popchoice?sslmode=disable
POSTGRES_EXPORTER_DATA_SOURCE_USER=popchoice
POSTGRES_EXPORTER_DATA_SOURCE_PASS=<postgres-password>
```

In Coolify, the observability stack is a separate resource, so it does not
inherit `POSTGRES_PASSWORD` from the PopChoice app resource. Copy the app
database password into `POSTGRES_EXPORTER_DATA_SOURCE_PASS`; otherwise the
exporter starts but Prometheus reports `up{job="postgres"} == 0` and the
exporter logs `password authentication failed for user "popchoice"`.

For the Redis exporter, configure when the Redis host is not `redis:6379`:

```ini
REDIS_EXPORTER_REDIS_ADDR=redis://redis:6379
```

For Grafana Telegram alert notifications, configure both values on the
observability resource:

```ini
GRAFANA_TELEGRAM_BOT_TOKEN=<telegram-bot-token>
GRAFANA_TELEGRAM_CHAT_ID=<telegram-chat-id>
```

If either value is missing, Grafana starts without provisioning the Telegram
contact point so the observability stack can still run safely.

Telegram alert notifications use a PopChoice-specific plain-text template. Set
`GF_SERVER_ROOT_URL` to the public Grafana URL if silence, dashboard, and
Grafana links should be useful outside the Docker network.

## Local or VPS Start

From the repo root:

```bash
export GRAFANA_ADMIN_PASSWORD='replace-with-a-long-password'
export METRICS_BEARER_TOKEN='replace-with-a-long-token'
docker compose -f docker-compose.observability.yml up -d
```

Prometheus listens on `127.0.0.1:9090`; Grafana listens on `127.0.0.1:3001`.
On a VPS, keep both behind Coolify authentication or an SSH tunnel.

## Metrics Included

Application metrics keep labels low-cardinality. They do not include user ids,
request ids, recommendation ids, job ids, or movie titles.

- `popchoice_recommendations_total{mode,status}` counts recommendation
  completions and failures.
- `popchoice_recommendation_duration_seconds{mode,status}` tracks recommendation
  processing latency.
- `popchoice_provider_errors_total{provider,operation,reason}` counts OpenAI and
  TMDB degradation, including timeouts, HTTP errors, validation errors, and
  rate limits.
- `popchoice_queue_depth{queue,status}` reports BullMQ waiting, active, delayed,
  completed, failed, and paused counts at scrape time.
- `popchoice_queue_jobs_total{queue,job,event,final}` counts worker job
  completions and retry/final failures.
- `popchoice_dependency_health{dependency}` reports the most recent web health
  check view of Postgres and Redis.
- `popchoice_dependency_health_failures_total{dependency}` counts health check
  failures.

Prometheus also collects default Node.js process metrics from the web and
worker processes, container CPU/memory/filesystem metrics from cAdvisor, host
CPU/memory/disk metrics from node exporter, and `pg_up` / `redis_up` from the
database exporters.

## Dashboard

Grafana provisions the `PopChoice Overview` dashboard. It starts with:

- web and worker scrape target health
- Postgres and Redis exporter health
- recommendation throughput and p50/p95 duration
- BullMQ queue depth and final failures
- OpenAI/TMDB degradation events
- container CPU and memory
- host disk usage

Panels may be empty until the relevant metric has been emitted. For example,
recommendation latency appears only after a recommendation completes, and
dependency health appears after `/api/health` has been called.

## Alerts

Grafana provisions a first conservative alert set for
[#503](https://github.com/shchilkin/PopChoice/issues/503). The rules are grouped
by severity and include owner/action annotations:

- P1: app, Postgres, and Redis outages.
- P2: sustained queue backlog, provider timeout/rate-limit spikes, and disk
  pressure.
- P3: monitoring scrape target failures and elevated recommendation failure
  ratio.

See [Observability Alerts](/docs/OBSERVABILITY-ALERTS) for thresholds, retention,
and backup expectations. See
[Observability Runbooks](/docs/OBSERVABILITY-RUNBOOKS) for incident response.

For Tempo traces and request/job correlation, see
[Observability Traces](/docs/OBSERVABILITY-TRACES).
