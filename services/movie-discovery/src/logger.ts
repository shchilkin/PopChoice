/**
 * Structured JSON logger for the movie-discovery service.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'apikey',
  'api_key',
  'password',
  'token',
  'secret',
  'authorization',
]);

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value,
    ]),
  );
}

function formatEntry(level: LogLevel, message: string, extra?: Record<string, unknown>): string {
  const safeExtra = extra !== undefined ? redactSensitiveFields(extra) : undefined;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeExtra,
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, extra?: Record<string, unknown>): void {
    console.log(formatEntry('info', message, extra));
  },

  warn(message: string, extra?: Record<string, unknown>): void {
    console.warn(formatEntry('warn', message, extra));
  },

  error(message: string, extra?: Record<string, unknown>): void {
    console.error(formatEntry('error', message, extra));
  },

  debug(message: string, extra?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(formatEntry('debug', message, extra));
    }
  },
};
