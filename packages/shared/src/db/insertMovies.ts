import { logger } from '../logger.js';

import { getPool } from './pool.js';
import { serializeMetadataQualityFlags, valueOrNull } from './utils.js';

import type { InsertedMovieRecord, MovieRecord } from './types.js';

function normalizeInsertedMovieRows(rows: InsertedMovieRecord[]): InsertedMovieRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    tmdb_id: row.tmdb_id === null ? null : Number(row.tmdb_id),
  }));
}

function buildMovieBatchInsertParams(batch: MovieRecord[]): unknown[] {
  return [
    batch.map((m) => m.name),
    batch.map((m) => m.year),
    batch.map((m) => m.age_rating),
    batch.map((m) => m.description),
    batch.map((m) => m.duration),
    batch.map((m) => m.score_rating),
    batch.map((m) => valueOrNull(m.original_title)),
    batch.map((m) => valueOrNull(m.original_language)),
    batch.map((m) => valueOrNull(m.release_date)),
    batch.map((m) => valueOrNull(m.vote_count)),
    batch.map((m) => valueOrNull(m.popularity)),
    batch.map((m) => m.metadata_quality_score ?? 0),
    batch.map((m) => JSON.stringify(serializeMetadataQualityFlags(m.metadata_quality_flags))),
    batch.map((m) => valueOrNull(m.poster_url)),
    batch.map((m) => valueOrNull(m.localized_name)),
    batch.map((m) => valueOrNull(m.tmdb_id)),
    batch.map((m) => valueOrNull(m.tmdb_match_confidence)),
    batch.map((m) => valueOrNull(m.tmdb_match_source)),
    batch.map((m) => JSON.stringify(m.embedding)),
  ];
}

function buildSingleMovieInsertParams(movie: MovieRecord): unknown[] {
  return [
    movie.name,
    movie.year,
    movie.age_rating,
    movie.description,
    movie.duration,
    movie.score_rating,
    valueOrNull(movie.original_title),
    valueOrNull(movie.original_language),
    valueOrNull(movie.release_date),
    valueOrNull(movie.vote_count),
    valueOrNull(movie.popularity),
    movie.metadata_quality_score ?? 0,
    JSON.stringify(serializeMetadataQualityFlags(movie.metadata_quality_flags)),
    valueOrNull(movie.poster_url),
    valueOrNull(movie.localized_name),
    valueOrNull(movie.tmdb_id),
    valueOrNull(movie.tmdb_match_confidence),
    valueOrNull(movie.tmdb_match_source),
    JSON.stringify(movie.embedding),
  ];
}

async function insertMovieBatch(batch: MovieRecord[]): Promise<{
  inserted: number;
  insertedMovies: InsertedMovieRecord[];
}> {
  const result = await getPool().query<InsertedMovieRecord>(
    `INSERT INTO movies (
       name, year, age_rating, description, duration, score_rating,
       original_title, original_language, release_date, vote_count, popularity,
       metadata_quality_score, metadata_quality_flags, poster_url, localized_name, tmdb_id,
       tmdb_match_confidence, tmdb_match_source, tmdb_matched_at, embedding
     )
     SELECT n, y, ar, d, du, sr, original, lang, release_dt, votes, pop,
            quality_score, quality_flags::jsonb, poster, localized, tid, conf, src,
            CASE WHEN tid IS NULL THEN NULL ELSE now() END, e::vector
     FROM unnest(
       $1::text[], $2::int[], $3::text[], $4::text[], $5::int[], $6::float8[],
       $7::text[], $8::text[], $9::date[], $10::int[], $11::float8[], $12::int[],
       $13::text[], $14::text[], $15::text[], $16::bigint[], $17::float8[],
       $18::text[], $19::text[]
     ) AS t(n, y, ar, d, du, sr, original, lang, release_dt, votes, pop, quality_score,
            quality_flags, poster, localized, tid, conf, src, e)
     ON CONFLICT (name, year) DO NOTHING
     RETURNING id::text, tmdb_id`,
    buildMovieBatchInsertParams(batch),
  );

  return {
    inserted: result.rowCount ?? 0,
    insertedMovies: normalizeInsertedMovieRows(result.rows),
  };
}

async function insertSingleMovie(movie: MovieRecord): Promise<InsertedMovieRecord[]> {
  const result = await getPool().query<InsertedMovieRecord>(
    `INSERT INTO movies (
       name, year, age_rating, description, duration, score_rating,
       original_title, original_language, release_date, vote_count, popularity,
       metadata_quality_score, metadata_quality_flags, poster_url, localized_name, tmdb_id,
       tmdb_match_confidence, tmdb_match_source, tmdb_matched_at, embedding
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7::text, $8::text, $9::date, $10::int, $11::float8,
       $12::int, $13::jsonb, $14::text, $15::text, $16::bigint,
       $17::float8, $18::text, CASE WHEN $16 IS NULL THEN NULL ELSE now() END,
       $19::vector
     )
     ON CONFLICT (name, year) DO NOTHING
     RETURNING id::text, tmdb_id`,
    buildSingleMovieInsertParams(movie),
  );

  return normalizeInsertedMovieRows(result.rows);
}

async function insertMovieBatchIndividually(batch: MovieRecord[]): Promise<{
  success: number;
  errors: number;
  insertedMovies: InsertedMovieRecord[];
}> {
  let success = 0;
  let errors = 0;
  const insertedMovies: InsertedMovieRecord[] = [];

  for (const movie of batch) {
    try {
      const insertedRows = await insertSingleMovie(movie);
      success += insertedRows.length;
      insertedMovies.push(...insertedRows);
    } catch (singleErr) {
      errors++;
      logger.warn('Failed to insert movie', {
        name: movie.name,
        year: movie.year,
        error: singleErr instanceof Error ? singleErr.message : String(singleErr),
      });
    }
  }

  return { success, errors, insertedMovies };
}

export async function insertMovies(
  movies: MovieRecord[],
  batchSize: number = 50,
): Promise<{ success: number; errors: number; insertedMovies: InsertedMovieRecord[] }> {
  let success = 0;
  let errors = 0;
  const insertedMovies: InsertedMovieRecord[] = [];

  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      const result = await insertMovieBatch(batch);
      success += result.inserted;
      insertedMovies.push(...result.insertedMovies);
      logger.info('Batch inserted', {
        batch: batchNum,
        inserted: result.inserted,
        total: movies.length,
      });
    } catch (batchErr) {
      logger.warn('Batch insert failed, falling back to individual inserts', {
        batch: batchNum,
        error: batchErr instanceof Error ? batchErr.message : String(batchErr),
      });
      const fallback = await insertMovieBatchIndividually(batch);
      success += fallback.success;
      errors += fallback.errors;
      insertedMovies.push(...fallback.insertedMovies);
    }
  }

  return { success, errors, insertedMovies };
}
