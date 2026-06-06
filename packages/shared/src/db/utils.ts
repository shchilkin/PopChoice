import type { MovieRecord } from './types.js';

export function getMovieKey(name: string, year: number): string {
  return `${name}\u0000${year}`;
}

export function serializeMetadataQualityFlags(
  flags: MovieRecord['metadata_quality_flags'],
): Record<string, unknown> | string[] {
  if (!flags) return [];
  if (Array.isArray(flags)) return flags;
  return flags;
}

export function valueOrNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

export function metadataJson(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value ?? {});
}
