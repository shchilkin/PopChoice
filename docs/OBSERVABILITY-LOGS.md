# Observability Logs

PopChoice can run a small self-hosted log stack for production or preview VPS
debugging: Grafana Loki stores logs, Grafana Alloy tails Docker containers, and
Grafana provides search through the provisioned Loki data source. The same
Grafana instance can also load the Prometheus metrics dashboard documented in
[OBSERVABILITY-METRICS.md](./OBSERVABILITY-METRICS.md) and the Tempo traces
documented in [OBSERVABILITY-TRACES.md](./OBSERVABILITY-TRACES.md).

This stack is intentionally separate from the PopChoice app stack. Web,
workers, Bull Board, PostgreSQL, Redis, and one-shot service containers keep
writing to stdout/stderr; Alloy reads Docker logs and pushes them to Loki. If
Loki, Alloy, or Grafana are down, PopChoice keeps running and Docker still keeps
its local container logs.

## Files

- `docker-compose.observability.yml` starts Loki, Alloy, Grafana, Prometheus,
  metrics exporters, and the Uptime Kuma service documented separately in
  [OBSERVABILITY-UPTIME.md](./OBSERVABILITY-UPTIME.md).
- `observability/loki/loki.yaml` configures single-binary Loki with filesystem
  TSDB storage and seven-day retention.
- `observability/alloy/config.alloy` discovers Docker containers, parses Docker
  log envelopes, extracts Pino JSON fields, and ships logs to Loki.
- `observability/grafana/provisioning/datasources/loki.yaml` provisions the
  local Loki data source.

## Local or VPS start

From the repo root:

```bash
export GRAFANA_ADMIN_PASSWORD='replace-with-a-long-password'
docker compose -f docker-compose.observability.yml up -d
```

Grafana listens on `127.0.0.1:3001` by default. On a VPS, either expose it
through Coolify with authentication enabled or reach it over an SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 your-vps
```

Then open `http://127.0.0.1:3001`, choose the `Loki` data source in Explore, and
query recent logs.

Alloy also exposes its debugging UI on `127.0.0.1:12345`. Use it only from the
host or an SSH tunnel because the container mounts the Docker socket read-only.

## Coolify deployment shape

Keep this as a separate Docker Compose resource from `coolify.compose.yml` so
log storage can restart, resize, or be removed without redeploying PopChoice.
Use `docker-compose.observability.yml` as the compose file path and set
`GRAFANA_ADMIN_PASSWORD` in the observability resource.

The stack collects every Docker container visible through
`/var/run/docker.sock`, including PopChoice containers and infrastructure
containers where Docker exposes metadata. Do not add Loki as a runtime
dependency to `web`, `workers`, or service containers.

## Labels and structured fields

Alloy stores these low-cardinality labels:

| Label             | Source                         | Use                                                    |
| ----------------- | ------------------------------ | ------------------------------------------------------ |
| `stack`           | Static `popchoice` label       | Narrow queries to this log stack                       |
| `service`         | Docker Compose service label   | Search `web`, `workers`, `bull-board`, `db`, `redis`   |
| `container`       | Docker container name          | Inspect one concrete container                         |
| `compose_project` | Docker Compose project label   | Separate preview, local, and production compose stacks |
| `level`           | Pino JSON `level` when present | Filter application log severity                        |

Alloy attaches these Pino fields as Loki structured metadata instead of labels:
`requestId`, `reqId`, `recommendationId`, `recommendationSlug`, `queue`,
`queueName`, `jobId`, `jobName`, `stage`, `userId`, `err`, and `msg`.

The identifier fields are intentionally not indexed as labels because request,
recommendation, job, and user ids are high-cardinality. Loki can still filter
structured metadata after selecting a small enough stream and time window.

Pino levels are numeric by default:

| Pino level | Meaning |
| ---------- | ------- |
| `10`       | trace   |
| `20`       | debug   |
| `30`       | info    |
| `40`       | warn    |
| `50`       | error   |
| `60`       | fatal   |

## Query examples

Start broad, then add structured metadata filters. Keep the time picker narrow
for identifier searches.

Recent web logs:

```logql
{stack="popchoice", service="web"}
```

Application errors across web and workers:

```logql
{stack="popchoice", level=~"50|60"}
```

Warnings and errors for workers:

```logql
{stack="popchoice", service="workers", level=~"40|50|60"}
```

One request id, supporting both common field names:

```logql
{stack="popchoice", service="web"} | requestId="req_123"
```

```logql
{stack="popchoice", service="web"} | reqId="req_123"
```

One recommendation flow across API and workers:

```logql
{stack="popchoice", service=~"web|workers"} | recommendationId="rec_123"
```

Recommendation stage updates or failures:

```logql
{stack="popchoice", service=~"web|workers"} | recommendationId="rec_123" | stage="descriptions"
```

One BullMQ job id:

```logql
{stack="popchoice", service="workers"} | jobId="tmdb-seed:550:en-US"
```

Queue-related worker logs, depending on which field exists in the log line:

```logql
{stack="popchoice", service="workers"} | queue="recommendation"
```

```logql
{stack="popchoice", service="workers"} | queueName="catalog-maintenance"
```

Catalog maintenance job completions and failures:

```logql
{stack="popchoice", service="workers"} | jobName="seed-tmdb-movie"
```

Plain text fallback for infrastructure logs or older unstructured lines:

```logql
{stack="popchoice", service=~"db|redis|bull-board"} |= "error"
```

Parse original JSON at query time when a field was not promoted by Alloy:

```logql
{stack="popchoice", service="web"} | json | userId="user_123"
```

## Incident shortcuts

Recommendation is stuck:

1. Search by `recommendationId` across `web` and `workers`.
2. Check worker `level=~"40|50|60"` in the same time window.
3. Search for `jobId` if the enqueue or worker log includes one.
4. Check `redis` logs for connectivity errors and `db` logs for migrations or
   connection saturation.

Worker or queue failures:

1. Start with `{stack="popchoice", service="workers", level=~"40|50|60"}`.
2. Filter by `jobName`, `queue`, `queueName`, or `jobId` when available.
3. Use Bull Board for retry state after Loki identifies the failing job.

Provider or catalog issues:

1. Search workers for `TMDB`, `OpenAI`, `timeout`, or `429`.
2. Check `catalog-maintenance` job names and `jobId` values.
3. Compare with `db` and `redis` logs before assuming a provider outage.

## Retention and disk pressure

The default Loki retention is `168h` (seven days). This is a conservative small
VPS default: useful for post-incident review without silently growing forever.
Loki retention is enforced by the compactor, and the config also limits query
lookback to the same seven-day window.

Tradeoffs:

- Shorter retention, such as `72h`, is safer on a 40 GB VPS or noisy preview
  host.
- Longer retention, such as `336h`, is useful for low-volume production but can
  crowd PostgreSQL backups, Docker layers, and Coolify data.
- Filesystem Loki does not delete based on free disk percentage. It deletes by
  retention age, so host disk alerts and backups still matter.
- Keep identifiers as structured metadata, not labels, to avoid large indexes.
- Avoid `LOG_LEVEL=debug` in production unless investigating a short-lived
  incident.

If disk pressure appears, first reduce `limits_config.retention_period` and
`max_query_lookback` in `observability/loki/loki.yaml`, restart Loki, and give
the compactor time to delete old chunks. If the host is already critically full,
stop the observability stack before trimming Docker images or volumes so
PopChoice storage and backups are not competing with new log writes.

## Security notes

- The compose file binds Grafana, Loki, and Alloy to `127.0.0.1` for local use.
  Put Grafana behind Coolify auth, a VPN, or an SSH tunnel before exposing it.
- Alloy mounts `/var/run/docker.sock` read-only, but Docker socket access is
  still sensitive. Do not publish the Alloy UI publicly.
- Loki runs without tenant auth because it is private to the compose network.
  Put an authenticating reverse proxy in front of it if it ever leaves the host.
