#!/usr/bin/env tsx
/**
 * Similarity threshold calibration tool for PopChoice hybrid search.
 *
 * Embeds a set of representative queries, runs them against the live database,
 * and prints ranked results with cosine similarity scores. Use the output to
 * decide whether the recommendation config needs adjustment.
 *
 * Usage:
 *   npm run calibrate-similarity
 *
 * Environment Variables:
 *   OPENAI_API_KEY   Required — used to embed queries
 *   DATABASE_URL     Required — PostgreSQL connection string
 */

import { getOpenAIClient } from '../src/clients/openaiClient';
import { createPgDbClient } from '../src/clients/pgClient';
import {
  LOCAL_VECTOR_MATCH_THRESHOLD,
  SIMILARITY_THRESHOLD,
} from '../src/features/recommendation/config';

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

type MatchMovieRow = {
  name: string;
  year?: number | null;
  similarity: number;
};

// ---------------------------------------------------------------------------

function printSeparator() {
  console.log('─'.repeat(62));
}

async function embedQuery(text: string): Promise<number[]> {
  const res = await getOpenAIClient().embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return res.data[0].embedding;
}

async function main() {
  validateEnvironment();

  const db = createPgDbClient();
  printCalibrationHeader();

  const bestScores = await collectBestScores(db);
  printSummary(bestScores);
  console.log('');
}

async function collectBestScores(db: ReturnType<typeof createPgDbClient>) {
  const bestScores: number[] = [];
  for (const query of QUERIES) {
    const bestScore = await runCalibrationQuery(db, query);
    appendBestScore(bestScores, bestScore);
  }

  return bestScores;
}

async function runCalibrationQuery(
  db: ReturnType<typeof createPgDbClient>,
  query: (typeof QUERIES)[number],
) {
  printQueryHeader(query);

  const embedding = await tryEmbedQuery(query.text);
  if (!embedding) {
    return null;
  }

  const rows = await findMatches(db, embedding);
  if (!rows) {
    return null;
  }

  if (rows.length === 0) {
    printNoResults();
    return null;
  }

  printRows(rows);
  return rows[0].similarity;
}

function validateEnvironment() {
  requireEnvironmentVariable('OPENAI_API_KEY');
  requireEnvironmentVariable('DATABASE_URL');
}

function requireEnvironmentVariable(name: string) {
  if (process.env[name]) {
    return;
  }

  console.error(`❌ Missing required environment variable: ${name}`);
  process.exit(1);
}

function printCalibrationHeader() {
  console.log('\n🎬 PopChoice — Similarity Threshold Calibration');
  printSeparator();
  console.log(`Model : text-embedding-3-large`);
  console.log(`Top-N : ${MATCH_COUNT} results per query`);
  console.log(`Queries: ${QUERIES.length}`);
  printSeparator();
}

function printQueryHeader(query: (typeof QUERIES)[number]) {
  console.log(`\nQuery: ${query.label}`);
  console.log(`  "${query.text}"`);
}

async function tryEmbedQuery(text: string) {
  try {
    return await embedQuery(text);
  } catch (err) {
    console.error(`  ❌ Embedding failed: ${(err as Error).message}`);
    return null;
  }
}

async function findMatches(db: ReturnType<typeof createPgDbClient>, embedding: number[]) {
  const { data, error } = await db.rpc('match_movies', {
    match_count: MATCH_COUNT,
    match_threshold: LOCAL_VECTOR_MATCH_THRESHOLD,
    query_embedding: embedding,
  });

  if (hasMatchQueryError(error, data)) {
    printMatchQueryError(error);
    return null;
  }

  return data as MatchMovieRow[];
}

function hasMatchQueryError(error: unknown, data: unknown) {
  return Boolean(error) || !data;
}

function printMatchQueryError(error: { message?: string } | null) {
  console.error(`  ❌ DB query failed: ${getMatchQueryErrorMessage(error)}`);
}

function getMatchQueryErrorMessage(error: { message?: string } | null) {
  return error?.message ?? 'no data';
}

function printNoResults() {
  console.log(`  (no results above match_threshold = ${LOCAL_VECTOR_MATCH_THRESHOLD})`);
}

function printRows(rows: MatchMovieRow[]) {
  rows.forEach((row, index) => {
    console.log(formatRow(row, index));
  });
}

function formatRow(row: MatchMovieRow, index: number) {
  const marker = index === 0 ? ' ← ceiling' : '';
  const year = row.year ? ` (${row.year})` : '';
  return `  ${row.similarity.toFixed(4)}  ${row.name}${year}${marker}`;
}

function appendBestScore(bestScores: number[], bestScore: number | null) {
  if (bestScore !== null) {
    bestScores.push(bestScore);
  }
}

function printSummary(bestScores: number[]) {
  if (bestScores.length === 0) {
    return;
  }

  const threshold = getSuggestedThreshold(bestScores);

  printSeparator();
  console.log('\nSummary');
  console.log(`  Highest observed score : ${threshold.ceiling.toFixed(4)}`);
  console.log(`  Suggested threshold    : ~${threshold.suggested.toFixed(2)}  (≈ 2/3 of ceiling)`);
  console.log(
    `  Current threshold      : ${SIMILARITY_THRESHOLD.toFixed(2)}  (SIMILARITY_THRESHOLD in src/features/recommendation/config.ts)`,
  );
  printThresholdAdvice(threshold.suggested);
}

function getSuggestedThreshold(bestScores: number[]) {
  const ceiling = Math.max(...bestScores);
  const suggested = Math.round(((ceiling * 2) / 3) * 100) / 100;

  return { ceiling, suggested };
}

function printThresholdAdvice(suggested: number) {
  if (Math.abs(suggested - SIMILARITY_THRESHOLD) < 0.05) {
    console.log(`\n✅ Current threshold looks appropriate.`);
    return;
  }

  console.log(`\n⚠️  Suggested threshold differs from current by ≥ 0.05.`);
  console.log(`   Consider updating src/features/recommendation/config.ts`);
  console.log(`   and the calibration table in docs/SERVICES.md.`);
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
