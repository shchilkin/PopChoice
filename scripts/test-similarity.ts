#!/usr/bin/env tsx

import OpenAI from 'openai';
import pg from 'pg';

import logger from '@/lib/logger';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const SIMILARITY_THRESHOLD = 0.7;

const queries = [
  {
    label: 'Matrix (action/exciting)',
    input: 'Favorite movie: The Matrix. Era: new. Tone: exciting. Mood: Action',
  },
  {
    label: 'Interstellar-like (sci-fi/deep)',
    input: 'Favorite movie: Interstellar. Era: new. Tone: serious. Mood: Sci-Fi',
  },
  {
    label: 'Dark Knight (crime/thriller)',
    input: 'Favorite movie: The Dark Knight. Era: new. Tone: dark. Mood: Thriller',
  },
];

for (const { label, input } of queries) {
  const resp = await client.embeddings.create({ model: 'text-embedding-3-large', input });
  const emb = resp.data[0].embedding;

  const { rows } = await pool.query<{ name: string; year: number; similarity: number }>(
    `SELECT name, year, round((1 - (embedding <=> $1::vector))::numeric, 4) AS similarity
     FROM movies
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT 10`,
    [`[${emb.join(',')}]`],
  );

  const highQuality = rows.filter((r) => Number(r.similarity) >= SIMILARITY_THRESHOLD);
  logger.info(`\n=== ${label} ===`);
  logger.info(`    High-quality (>=${SIMILARITY_THRESHOLD}): ${highQuality.length}/10`);
  rows.forEach((r) => {
    const sim = Number(r.similarity);
    const marker = sim >= SIMILARITY_THRESHOLD ? '✓' : '✗';
    logger.info(`  ${marker} ${sim.toFixed(4)}  ${r.name} (${r.year})`);
  });
}

await pool.end();
