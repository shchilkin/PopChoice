import { applyCatalogMovieManualFields } from '@pop-choice/shared';

import { logBackofficeAction } from './backofficeActionLog';
import {
  backofficeActionError,
  ensureBackofficeReady,
  parseBackofficeReturnPath,
  parseOperatorActor,
} from './backofficeRuntime';

import type {
  ApplyCatalogMovieManualFieldsResult,
  CatalogMovieManualFields,
} from '@pop-choice/shared';

export type CatalogMovieManualFormActionResult = ApplyCatalogMovieManualFieldsResult & {
  redirectTo: string;
};

function getOptionalString(
  value: FormDataEntryValue | null,
  fieldName: string,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw backofficeActionError(`${fieldName} must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function parsePositiveInteger(
  value: FormDataEntryValue | null,
  fieldName: string,
): number | undefined {
  const raw = getOptionalString(value, fieldName);
  if (raw === undefined) return undefined;

  if (!/^\d+$/.test(raw)) {
    throw backofficeActionError(`${fieldName} must be a positive integer.`);
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw backofficeActionError(`${fieldName} must be a positive safe integer.`);
  }

  return parsed;
}

function parseBoundedText(
  value: FormDataEntryValue | null,
  fieldName: string,
  maxLength: number,
): string | undefined {
  const raw = getOptionalString(value, fieldName);
  if (raw === undefined) return undefined;
  if (raw.length > maxLength) {
    throw backofficeActionError(`${fieldName} must be ${maxLength} characters or less.`);
  }
  return raw;
}

function parsePosterUrl(value: FormDataEntryValue | null): string | undefined {
  const raw = parseBoundedText(value, 'Poster URL', 500);
  if (raw === undefined) return undefined;

  if (raw.startsWith('/')) return raw;

  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return raw;
  } catch {
    // Fall through to the public validation error below.
  }

  throw backofficeActionError('Poster URL must be an absolute http(s) URL or TMDB image path.');
}

export function parseCatalogMovieManualFields(formData: FormData): CatalogMovieManualFields {
  const fields: CatalogMovieManualFields = {};
  const tmdbId = parsePositiveInteger(formData.get('tmdb_id'), 'TMDB id');
  const runtime = parsePositiveInteger(formData.get('runtime'), 'Runtime');
  const localizedName = parseBoundedText(formData.get('localized_name'), 'Localized name', 240);
  const posterUrl = parsePosterUrl(formData.get('poster_url'));
  const ageRating = parseBoundedText(formData.get('age_rating'), 'Age rating', 32);

  if (tmdbId !== undefined) fields.tmdbId = tmdbId;
  if (localizedName !== undefined) fields.localizedName = localizedName;
  if (posterUrl !== undefined) fields.posterUrl = posterUrl;
  if (runtime !== undefined) fields.runtime = runtime;
  if (ageRating !== undefined) fields.ageRating = ageRating;

  if (Object.keys(fields).length === 0) {
    throw backofficeActionError('Enter at least one manual field before applying.');
  }

  return fields;
}

export function catalogMovieDetailPath(movieId: string | number): string {
  return `/movies/${encodeURIComponent(String(movieId))}`;
}

export async function applyCatalogMovieManualFormAction(
  movieId: string,
  formData: FormData,
  headers: Headers,
): Promise<CatalogMovieManualFormActionResult> {
  await ensureBackofficeReady();
  const startedAt = Date.now();
  const actor = parseOperatorActor(headers);
  const fields = parseCatalogMovieManualFields(formData);
  const note = getOptionalString(formData.get('note'), 'Note');
  const returnToValue = formData.get('return_to');
  const returnTo =
    returnToValue === null
      ? catalogMovieDetailPath(movieId)
      : parseBackofficeReturnPath(returnToValue);

  const result = await applyCatalogMovieManualFields({
    actor,
    fields,
    movieId,
    note,
  });

  logBackofficeAction({
    action: 'manual_update',
    actor,
    durationMs: Date.now() - startedAt,
    mode: result.updatedFields.join(','),
    resultStatus: 'updated',
    targetId: movieId,
    targetType: 'movie',
  });

  return { ...result, redirectTo: returnTo };
}
