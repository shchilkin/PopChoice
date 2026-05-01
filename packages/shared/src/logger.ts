import pino from 'pino';

const baseLogger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

type LogFields = Record<string, unknown>;
type PinoLogMethod = (objOrMsg: object | string, msg?: string) => void;

const boundTrace = baseLogger.trace.bind(baseLogger) as PinoLogMethod;
const boundDebug = baseLogger.debug.bind(baseLogger) as PinoLogMethod;
const boundInfo = baseLogger.info.bind(baseLogger) as PinoLogMethod;
const boundWarn = baseLogger.warn.bind(baseLogger) as PinoLogMethod;
const boundError = baseLogger.error.bind(baseLogger) as PinoLogMethod;
const boundFatal = baseLogger.fatal.bind(baseLogger) as PinoLogMethod;

function log(method: PinoLogMethod, message: string, extra?: LogFields): void {
  extra !== undefined ? method(extra, message) : method(message);
}

export const logger = {
  trace(message: string, extra?: LogFields): void {
    log(boundTrace, message, extra);
  },
  debug(message: string, extra?: LogFields): void {
    log(boundDebug, message, extra);
  },
  info(message: string, extra?: LogFields): void {
    log(boundInfo, message, extra);
  },
  warn(message: string, extra?: LogFields): void {
    log(boundWarn, message, extra);
  },
  error(message: string, extra?: LogFields): void {
    log(boundError, message, extra);
  },
  fatal(message: string, extra?: LogFields): void {
    log(boundFatal, message, extra);
  },
};
