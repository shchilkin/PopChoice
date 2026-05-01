export function parsePositiveInt(
  value: string | undefined,
  defaultValue: number,
  name: string,
): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0)
    throw new Error(`${name} must be a positive integer, got: ${JSON.stringify(value)}`);
  return num;
}

export function parseNonNegativeInt(
  value: string | undefined,
  defaultValue: number,
  name: string,
): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0)
    throw new Error(`${name} must be a non-negative integer, got: ${JSON.stringify(value)}`);
  return num;
}

export function parsePositiveFloat(
  value: string | undefined,
  defaultValue: number,
  name: string,
): number {
  if (value === undefined || value === '') return defaultValue;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0)
    throw new Error(`${name} must be a positive number, got: ${JSON.stringify(value)}`);
  return num;
}

export function requireEnvVars(keys: string[]): Record<string, string> {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0)
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  return Object.fromEntries(keys.map((k) => [k, process.env[k] as string]));
}
