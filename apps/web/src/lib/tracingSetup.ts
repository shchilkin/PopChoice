import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

import logger from '@/lib/logger';

type PopChoiceTracingState = {
  sdk?: NodeSDK;
  started: boolean;
};

type RuntimeService = 'web' | 'workers';

const globalTracingState = globalThis as typeof globalThis & {
  __popChoiceTracing?: PopChoiceTracingState;
};

export function initTracing(service: RuntimeService): void {
  if (!isTracingEnabled()) return;

  const state = (globalTracingState.__popChoiceTracing ??= { started: false });
  if (state.started) return;

  const endpoint = resolveTraceEndpoint();
  const sampleRate = parseSampleRate();

  if (process.env.OTEL_DIAG_LOG_LEVEL) {
    diag.setLogger(new DiagConsoleLogger(), parseDiagLogLevel(process.env.OTEL_DIAG_LOG_LEVEL));
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': process.env.OTEL_SERVICE_NAME ?? `popchoice-${service}`,
      'service.namespace': 'popchoice',
      'service.version': process.env.APP_VERSION ?? 'development',
      'service.instance.id': process.env.HOSTNAME,
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(sampleRate),
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (req) => {
          const url = req.url ?? '';
          return url.startsWith('/api/metrics') || url.startsWith('/_next/');
        },
        redactedQueryParams: ['token', 'api_key', 'key', 'signature', 'sig'],
      }),
      new UndiciInstrumentation({
        requireParentforSpans: true,
      }),
      new PgInstrumentation({
        enhancedDatabaseReporting: false,
        requireParentSpan: true,
      }),
      new IORedisInstrumentation({
        requireParentSpan: true,
      }),
    ],
  });

  sdk.start();
  state.sdk = sdk;
  state.started = true;

  logger.info({ endpoint, sampleRate, service }, 'OpenTelemetry tracing initialized');

  process.once('beforeExit', () => {
    void shutdownTracing();
  });
}

export async function shutdownTracing(): Promise<void> {
  const state = globalTracingState.__popChoiceTracing;
  if (!state?.started || !state.sdk) return;

  const sdk = state.sdk;
  state.sdk = undefined;
  state.started = false;
  await sdk.shutdown();
}

function isTracingEnabled(): boolean {
  const raw = process.env.TRACING_ENABLED;
  if (raw) return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());

  return Boolean(
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  );
}

function resolveTraceEndpoint(): string {
  const traceEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (traceEndpoint) return traceEndpoint;

  const baseEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!baseEndpoint) return 'http://127.0.0.1:4318/v1/traces';

  if (baseEndpoint.endsWith('/v1/traces')) return baseEndpoint;
  return `${baseEndpoint.replace(/\/$/, '')}/v1/traces`;
}

function parseSampleRate(): number {
  const raw =
    process.env.TRACING_SAMPLE_RATE ??
    process.env.OTEL_TRACES_SAMPLER_ARG ??
    (process.env.NODE_ENV === 'production' ? '0.05' : '1');
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return process.env.NODE_ENV === 'production' ? 0.05 : 1;
  return Math.max(0, Math.min(parsed, 1));
}

function parseDiagLogLevel(raw: string): DiagLogLevel {
  switch (raw.toLowerCase()) {
    case 'debug':
      return DiagLogLevel.DEBUG;
    case 'info':
      return DiagLogLevel.INFO;
    case 'warn':
      return DiagLogLevel.WARN;
    case 'error':
      return DiagLogLevel.ERROR;
    case 'verbose':
      return DiagLogLevel.VERBOSE;
    case 'none':
      return DiagLogLevel.NONE;
    default:
      return DiagLogLevel.ERROR;
  }
}
