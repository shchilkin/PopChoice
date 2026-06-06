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

const DIAG_LOG_LEVEL_BY_NAME: Record<string, DiagLogLevel> = {
  debug: DiagLogLevel.DEBUG,
  error: DiagLogLevel.ERROR,
  info: DiagLogLevel.INFO,
  none: DiagLogLevel.NONE,
  verbose: DiagLogLevel.VERBOSE,
  warn: DiagLogLevel.WARN,
};

export function initTracing(service: RuntimeService): void {
  if (!isTracingEnabled()) return;

  const state = (globalTracingState.__popChoiceTracing ??= { started: false });
  if (state.started) return;

  const config = getTracingConfig(service);
  configureDiagLogger();
  const sdk = createTracingSdk(config);

  sdk.start();
  state.sdk = sdk;
  state.started = true;

  logger.info(config, 'OpenTelemetry tracing initialized');

  process.once('beforeExit', () => {
    void shutdownTracing();
  });
}

function getTracingConfig(service: RuntimeService) {
  return {
    endpoint: resolveTraceEndpoint(),
    sampleRate: parseSampleRate(),
    service,
  };
}

function configureDiagLogger() {
  const logLevel = process.env.OTEL_DIAG_LOG_LEVEL;
  if (!logLevel) return;

  diag.setLogger(new DiagConsoleLogger(), parseDiagLogLevel(logLevel));
}

function createTracingSdk({
  endpoint,
  sampleRate,
  service,
}: {
  endpoint: string;
  sampleRate: number;
  service: RuntimeService;
}) {
  return new NodeSDK({
    instrumentations: createInstrumentations(),
    resource: resourceFromAttributes(getResourceAttributes(service)),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(sampleRate),
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
  });
}

function getResourceAttributes(service: RuntimeService) {
  return {
    'deployment.environment': process.env.NODE_ENV ?? 'development',
    'service.instance.id': process.env.HOSTNAME,
    'service.name': process.env.OTEL_SERVICE_NAME ?? `popchoice-${service}`,
    'service.namespace': 'popchoice',
    'service.version': process.env.APP_VERSION ?? 'development',
  };
}

function createInstrumentations() {
  return [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: shouldIgnoreIncomingRequest,
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
  ];
}

function shouldIgnoreIncomingRequest(req: { url?: string | undefined }) {
  const url = req.url ?? '';
  return url.startsWith('/api/metrics') || url.startsWith('/_next/');
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
  const raw = getSampleRateRawValue();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? clampSampleRate(parsed) : getDefaultSampleRate();
}

function getSampleRateRawValue(): string {
  return (
    process.env.TRACING_SAMPLE_RATE ??
    process.env.OTEL_TRACES_SAMPLER_ARG ??
    String(getDefaultSampleRate())
  );
}

function getDefaultSampleRate() {
  return process.env.NODE_ENV === 'production' ? 0.05 : 1;
}

function clampSampleRate(value: number) {
  return Math.max(0, Math.min(value, 1));
}

function parseDiagLogLevel(raw: string): DiagLogLevel {
  return DIAG_LOG_LEVEL_BY_NAME[raw.toLowerCase()] ?? DiagLogLevel.ERROR;
}
