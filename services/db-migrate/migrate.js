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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[db:migrate] DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      console.warn('[db:migrate] No SQL files found in', migrationsDir);
      return;
    }

    await client.query('BEGIN');
    try {
      for (const fileName of files) {
        const filePath = path.join(migrationsDir, fileName);
        const sql = await readFile(filePath, 'utf8');
        console.log(`[db:migrate] Applying ${fileName}`);
        await client.query(sql);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    console.log('[db:migrate] All migrations applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] Migration failed:', error);
  process.exit(1);
});
