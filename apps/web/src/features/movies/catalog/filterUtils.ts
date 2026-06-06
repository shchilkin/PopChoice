import type { MovieDurationFilter, DurationBounds } from './types';

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function normalizeQuery(query: string | undefined): string | undefined {
  const trimmed = query?.trim();
  return trimmed ? trimmed : undefined;
}

export function getDurationBounds(
  duration: MovieDurationFilter | undefined,
): DurationBounds | undefined {
  if (duration === 'under-90') return { max: 89 };
  if (duration === '90-120') return { min: 90, max: 120 };
  if (duration === 'over-120') return { min: 121 };
  return undefined;
}

export function isInRange(value: number, range: DurationBounds | undefined): boolean {
  if (typeof range?.min === 'number' && value < range.min) return false;
  if (typeof range?.max === 'number' && value > range.max) return false;
  return true;
}
