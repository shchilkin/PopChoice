// Applies all SQL files from db/init/ against the database at DATABASE_URL.
// Runs all migrations in a single transaction — rolls back everything on failure.
// Designed to run as a one-shot deployment job before the web app starts.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dockerfile copies db/init/ to /app/db/init — two levels above this script.
const migrationsDir = path.resolve(__dirname, '../../db/init');

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[db:migrate] DATABASE_URL is not set.');
    process.exit(1);
  }

  return databaseUrl;
}

async function listMigrationFiles() {
  return (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

async function applyMigrationFile(client, fileName) {
  console.log(`[db:migrate] Applying ${fileName}`);
  await client.query(await readFile(path.join(migrationsDir, fileName), 'utf8'));
}

async function applyMigrations(client, files) {
  await client.query('BEGIN');
  let committed = false;
  try {
    for (const fileName of files) {
      await applyMigrationFile(client, fileName);
    }
    await client.query('COMMIT');
    committed = true;
  } catch (err) {
    throw err;
  } finally {
    if (!committed) await client.query('ROLLBACK');
  }
}

async function main() {
  const databaseUrl = requireDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = await listMigrationFiles();
    if (files.length === 0) {
      console.warn('[db:migrate] No SQL files found in', migrationsDir);
      return;
    }

    await applyMigrations(client, files);
    console.log('[db:migrate] All migrations applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] Migration failed:', error);
  process.exit(1);
});
