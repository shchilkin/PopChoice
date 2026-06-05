export type QuizPersonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is QuizPersonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter((item): item is string => item !== null);
}

export function cleanStringValues(values: unknown[]): string[] {
  return values.map(cleanString).filter((item): item is string => item !== null);
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

export function quizPeople(quizData: unknown): unknown[] {
  return Array.isArray(quizData) ? quizData : [quizData];
}

export function groupPeople(quizData: unknown): QuizPersonRecord[] | null {
  if (!Array.isArray(quizData) || quizData.length < 2) return null;

  const people = quizData.filter(isRecord);
  return people.length >= 2 ? people : null;
}

export function hasFavoriteActor(person: unknown): boolean {
  return isRecord(person) && cleanString(person.favoriteActor) !== null;
}

export function intersectMoodPreferences(people: QuizPersonRecord[]): string[] {
  const moodGroups = people.map((person) => cleanStringArray(person.moodPreference));
  if (moodGroups.some((moods) => moods.length === 0)) return [];

  const [firstGroup = []] = moodGroups;
  return firstGroup.filter((mood) =>
    moodGroups.every((moods) =>
      moods.some((candidate) => candidate.toLocaleLowerCase() === mood.toLocaleLowerCase()),
    ),
  );
}
