export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...values: ClassValue[]): string {
  return values.flatMap(classNamesForValue).filter(Boolean).join(' ');
}

function classNamesForValue(value: ClassValue): string[] {
  if (!value) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return [cn(...value)].filter(Boolean);

  return Object.entries(value)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}
