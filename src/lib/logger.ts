import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Defensive redaction to avoid leaking secrets if request/metadata objects are logged.
  redact: {
    paths: [
      'authorization',
      'Authorization',
      'Cookie',
      'headers.authorization',
      'headers.Authorization',
      'headers.cookie',
      'headers.Cookie',
      'req.headers.authorization',
      'req.headers.Authorization',
      'req.headers.cookie',
      'req.headers.Cookie',
      'apiKey',
      'api_key',
      'password',
      'token',
      'secret',
      '*.apiKey',
      '*.api_key',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export default logger;
