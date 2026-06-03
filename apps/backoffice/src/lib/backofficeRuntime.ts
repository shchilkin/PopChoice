import {
  ensureCatalogRepairActionSchema,
  ensureTMDBMatchReviewActionSchema,
  initDatabase,
  logger,
  readBackofficeRuntimeConfig,
} from '@pop-choice/shared';
import type { BackofficeRuntimeConfig } from '@pop-choice/shared';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  year: 'numeric',
});

let cachedConfig: BackofficeRuntimeConfig | null = null;
let initialization: Promise<BackofficeRuntimeConfig> | null = null;

export function getBackofficeErrorStatus(error: unknown): number {
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;

  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600 ? statusCode : 500;
}

export function backofficeActionError(
  message: string,
  statusCode = 400,
): Error & { publicMessage: string; statusCode: number } {
  const error = new Error(message) as Error & { publicMessage: string; statusCode: number };
  error.publicMessage = message;
  error.statusCode = statusCode;
  return error;
}

export function getBackofficeConfig(): BackofficeRuntimeConfig {
  cachedConfig ??= readBackofficeRuntimeConfig();
  return cachedConfig;
}

export async function ensureBackofficeReady(): Promise<BackofficeRuntimeConfig> {
  if (!initialization) {
    initialization = (async () => {
      try {
        const config = getBackofficeConfig();
        initDatabase(config.databaseUrl);
        await ensureCatalogRepairActionSchema();
        await ensureTMDBMatchReviewActionSchema();
        return config;
      } catch (error) {
        initialization = null;
        throw error;
      }
    })();
  }

  return initialization;
}

export function formatBackofficeDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const raw =
    value instanceof Date
      ? Number.isFinite(value.getTime())
        ? value.toISOString()
        : '-'
      : value.trim();
  if (raw === '-') return raw;

  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  normalized = normalized.replace(/([+-]\d{2})$/, '$1:00');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return raw;
  return DATE_TIME_FORMATTER.format(date);
}

export function parseOperatorActor(headers: Headers): string {
  const header = headers.get('authorization');
  if (!header?.startsWith('Basic ')) return 'anonymous-operator';

  try {
    const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
    return username.trim() || 'anonymous-operator';
  } catch {
    return 'anonymous-operator';
  }
}

export function parseBackofficeReturnPath(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/';

  const trimmed = value.trim();
  if (trimmed === '' || !trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';

  try {
    const base = 'https://backoffice.local';
    const url = new URL(trimmed, base);
    if (url.origin !== base) return '/';

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export function logBackofficeError(message: string, error: unknown): void {
  logger.error(message, { err: error });
}
