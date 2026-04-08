/**
 * Pino logger for the movie-sync service.
 * Outputs structured JSON to stdout — compatible with Railway log aggregation.
 */
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

