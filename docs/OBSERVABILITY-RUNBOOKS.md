# Observability Runbooks

These runbooks pair with the provisioned Grafana alerts in
`observability/grafana/provisioning/alerting/popchoice-alerts.yaml`. They are
written for a small self-hosted VPS/Coolify deployment where one operator may
own app, database, and infrastructure response.

## General Triage

1. Check whether this is user-facing:
   - open the app
   - open `/api/health`
   - check Uptime Kuma and Coolify health
2. Check Grafana dashboards:
   - PopChoice Overview
   - logs in Loki if available
   - Prometheus targets page
3. Check recent changes:
   - latest deploy
   - migrations
   - environment variable edits
   - catalog/backfill jobs
4. Prefer reversible actions:
   - pause noisy workers before killing data stores
   - restart one service at a time
   - keep logs before pruning or recreating containers

## App Down

Owner: App operator.

Symptoms:

- Grafana alert: `P1 App metrics target down`.
- `/api/health` fails or times out.
- Coolify shows the web container unhealthy or restarting.

Immediate checks:

```bash
docker ps --filter name=popchoice
docker logs --tail=200 <web-container>
curl -i https://your-domain.example/api/health
```

Actions:

1. Check Coolify deployment status and whether the latest image pulled
   successfully.
2. Check web logs for startup validation errors, missing env vars, migration
   failures, or unhandled runtime exceptions.
3. Check `/api/build` if the app responds but looks like the wrong version.
4. Check DB and Redis health because `/api/health` depends on both.
5. If the latest deploy caused the outage, roll back to the last known good
   image tag.

Recovery check:

- `/api/health` returns `200`.
- Prometheus target `popchoice-web` is up.
- A cheap recommendation smoke flow reaches a persisted result without live
  provider spending unless explicitly intended.

## DB Down

Owner: Database operator.

Symptoms:

- Grafana alert: `P1 Postgres exporter reports database down`.
- `/api/health` reports database failure.
- App logs show connection, migration, or query errors.

Immediate checks:

```bash
docker ps --filter name=db
docker logs --tail=200 <db-container>
docker exec -it <db-container> pg_isready -U popchoice
df -h
```

Actions:

1. Check disk pressure first; Postgres can fail or become read-only when the
   host is full.
2. Check whether credentials changed in Coolify without restarting all
   dependent services.
3. Check recent migrations and startup logs.
4. If the DB container is restarting, inspect the earliest startup error, not
   only the latest health check line.
5. Restore from the latest verified database backup only after confirming the
   volume is corrupted or missing.

Recovery check:

- `pg_isready` succeeds.
- `/api/health` returns `200`.
- The Postgres exporter reports `pg_up == 1`.
- App reads existing recommendations and can create a new deterministic/local
  recommendation job.

## Redis Down

Owner: App operator.

Symptoms:

- Grafana alert: `P1 Redis exporter reports Redis down`.
- `/api/health` reports Redis failure.
- Workers stop processing BullMQ jobs.
- Bull Board cannot load queues.

Immediate checks:

```bash
docker ps --filter name=redis
docker logs --tail=200 <redis-container>
docker exec -it <redis-container> redis-cli ping
df -h
```

Actions:

1. Check Redis memory and disk pressure.
2. Check whether the Redis container restarted and lost in-memory queued work.
3. Restart workers after Redis recovers so BullMQ connections reconnect cleanly.
4. Inspect Bull Board for delayed or failed jobs after recovery.

Recovery check:

- `redis-cli ping` returns `PONG`.
- `/api/health` returns `200`.
- Redis exporter reports `redis_up == 1`.
- Queue depths stop growing and workers process jobs.

## Stuck Queues

Owner: App operator.

Symptoms:

- Grafana alert: `P2 BullMQ queue backlog sustained`.
- Bull Board shows waiting or delayed jobs that do not drain.
- Recommendation results remain pending.

Immediate checks:

```bash
docker logs --tail=300 <workers-container>
docker logs --tail=200 <redis-container>
```

Actions:

1. Open Bull Board and identify the affected queue and job type.
2. Check worker logs for repeated provider timeouts, DB errors, validation
   errors, or final failures.
3. Check Redis health and memory.
4. If provider timeouts are driving retries, pause catalog/backfill or lower
   worker concurrency before retrying.
5. Retry only jobs whose failure cause is understood. Do not bulk retry unknown
   failures if they can spend AI credits or hammer TMDB.

Recovery check:

- Waiting and delayed queue depth trends downward.
- Active jobs appear and complete.
- Final failure count does not keep increasing.
- New recommendation jobs complete within normal latency.

## TMDB/OpenAI Timeout Spike

Owner: App operator.

Symptoms:

- Grafana alert: `P2 Provider timeout or rate-limit spike`.
- Logs show OpenAI or TMDB timeouts, `429`, or upstream HTTP failures.
- Recommendation latency increases or queue backlog grows.

Immediate checks:

```bash
docker logs --tail=300 <web-container>
docker logs --tail=300 <workers-container>
```

Actions:

1. Check provider status pages and account/API key limits.
2. Check recent traffic, backfill, discovery, or maintenance jobs that may have
   increased request volume.
3. Pause or slow catalog-maintenance workers if TMDB is rate-limiting.
4. Avoid live AI evals while OpenAI errors are elevated.
5. If only one feature path is failing, keep unrelated workers running and
   isolate the failing queue/job type.

Recovery check:

- Provider error increase slows to near zero.
- Queue backlog drains.
- Deterministic recommendation eval still passes locally/CI.
- Optional live-provider validation is run only when explicitly desired.

## Disk Pressure

Owner: Infrastructure operator.

Symptoms:

- Grafana alert: `P2 Host disk usage high`.
- Postgres, Prometheus, Loki, or Docker logs fail to write.
- Containers restart or fail with no space errors.

Immediate checks:

```bash
df -h
docker system df
du -h -d 1 /var/lib/docker 2>/dev/null | sort -h
```

Actions:

1. Confirm the latest app and database backups exist before deleting anything
   important.
2. Prune unused Docker images and build cache if safe for the host.
3. Reduce log growth or retention if Loki/Docker logs are the largest consumer.
4. Expand the VPS disk if normal retention no longer fits.
5. Restart services that failed because writes were denied.

Recovery check:

- Disk usage is below 85%.
- Postgres and Redis health checks pass.
- Prometheus and Loki are ingesting again.

## Monitoring Stack Down

Owner: Infrastructure operator.

Symptoms:

- Grafana alert: `P3 Monitoring scrape target down`.
- Grafana dashboards stop updating.
- Prometheus targets show exporters down.
- Uptime Kuma or Coolify shows Grafana/Prometheus/Loki unhealthy.

Immediate checks:

```bash
docker compose -f docker-compose.observability.yml ps
docker compose -f docker-compose.observability.yml logs --tail=200 observability-prometheus
docker compose -f docker-compose.observability.yml logs --tail=200 observability-grafana
```

Actions:

1. Check whether the observability stack can reach the PopChoice app network.
2. Check `METRICS_BEARER_TOKEN`, exporter credentials, and
   `POPCHOICE_APP_NETWORK`.
3. Restart the failed observability service.
4. If Prometheus data is missing but config is intact, prefer restoring from
   Git and accepting a metrics gap over risky volume surgery.
5. If Grafana provisioning fails on startup, validate the changed YAML before
   starting the stack again.

Recovery check:

- Grafana opens.
- Prometheus `/targets` shows expected targets up.
- PopChoice Overview panels update.
- Alert rules are visible under the `PopChoice Alerts` folder.

## Backup Restore Drill

Owner: Infrastructure operator.

Run after alerting/provisioning changes and before relying on a new VPS setup:

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

Expected result: no `diff` output for the restored observability config. If the
archive cannot recreate Grafana provisioning files, do not deploy the config.
