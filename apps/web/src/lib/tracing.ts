import {
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Attributes,
  type Context,
  type Span,
} from '@opentelemetry/api';

const TRACER_NAME = 'popchoice';

export type TraceCarrier = {
  traceparent?: string;
  tracestate?: string;
};

type TraceSpanOptions = {
  attributes?: Attributes;
  carrier?: TraceCarrier;
};

export function getTraceCarrier(): TraceCarrier | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  if (!carrier.traceparent) return undefined;

  return {
    traceparent: carrier.traceparent,
    tracestate: carrier.tracestate,
  };
}

export async function withTraceSpan<T>(
  name: string,
  options: TraceSpanOptions,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const parentContext = options.carrier ? extractTraceContext(options.carrier) : context.active();
  const attributes = cleanAttributes(options.attributes);

  return trace
    .getTracer(TRACER_NAME)
    .startActiveSpan(name, { attributes }, parentContext, async (span) => {
      try {
        const result = await fn(span);
        return result;
      } catch (err) {
        recordSpanError(span, err);
        throw err;
      } finally {
        span.end();
      }
    });
}

export function setActiveTraceAttributes(attributes: Attributes): void {
  const span = trace.getActiveSpan();
  if (!span) return;

  for (const [key, value] of Object.entries(cleanAttributes(attributes))) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
}

function extractTraceContext(carrier: TraceCarrier): Context {
  return propagation.extract(context.active(), carrier);
}

function recordSpanError(span: Span, err: unknown): void {
  if (err instanceof Error) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    return;
  }

  span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
}

function cleanAttributes(attributes: Attributes = {}): Attributes {
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined && value !== null),
  );
}
