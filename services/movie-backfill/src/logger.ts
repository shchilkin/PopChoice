/**
 * Structured JSON logger for the movie-backfill service.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, message: string, extra?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
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
