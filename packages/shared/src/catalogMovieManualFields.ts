import {
  getCatalogRepairMovieSnapshot,
  recordCatalogRepairAction,
} from './catalogRepairActions.js';
import { getPool } from './db.js';

import type {
  CatalogRepairActionAudit,
  CatalogRepairMovieSnapshot,
} from './catalogRepairActions.js';

export type CatalogMovieManualFields = {
  ageRating?: string | null;
  localizedName?: string | null;
  posterUrl?: string | null;
  runtime?: number | null;
  tmdbId?: number;
};

export type CatalogMovieManualFieldKey = keyof CatalogMovieManualFields;

export type ApplyCatalogMovieManualFieldsInput = {
  actor: string;
  fields: CatalogMovieManualFields;
  movieId: string | number;
  note?: string;
};

export type ApplyCatalogMovieManualFieldsResult = {
  audit: CatalogRepairActionAudit;
  movie: CatalogRepairMovieSnapshot;
  updatedFields: CatalogMovieManualFieldKey[];
};

export function catalogMovieManualFieldsError(
  message: string,
  statusCode = 400,
): Error & { publicMessage: string; statusCode: number } {
  const error = new Error(message) as Error & { publicMessage: string; statusCode: number };
  error.publicMessage = message;
  error.statusCode = statusCode;
  return error;
}

function getProvidedManualFieldKeys(
  fields: CatalogMovieManualFields,
): CatalogMovieManualFieldKey[] {
  return (Object.keys(fields) as CatalogMovieManualFieldKey[]).filter(
    (key) => fields[key] !== undefined,
  );
}

async function assertTMDBIdIsAvailable(movieId: string | number, tmdbId: number): Promise<void> {
  const result = await getPool().query<{ id: string; name: string; year: number }>(
    `SELECT id::text, name, year
       FROM movies
      WHERE tmdb_id = $1
        AND id <> $2
      LIMIT 1`,
    [tmdbId, movieId],
  );
  const duplicate = result.rows[0];
  if (!duplicate) return;

  throw catalogMovieManualFieldsError(
    `TMDB id ${tmdbId} is already assigned to ${duplicate.name} (${duplicate.year}) [movie ${duplicate.id}].`,
    409,
  );
}

function addAssignment(input: {
  assignments: string[];
  column: string;
  values: unknown[];
  value: unknown;
}): void {
  input.values.push(input.value);
  input.assignments.push(`${input.column} = $${input.values.length}`);
}

async function updateMovieManualFields(input: {
  fields: CatalogMovieManualFields;
  movieId: string | number;
}): Promise<void> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  if (input.fields.tmdbId !== undefined) {
    addAssignment({ assignments, column: 'tmdb_id', values, value: input.fields.tmdbId });
    addAssignment({ assignments, column: 'tmdb_match_confidence', values, value: 1 });
    assignments.push("tmdb_match_source = 'manual'");
    assignments.push('tmdb_matched_at = now()');
  }

  if (input.fields.localizedName !== undefined) {
    addAssignment({
      assignments,
      column: 'localized_name',
      values,
      value: input.fields.localizedName,
    });
  }
  if (input.fields.posterUrl !== undefined) {
    addAssignment({ assignments, column: 'poster_url', values, value: input.fields.posterUrl });
  }
  if (input.fields.runtime !== undefined) {
    addAssignment({ assignments, column: 'duration', values, value: input.fields.runtime });
  }
  if (input.fields.ageRating !== undefined) {
    addAssignment({ assignments, column: 'age_rating', values, value: input.fields.ageRating });
  }

  if (assignments.length === 0) {
    throw catalogMovieManualFieldsError('At least one manual movie field is required.');
  }

  values.push(input.movieId);
  await getPool().query(
    `UPDATE movies SET ${assignments.join(', ')} WHERE id = $${values.length}`,
    values,
  );
}

function manualUpdateIssueKey(updatedFields: CatalogMovieManualFieldKey[]): string {
  return updatedFields.includes('tmdbId') ? 'missing_tmdb_id' : 'manual_metadata';
}

export async function applyCatalogMovieManualFields(
  input: ApplyCatalogMovieManualFieldsInput,
): Promise<ApplyCatalogMovieManualFieldsResult> {
  const updatedFields = getProvidedManualFieldKeys(input.fields);
  if (updatedFields.length === 0) {
    throw catalogMovieManualFieldsError('At least one manual movie field is required.');
  }

  const previousMovie = await getCatalogRepairMovieSnapshot(input.movieId);
  if (!previousMovie) {
    throw catalogMovieManualFieldsError(`Movie ${input.movieId} was not found.`, 404);
  }

  if (input.fields.tmdbId !== undefined) {
    await assertTMDBIdIsAvailable(input.movieId, input.fields.tmdbId);
  }

  await updateMovieManualFields({ fields: input.fields, movieId: input.movieId });

  const movie = await getCatalogRepairMovieSnapshot(input.movieId);
  if (!movie) {
    throw catalogMovieManualFieldsError(`Movie ${input.movieId} was not found after update.`, 404);
  }

  const audit = await recordCatalogRepairAction({
    action: 'manual_update',
    actor: input.actor,
    issueKey: manualUpdateIssueKey(updatedFields),
    note: input.note,
    previousState: { movie: previousMovie },
    result: { fields: input.fields, movie },
    targetId: input.movieId,
    targetType: 'movie',
  });

  return { audit, movie, updatedFields };
}
