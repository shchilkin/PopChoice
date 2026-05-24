# Observability Traces

PopChoice can emit OpenTelemetry traces to the self-hosted observability stack:

```text
web/workers -> OpenTelemetry Collector -> Tempo -> Grafana
```

Tracing is optional and is disabled unless `TRACING_ENABLED` is truthy or an
OTLP endpoint is configured.

## Local Stack

Start the observability services:

```bash
GRAFANA_ADMIN_PASSWORD=local docker compose -f docker-compose.observability.yml up -d
```

Then run web/workers with tracing enabled:

```bash
TRACING_ENABLED=1 \
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces \
TRACING_SAMPLE_RATE=1 \
npm run dev --workspace=apps/web

TRACING_ENABLED=1 \
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces \
TRACING_SAMPLE_RATE=1 \
npm run start:workers --workspace=apps/web
```

Open Grafana at <http://127.0.0.1:3001>, choose the Tempo datasource, and
search by service name:

- `popchoice-web`
- `popchoice-workers`

## Production Settings

Coolify services expose these environment variables:

| Variable                             | Purpose                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `TRACING_ENABLED`                    | Enables SDK startup for web and workers. Defaults to `false`.                              |
| `TRACING_SAMPLE_RATE`                | Root trace sample rate from `0` to `1`. Defaults to `0.05` in production.                  |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | Collector HTTP endpoint. Defaults to `http://observability-otel-collector:4318/v1/traces`. |
| `OTEL_SERVICE_NAME`                  | Optional service override. Defaults to `popchoice-web` or `popchoice-workers`.             |
| `OTEL_DIAG_LOG_LEVEL`                | Optional SDK diagnostics: `error`, `warn`, `info`, `debug`, `verbose`, or `none`.          |

Keep production sampling conservative. Increase `TRACING_SAMPLE_RATE` briefly
when debugging a live incident, then lower it again.

## What Gets Traced

Automatic instrumentation covers:

- HTTP server/client spans
- `fetch`/Undici calls to OpenAI, TMDB, Resend, and other HTTP services
- PostgreSQL queries through `pg`
- Redis and BullMQ Redis calls through `ioredis`

Manual spans add recommendation-specific correlation:

- `/api/recommendations` creation
- legacy `/api/movie-recommendation` processing
- recommendation queue enqueue and worker processing
- more-picks enqueue and worker processing
- catalog-maintenance enqueue and worker processing
- movie-seed enqueue and worker processing

Manual span attributes are intentionally low-cardinality:

- `recommendation.id`
- `recommendation.slug`
- `recommendation.stage`
- `recommendation.mode`
- `job.id`
- `job.name`
- `messaging.destination.name`

## Sensitive Data

Do not add prompt text, quiz answers, user profile fields, API keys, or raw
provider payloads as span attributes. The current instrumentation records IDs,
stage names, counts, queue names, route names, and provider URLs with sensitive
query keys redacted.

PostgreSQL tracing keeps `enhancedDatabaseReporting` disabled, so query
parameter values are not attached to spans.

## Debugging A Slow Recommendation

1. Search Tempo for `service.name = popchoice-web` and route
   `/api/recommendations`.
2. Open the `api.recommendations.create` span and note
   `recommendation.slug` or `recommendation.id`.
3. Follow the child `recommendation.enqueue` span into
   `recommendation.worker.process`.
4. Inspect child spans for `pg`, Redis/BullMQ, OpenAI, and TMDB latency.
5. Use the same `recommendation.id` or `job.id` in Loki logs and the
   Prometheus dashboard.

If a worker trace is missing, check:

- `TRACING_ENABLED` is enabled for the workers service.
- The worker can reach `observability-otel-collector:4318`.
- `TRACING_SAMPLE_RATE` did not sample out the root trace.

## Retention

Tempo retention is currently `48h` in `observability/tempo/tempo.yaml`. This is
short by design for a pet project: traces are high-volume and mostly useful
while debugging recent behavior. Long-term health trends belong in Prometheus
metrics and Loki logs.
