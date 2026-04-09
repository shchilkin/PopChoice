/**
 * Structured JSON logger for the movie-seed service.
 * Outputs structured JSON to stdout — compatible with Railway log aggregation.
 *
 * Wraps Pino to accept the (message, fields?) call signature used across this
 * service, adapting it to Pino's native (fields, message) order so that all
 * extra fields are emitted as structured JSON.
 */
import pino from 'pino';

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

type LogFields = Record<string, unknown>;
type PinoLogMethod = (objOrMsg: object | string, msg?: string, ...args: unknown[]) => void;

// Bind methods once to avoid repeated function allocation on every log call
const boundTrace = baseLogger.trace.bind(baseLogger) as PinoLogMethod;
const boundDebug = baseLogger.debug.bind(baseLogger) as PinoLogMethod;
const boundInfo = baseLogger.info.bind(baseLogger) as PinoLogMethod;
const boundWarn = baseLogger.warn.bind(baseLogger) as PinoLogMethod;
const boundError = baseLogger.error.bind(baseLogger) as PinoLogMethod;
const boundFatal = baseLogger.fatal.bind(baseLogger) as PinoLogMethod;

function logWithFields(method: PinoLogMethod, message: string, extra?: LogFields): void {
  if (extra !== undefined) {
    method(extra, message);
  } else {
    method(message);
  }
}

export const logger = {
  trace(message: string, extra?: LogFields): void {
    logWithFields(boundTrace, message, extra);
  },
  debug(message: string, extra?: LogFields): void {
    logWithFields(boundDebug, message, extra);
  },
  info(message: string, extra?: LogFields): void {
    logWithFields(boundInfo, message, extra);
  },
  warn(message: string, extra?: LogFields): void {
    logWithFields(boundWarn, message, extra);
  },
  error(message: string, extra?: LogFields): void {
    logWithFields(boundError, message, extra);
  },
  fatal(message: string, extra?: LogFields): void {
    logWithFields(boundFatal, message, extra);
  },
};

