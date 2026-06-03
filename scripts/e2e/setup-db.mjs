import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

export const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://popchoice_e2e@127.0.0.1:55432/popchoice_e2e';

const skipDocker = process.env.E2E_SKIP_DOCKER === '1';
const composeCommand = ['compose', '-p', 'popchoice-e2e', '-f', 'docker-compose.e2e.yml'];

async function main() {
  if (!skipDocker) {
    await run('docker', [...composeCommand, 'down', '-v', '--remove-orphans']);
    await run('docker', [...composeCommand, 'up', '-d', '--wait']);
  }

  await run('node', ['apps/web/scripts/migrate-db.js'], {
    DATABASE_URL: e2eDatabaseUrl,
    DB_MIGRATION_CONNECT_ATTEMPTS: '30',
    DB_MIGRATION_CONNECT_DELAY_MS: '1000',
  });

  await seedDatabase(e2eDatabaseUrl);
}

async function seedDatabase(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE
        recommendation_feedback,
        user_movie_interactions,
        recommendation_movies,
        recommendations,
        tmdb_match_reviews,
        movie_keywords,
        movie_genres,
        movie_people,
        catalog_keywords,
        catalog_genres,
        catalog_people,
        movies,
        users
      RESTART IDENTITY CASCADE
    `);

    await client.query(
      `
        INSERT INTO movies
          (name, age_rating, description, duration, score_rating, year, tmdb_id, poster_url, localized_name)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9),
          ($10, $11, $12, $13, $14, $15, $16, $17, $18),
          ($19, $20, $21, $22, $23, $24, $25, $26, $27),
          ($28, $29, $30, $31, $32, $33, $34, $35, $36),
          ($37, $38, $39, $40, $41, $42, $43, $44, $45),
          ($46, $47, $48, $49, $50, $51, $52, $53, $54)
      `,
      [
        'PopChoice E2E Space Opera',
        'PG-13',
        'A deterministic fixture for catalog filtering and e2e smoke tests.',
        142,
        8.7,
        2024,
        900001,
        null,
        'PopChoice E2E Space Opera',
        'PopChoice E2E Short Comedy',
        'PG',
        'A compact comedy fixture with a lower runtime.',
        84,
        7.4,
        2021,
        900002,
        null,
        'PopChoice E2E Short Comedy',
        'PopChoice E2E Classic Drama',
        'R',
        'A mature drama fixture for rating filters.',
        126,
        9.1,
        1998,
        900003,
        null,
        'PopChoice E2E Classic Drama',
        'PopChoice E2E Family Adventure',
        'G',
        'A family-friendly fixture for broad catalog smoke tests.',
        101,
        8.1,
        2018,
        900004,
        null,
        'PopChoice E2E Family Adventure',
        'PopChoice E2E Cozy Mystery',
        'PG',
        'A cozy mystery fixture for recommendation eval candidate availability.',
        108,
        7.8,
        2021,
        900005,
        null,
        'PopChoice E2E Cozy Mystery',
        'PopChoice E2E Ensemble Comedy',
        'PG-13',
        'A playful ensemble fixture for mixed group recommendation evals.',
        115,
        8.3,
        2020,
        900006,
        null,
        'PopChoice E2E Ensemble Comedy',
      ],
    );

    await client.query(
      `
        INSERT INTO catalog_people (tmdb_id, name)
        VALUES
          ($1, $2),
          ($3, $4)
      `,
      [910001, 'Astra Fixture', 910002, 'Moonlit Director'],
    );

    await client.query(
      `
        INSERT INTO catalog_genres (tmdb_id, name)
        VALUES
          ($1, $2),
          ($3, $4)
      `,
      [920001, 'Nebula Noir', 920002, 'Fixture Comedy'],
    );

    await client.query(`
      INSERT INTO movie_people
        (movie_id, person_id, role, character_name, billing_order)
      SELECT 1, id, 'cast', 'Captain Test', 0
      FROM catalog_people
      WHERE name = 'Astra Fixture'
    `);

    await client.query(`
      INSERT INTO movie_people
        (movie_id, person_id, role, job, department)
      SELECT 1, id, 'director', 'Director', 'Directing'
      FROM catalog_people
      WHERE name = 'Moonlit Director'
    `);

    await client.query(`
      INSERT INTO movie_genres (movie_id, genre_id, source)
      SELECT 1, id, 'manual'
      FROM catalog_genres
      WHERE name = 'Nebula Noir'
    `);

    await client.query(`
      INSERT INTO movie_genres (movie_id, genre_id, source)
      SELECT 2, id, 'manual'
      FROM catalog_genres
      WHERE name = 'Fixture Comedy'
    `);

    await client.query(
      `
        INSERT INTO tmdb_match_reviews
          (movie_id, movie_name, movie_year, reason, status, candidates, notes)
        VALUES
          (
            1,
            'PopChoice E2E Space Opera',
            2024,
            'ambiguous_match',
            'open',
            $1::jsonb,
            'E2E fixture for the backoffice TMDB review decision flow.'
          )
      `,
      [
        JSON.stringify([
          {
            id: 990001,
            title: 'PopChoice E2E Space Opera Definitive Match',
            originalTitle: 'PopChoice E2E Space Opera Definitive Match',
            releaseYear: 2024,
            confidence: 0.96,
          },
          {
            id: 990002,
            title: 'PopChoice E2E Space Opera Alternate',
            originalTitle: 'PopChoice E2E Space Opera Alternate',
            releaseYear: 2023,
            confidence: 0.72,
          },
        ]),
      ],
    );

    await client.query('COMMIT');
    console.log('[e2e:db] Seeded deterministic movie fixtures.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error('[e2e:db] Failed to prepare isolated e2e database.');
  console.error(error);
  process.exit(1);
});
