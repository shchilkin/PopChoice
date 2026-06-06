import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const migrationsDir = path.join(repoRoot, 'db', 'init');
const envFiles = [path.join(process.cwd(), '.env'), path.join(repoRoot, '.env')];
const connectAttempts = Number.parseInt(process.env.DB_MIGRATION_CONNECT_ATTEMPTS ?? '20', 10);
const connectDelayMs = Number.parseInt(process.env.DB_MIGRATION_CONNECT_DELAY_MS ?? '3000', 10);
const transientConnectionCodes = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '57P03',
]);

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? (await resolveDatabaseUrl());
  if (!databaseUrl) {
    console.warn('[db:migrate] DATABASE_URL is not set, skipping migrations.');
    return;
  }

  const client = await connectWithRetry(databaseUrl);

  try {
    await applyMigrations(client, await readMigrationFileNames());
    console.log('[db:migrate] Migrations complete.');
  } finally {
    await client.end();
  }
}

async function readMigrationFileNames() {
  return (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));
}

async function applyMigrations(client, files) {
  await client.query('BEGIN');
  try {
    await runMigrationFiles(client, files);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function runMigrationFiles(client, files) {
  for (const fileName of files) {
    await applyMigrationFile(client, fileName);
  }
}

async function applyMigrationFile(client, fileName) {
  const filePath = path.join(migrationsDir, fileName);
  const sql = await readFile(filePath, 'utf8');
  console.log(`[db:migrate] Applying ${fileName}`);
  await client.query(sql);
}

async function connectWithRetry(databaseUrl) {
  const attempts = normalizePositiveInteger(connectAttempts, 20);
  const delayMs = normalizePositiveInteger(connectDelayMs, 3000);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await tryConnect(databaseUrl, attempt);
    if (result.client) {
      return result.client;
    }

    lastError = result.error;
    await waitBeforeRetry(result.error, { attempt, attempts, delayMs });
  }

  throw lastError;
}

async function tryConnect(databaseUrl, attempt) {
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    logSuccessfulRetry(attempt);
    return { client };
  } catch (error) {
    await client.end().catch(() => {});
    return { error };
  }
}

async function waitBeforeRetry(error, { attempt, attempts, delayMs }) {
  if (!shouldRetryConnection(error, attempt, attempts)) {
    throw error;
  }

  console.warn(
    `[db:migrate] Database connection failed (${formatConnectionError(error)}). Retrying in ${
      delayMs / 1000
    }s (${attempt}/${attempts})...`,
  );
  await sleep(delayMs);
}

function shouldRetryConnection(error, attempt, attempts) {
  return isTransientConnectionError(error) && attempt < attempts;
}

function logSuccessfulRetry(attempt) {
  if (attempt > 1) {
    console.log(`[db:migrate] Connected to database on attempt ${attempt}.`);
  }
}

function normalizePositiveInteger(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isTransientConnectionError(error) {
  return Boolean(error && transientConnectionCodes.has(error.code));
}

function formatConnectionError(error) {
  return getErrorCode(error) ?? getErrorMessage(error) ?? 'unknown error';
}

function getErrorCode(error) {
  return error?.code;
}

function getErrorMessage(error) {
  return error?.message;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveDatabaseUrl() {
  for (const envFile of envFiles) {
    const databaseUrl = await readDatabaseUrlFromEnvFile(envFile);
    if (databaseUrl) return databaseUrl;
  }

  return null;
}

async function readDatabaseUrlFromEnvFile(envFile) {
  try {
    const content = await readFile(envFile, 'utf8');
    return extractDatabaseUrl(content);
  } catch {
    return null;
  }
}

function extractDatabaseUrl(content) {
  const match = content.match(/^DATABASE_URL=(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

main().catch((error) => {
  console.error('[db:migrate] Failed to apply migrations.');
  console.error(error);
  process.exit(1);
});
