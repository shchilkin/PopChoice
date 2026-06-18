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
const tmdbPosterBase = 'https://image.tmdb.org/t/p/w500';

const movieFixtures = [
  {
    name: 'The Matrix',
    ageRating: 'R',
    description:
      'A hacker discovers that everyday reality is a simulated prison and joins a rebellion against the machines.',
    duration: 136,
    scoreRating: 8.2,
    year: 1999,
    tmdbId: 603,
    posterUrl: `${tmdbPosterBase}/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg`,
    localizedName: 'The Matrix',
  },
  {
    name: 'Paddington 2',
    ageRating: 'PG',
    description:
      'Paddington searches for the perfect birthday gift and gets pulled into a warm, comic adventure.',
    duration: 104,
    scoreRating: 7.8,
    year: 2017,
    tmdbId: 346648,
    posterUrl: `${tmdbPosterBase}/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg`,
    localizedName: 'Paddington 2',
  },
  {
    name: 'Parasite',
    ageRating: 'R',
    description:
      'A poor family schemes its way into a wealthy household in a sharp, escalating social thriller.',
    duration: 132,
    scoreRating: 8.5,
    year: 2019,
    tmdbId: 496243,
    posterUrl: `${tmdbPosterBase}/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg`,
    localizedName: 'Parasite',
  },
  {
    name: 'Spirited Away',
    ageRating: 'PG',
    description:
      'A young girl enters a spirit world and must find courage, kindness, and a way home.',
    duration: 125,
    scoreRating: 8.6,
    year: 2001,
    tmdbId: 129,
    posterUrl: `${tmdbPosterBase}/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg`,
    localizedName: 'Spirited Away',
  },
  {
    name: 'Knives Out',
    ageRating: 'PG-13',
    description:
      'A detective investigates a family gathering after a wealthy crime novelist dies unexpectedly.',
    duration: 131,
    scoreRating: 7.9,
    year: 2019,
    tmdbId: 546554,
    posterUrl: `${tmdbPosterBase}/pThyQovXQrw2m0s9x82twj48Jq4.jpg`,
    localizedName: 'Knives Out',
  },
  {
    name: 'The Grand Budapest Hotel',
    ageRating: 'R',
    description:
      'A concierge and lobby boy race through a stylish caper about loyalty, art, and a vanished world.',
    duration: 100,
    scoreRating: 8.1,
    year: 2014,
    tmdbId: 120467,
    posterUrl: `${tmdbPosterBase}/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg`,
    localizedName: 'The Grand Budapest Hotel',
  },
  {
    name: 'Arrival',
    ageRating: 'PG-13',
    description:
      'A linguist works to understand alien visitors before fear pushes the world toward conflict.',
    duration: 116,
    scoreRating: 7.6,
    year: 2016,
    tmdbId: 329865,
    posterUrl: `${tmdbPosterBase}/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg`,
    localizedName: 'Arrival',
  },
];

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
          ${movieFixtures
            .map((_, index) => {
              const offset = index * 9;
              return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
            })
            .join(',\n          ')}
      `,
      movieFixtures.flatMap((movie) => [
        movie.name,
        movie.ageRating,
        movie.description,
        movie.duration,
        movie.scoreRating,
        movie.year,
        movie.tmdbId,
        movie.posterUrl,
        movie.localizedName,
      ]),
    );

    await client.query(
      `
        INSERT INTO catalog_people (tmdb_id, name)
        VALUES
          ($1, $2),
          ($3, $4)
      `,
      [6384, 'Keanu Reeves', 9339, 'Lana Wachowski'],
    );

    await client.query(
      `
        INSERT INTO catalog_genres (tmdb_id, name)
        VALUES
          ($1, $2),
          ($3, $4)
      `,
      [878, 'Science Fiction', 35, 'Comedy'],
    );

    await client.query(`
      INSERT INTO movie_people
        (movie_id, person_id, role, character_name, billing_order)
      SELECT 1, id, 'cast', 'Captain Test', 0
      FROM catalog_people
      WHERE name = 'Keanu Reeves'
    `);

    await client.query(`
      INSERT INTO movie_people
        (movie_id, person_id, role, job, department)
      SELECT 1, id, 'director', 'Director', 'Directing'
      FROM catalog_people
      WHERE name = 'Lana Wachowski'
    `);

    await client.query(`
      INSERT INTO movie_genres (movie_id, genre_id, source)
      SELECT 1, id, 'manual'
      FROM catalog_genres
      WHERE name = 'Science Fiction'
    `);

    await client.query(`
      INSERT INTO movie_genres (movie_id, genre_id, source)
      SELECT 2, id, 'manual'
      FROM catalog_genres
      WHERE name = 'Comedy'
    `);

    await client.query(
      `
        INSERT INTO tmdb_match_reviews
          (movie_id, movie_name, movie_year, reason, status, candidates, notes)
        VALUES
          (
            1,
            'The Matrix',
            1999,
            'ambiguous_match',
            'open',
            $1::jsonb,
            'E2E fixture for the backoffice TMDB review decision flow using real movie metadata.'
          )
      `,
      [
        JSON.stringify([
          {
            id: 603,
            title: 'The Matrix',
            originalTitle: 'The Matrix',
            releaseYear: 1999,
            confidence: 0.96,
          },
          {
            id: 604,
            title: 'The Matrix Reloaded',
            originalTitle: 'The Matrix Reloaded',
            releaseYear: 2003,
            confidence: 0.72,
          },
        ]),
      ],
    );

    await client.query('COMMIT');
    console.log('[e2e:db] Seeded deterministic real-movie fixtures.');
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
