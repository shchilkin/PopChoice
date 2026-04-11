#!/usr/bin/env tsx
/**
 * Similarity threshold calibration tool for PopChoice hybrid search.
 *
 * Embeds a set of representative queries, runs them against the live database,
 * and prints ranked results with cosine similarity scores. Use the output to
 * decide whether SIMILARITY_THRESHOLD in route.ts needs adjustment.
 *
 * Usage:
 *   npm run calibrate-similarity
 *
 * Environment Variables:
 *   OPENAI_API_KEY   Required — used to embed queries
 *   DATABASE_URL     Required — PostgreSQL connection string
 */

import { openAIClient } from '../src/clients/openaiClient';
import { createPgDbClient } from '../src/clients/pgClient';

// ---------------------------------------------------------------------------
// Built-in calibration queries — cover diverse genres and era preferences.
// Edit this list to reflect what real users actually submit.
// ---------------------------------------------------------------------------
const QUERIES = [
  {
    label: 'Action / direct title',
    text: 'Favorite movie: The Matrix. Era: new. Tone: exciting. Mood: Action',
  },
  {
    label: 'Sci-Fi / direct title',
    text: 'Favorite movie: Interstellar. Era: new. Tone: serious. Mood: Sci-Fi',
  },
  {
    label: 'Thriller / direct title',
    text: 'Favorite movie: The Dark Knight. Era: new. Tone: dark. Mood: Thriller',
  },
  {
    label: 'Drama / genre match only',
    text: 'Era: classic. Tone: emotional. Mood: Drama. Genre: Drama',
  },
  {
    label: 'Comedy / loose match',
    text: 'Era: new. Tone: light. Mood: something funny and feel-good. Genre: Comedy',
  },
];

const MATCH_COUNT = 5;

// ---------------------------------------------------------------------------

function printSeparator() {
  console.log('─'.repeat(62));
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await openAIClient.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return res.data[0].embedding;
}

async function main() {
  // Validate env
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing required environment variable: OPENAI_API_KEY');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('❌ Missing required environment variable: DATABASE_URL');
    process.exit(1);
  }

  const db = createPgDbClient();

  console.log('\n🎬 PopChoice — Similarity Threshold Calibration');
  printSeparator();
  console.log(`Model : text-embedding-3-large`);
  console.log(`Top-N : ${MATCH_COUNT} results per query`);
  console.log(`Queries: ${QUERIES.length}`);
  printSeparator();

  const bestScores: number[] = [];

  for (const query of QUERIES) {
    console.log(`\nQuery: ${query.label}`);
    console.log(`  "${query.text}"`);

    let embedding: number[];
    try {
      embedding = await embedQuery(query.text);
    } catch (err) {
      console.error(`  ❌ Embedding failed: ${(err as Error).message}`);
      continue;
    }

    const { data, error } = await db.rpc('match_movies', {
      query_embedding: embedding,
      match_threshold: 0.1,
      match_count: MATCH_COUNT,
    });

    if (error || !data) {
      console.error(`  ❌ DB query failed: ${error?.message ?? 'no data'}`);
      continue;
    }

    if (data.length === 0) {
      console.log('  (no results above match_threshold = 0.1)');
      continue;
    }

    const rows = data as { name: string; year?: number | null; similarity: number }[];
    const best = rows[0].similarity;
    bestScores.push(best);

    rows.forEach((row, i) => {
      const marker = i === 0 ? ' ← ceiling' : '';
      const year = row.year ? ` (${row.year})` : '';
      console.log(`  ${row.similarity.toFixed(4)}  ${row.name}${year}${marker}`);
    });
  }

  // Summary
  if (bestScores.length > 0) {
    const ceiling = Math.max(...bestScores);
    const suggested = Math.round(((ceiling * 2) / 3) * 100) / 100;

    printSeparator();
    console.log('\nSummary');
    console.log(`  Highest observed score : ${ceiling.toFixed(4)}`);
    console.log(`  Suggested threshold    : ~${suggested.toFixed(2)}  (≈ 2/3 of ceiling)`);
    console.log(`  Current threshold      : 0.40  (SIMILARITY_THRESHOLD in route.ts)`);

    if (Math.abs(suggested - 0.4) >= 0.05) {
      console.log(`\n⚠️  Suggested threshold differs from current by ≥ 0.05.`);
      console.log(
        `   Consider updating SIMILARITY_THRESHOLD in src/app/api/movie-recommendation/route.ts`,
      );
      console.log(`   and the calibration table in docs/SERVICES.md.`);
    } else {
      console.log(`\n✅ Current threshold looks appropriate.`);
    }
  }

  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
