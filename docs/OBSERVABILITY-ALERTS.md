# Observability Alerts, Retention, and Backups

PopChoice provisions a first conservative set of Grafana-managed alerts for the
self-hosted observability stack. The goal is to catch actionable failures
without creating noisy paging habits while the project is still small.

## Files

- `observability/grafana/provisioning/alerting/popchoice-alerts.yaml` provisions
  Grafana alert rules.
- `observability/images/grafana/entrypoint.sh` optionally provisions the
  `popchoice-telegram` contact point, notification policy, and Telegram message
  template when Telegram env vars are present.
- `docs/OBSERVABILITY-RUNBOOKS.md` explains how to respond to each alert family.
- `docs/OBSERVABILITY-METRICS.md` documents the metrics used by these alerts.

Grafana loads the alerting provisioning directory from the observability
Grafana config image built by `docker-compose.observability.yml`.

## Severity Groups

Alert rules are grouped by severity in Grafana:

| Severity | Meaning                                            | Default action                        |
| -------- | -------------------------------------------------- | ------------------------------------- |
| `p1`     | User-facing or core dependency outage.             | Investigate immediately when noticed. |
| `p2`     | Sustained degradation that can become an outage.   | Investigate the same day.             |
| `p3`     | Monitoring or quality signal that needs follow-up. | Triage during normal maintenance.     |

Every rule includes:

- `severity` and `owner` labels.
- `owner`, `action`, and `runbook_url` annotations.
- Conservative `for` windows and thresholds.
- `noDataState: OK` for application/dependency rules so a fresh or partially
  deployed stack does not fire before metrics exist.

Telegram notifications are provisioned automatically when both env vars are set
on the observability resource:

```env
GRAFANA_TELEGRAM_BOT_TOKEN=<telegram-bot-token>
GRAFANA_TELEGRAM_CHAT_ID=<telegram-chat-id>
```

When either value is missing, Grafana starts without external receivers and
alerts remain visible in the UI. The generated `popchoice-telegram` policy
groups notifications by folder, alert name, and severity. After enabling it, use
Grafana's contact point **Test** action before relying on alert delivery.

Telegram messages use the `popchoice.telegram.message` template instead of
Grafana's default message. The message is plain text and includes:

- `FIRING` or `RESOLVED` plus the alert name.
- Severity and summary when the alert provides them.
- Firing and resolved alert instances with target labels and values when
  available.
- Silence, runbook, dashboard, and Grafana links when Grafana provides them.

Set `GF_SERVER_ROOT_URL` on the Grafana service if Telegram links should point
to the public Grafana domain instead of the container-local default URL.

## Alert Rules

### P1

- `P1 App metrics target down`
  - Owner: App operator.
  - Trigger: `popchoice-web` scrape target stays down for 5 minutes.
  - Action: check Coolify web service, restart loops, recent deploy, and
    `/api/health`.
- `P1 Postgres exporter reports database down`
  - Owner: Database operator.
  - Trigger: `pg_up` stays below 1 for 5 minutes.
  - Action: check the DB container, disk, credentials, and recent migrations.
- `P1 Redis exporter reports Redis down`
  - Owner: App operator.
  - Trigger: `redis_up` stays below 1 for 5 minutes.
  - Action: check Redis, workers, Bull Board, and memory or disk pressure.

### P2

- `P2 BullMQ queue backlog sustained`
  - Owner: App operator.
  - Trigger: waiting plus delayed jobs stay above 25 for 30 minutes.
  - Action: check workers, Redis, provider errors, failed jobs, and retry state.
- `P2 Provider timeout or rate-limit spike`
  - Owner: App operator.
  - Trigger: OpenAI or TMDB timeout/rate-limit events exceed 10 in 30 minutes
    and remain elevated for 10 minutes.
  - Action: check provider status, credentials, rate limits, and whether to
    pause workers or lower catalog/backfill limits.
- `P2 Host disk usage high`
  - Owner: Infrastructure operator.
  - Trigger: non-temporary host filesystem usage stays above 90% for 30 minutes.
  - Action: clean old Docker images/logs, verify backup size, and expand disk.

### P3

- `P3 Monitoring scrape target down`
  - Owner: Infrastructure operator.
  - Trigger: cAdvisor, node exporter, Postgres exporter, or Redis exporter stays
    down for 15 minutes.
  - Action: restart the exporter or observability service and verify dashboards.
- `P3 Recommendation failure ratio elevated`
  - Owner: App operator.
  - Trigger: more than half of recent recommendations fail after at least 10
    attempts in 15 minutes.
  - Action: inspect provider errors, worker logs, recent deploys, database
    health, and eval results.

## Retention Expectations

Prometheus is configured with `--storage.tsdb.retention.time=15d`. This is
enough for local incident debugging without letting metrics grow forever on a
small VPS. Grafana dashboard and alert definitions are treated as source code
and restored from Git.

Loki retention is configured separately in `observability/loki/loki.yaml`; keep
log retention short enough for VPS disk size. Uptime Kuma data and Grafana's
SQLite database live in Docker volumes and should be considered convenience
state, not the source of truth for provisioned config.

## Backup Expectations

Back up two layers:

1. Source-controlled config:
   - `docker-compose.observability.yml`
   - `observability/prometheus`
   - `observability/grafana/provisioning`
   - `observability/grafana/dashboards`
   - `observability/loki`
   - `observability/alloy`
   - observability docs
2. Runtime volumes:
   - `prometheusdata`
   - `grafanadata`
   - `lokidata`
   - `tempodata`
   - `alloydata`
   - `uptime-kuma-data`

For this project, config restore is the hard requirement because dashboards,
datasources, and alert rules are provisioned from Git. Runtime volume backups
are best-effort unless the VPS setup already provides volume snapshots.

## Config-Level Restore Test

Test config-level restore after changing observability provisioning:

```bash
restore_dir="$(mktemp -d /tmp/popchoice-observability-restore.XXXXXX)"
tar -cf "$restore_dir/observability-config.tar" \
  docker-compose.observability.yml \
  observability/prometheus \
  observability/grafana/provisioning \
  observability/grafana/dashboards \
  observability/loki \
  observability/alloy \
  docs/OBSERVABILITY-*.md
mkdir "$restore_dir/restored"
tar -xf "$restore_dir/observability-config.tar" -C "$restore_dir/restored"
diff -qr observability "$restore_dir/restored/observability"
diff -q docker-compose.observability.yml "$restore_dir/restored/docker-compose.observability.yml"
```

The restore test should complete with no `diff` output for the backed-up
observability config. If docs changed outside `OBSERVABILITY-*.md`, include
those docs explicitly in the archive command before testing.

## First-Version Noise Policy

This first alert set avoids:

- per-request or per-user labels
- short windows under 5 minutes for outage alerts
- queue alerts on single failed jobs
- provider alerts on isolated timeout blips
- required external notification env vars that would prevent Grafana from
  starting when Telegram has not been configured yet

Tighten thresholds only after observing a few weeks of real traffic and
maintenance patterns.
