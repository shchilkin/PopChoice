function cleanSignalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

export function getAvoidSignalsFromReason(reason: unknown): string[] {
  const value = cleanSignalString(reason);
  if (!value) return [];

  return Array.from(value.matchAll(/Avoid:\s*([^.]*)\./gi)).flatMap((match) =>
    (match[1] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.toLocaleLowerCase() !== 'no hard avoids'),
  );
}
