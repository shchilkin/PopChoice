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

async function main() {
  const databaseUrl = (await resolveDatabaseUrl()) ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('[db:migrate] DATABASE_URL is not set, skipping migrations.');
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort((left, right) => left.localeCompare(right));

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

    console.log('[db:migrate] Migrations complete.');
  } finally {
    await client.end();
  }
}

async function resolveDatabaseUrl() {
  for (const envFile of envFiles) {
    try {
      const content = await readFile(envFile, 'utf8');
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match?.[1]) {
        return match[1].trim();
      }
    } catch {
      // Ignore missing env files and continue to the next fallback.
    }
  }

  return null;
}

main().catch((error) => {
  console.error('[db:migrate] Failed to apply migrations.');
  console.error(error);
  process.exit(1);
});
